import { getChatGPTUser } from "../../chatgpt-auth";
import { isAdmin, marketDatabase } from "../../admin-access";
export const dynamic = "force-dynamic";
const kinds = ["account", "task", "profile", "review", "audit"];
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Content-Language": "ru" } });
type Row = {id: string; kind: string; owner: string; parent: string|null; data: string; created: string; restricted?: number};

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return reply({error: "Войдите в аккаунт администратора."}, 401);
  if (!isAdmin(user)) return reply({error: "Доступ разрешён только администратору."}, 403);
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") || "account";
    if (!kinds.includes(kind)) return reply({error: "Неизвестный раздел."}, 400);
    const page = Math.max(1, Math.min(100000, Number(url.searchParams.get("page")) || 1));
    if (!Number.isInteger(page)) return reply({error: "Неверная страница."}, 400);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
    const filter = "r.kind=? AND (?='' OR instr(lower(r.data),lower(?))>0 OR instr(r.id,?)>0)";
    const db = marketDatabase();
    const results = await db.batch([
      db.prepare(`SELECT r.*, EXISTS(SELECT 1 FROM records m WHERE m.id=CASE WHEN r.kind='account' THEN 'block:'||r.owner ELSE 'hidden:'||r.id END AND m.kind IN ('block','hidden')) AS restricted FROM records r WHERE ${filter} ORDER BY r.created DESC,r.id DESC LIMIT 30 OFFSET ?`).bind(kind,q,q,q,(page-1)*30),
      db.prepare(`SELECT count(*) AS total FROM records r WHERE ${filter}`).bind(kind,q,q,q),
      db.prepare("SELECT kind,count(*) AS total FROM records WHERE kind IN ('account','task','profile','review','block','hidden') GROUP BY kind"),
    ]);
    return reply({
      rows: (results[0].results as Row[]).map(r => ({...JSON.parse(r.data), id:r.id, kind:r.kind, owner:r.owner, created:r.created, restricted:!!r.restricted, self: r.owner===user.userId})),
      total: (results[1].results[0] as {total:number}).total,
      counts: Object.fromEntries((results[2].results as {kind:string;total:number}[]).map(r=>[r.kind,r.total])),
      page,
    });
  } catch(e) { console.error(e); return reply({error:"Не удалось загрузить данные. Попробуйте ещё раз."},503); }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if(raw.length>4000) return reply({error:"Слишком большой запрос."},413);
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({error:"Недопустимый источник запроса."},403);
  const user = await getChatGPTUser();
  if (!user) return reply({error:"Войдите в аккаунт администратора."},401);
  if (!isAdmin(user)) return reply({error:"Доступ разрешён только администратору."},403);
  try {
    let b;
    try { b=JSON.parse(raw); } catch { return reply({error:"Неверный формат запроса."},400); }
    if (!b || !["restrict","restore"].includes(b.action) || typeof b.id!=="string" || b.id.length>300 || typeof b.reason!=="string" || b.reason.trim().length<3 || b.reason.length>500) return reply({error:"Укажите запись и причину действия (3–500 символов)."},400);
    const db=marketDatabase();
    const target=await db.prepare("SELECT * FROM records WHERE id=? AND kind IN ('account','task','profile','review')").bind(b.id).first<Row>();
    if(!target) return reply({error:"Запись не найдена."},404);
    if(target.kind==='account' && target.owner===user.userId) return reply({error:"Нельзя заблокировать собственный аккаунт."},400);
    const kind=target.kind==='account'?'block':'hidden';
    const marker=kind+':'+(kind==='block'?target.owner:target.id);
    const now=new Date().toISOString();
    const detail={action:b.action, target:target.id, targetKind:target.kind, title:JSON.parse(target.data).title || JSON.parse(target.data).name, reason:b.reason.trim(), actor:user.email};
    // The moderation state and its audit entry always change together.
    await db.batch([
      b.action==='restrict'
        ? db.prepare("INSERT INTO records (id,kind,owner,parent,data,created) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,created=excluded.created").bind(marker,kind,user.userId,target.id,JSON.stringify({reason:detail.reason}),now)
        : db.prepare("DELETE FROM records WHERE id=? AND kind=?").bind(marker,kind),
      db.prepare("INSERT INTO records (id,kind,owner,parent,data,created) VALUES (?,'audit',?,?,?,?)").bind(crypto.randomUUID(),user.userId,target.id,JSON.stringify(detail),now),
    ]);
    return reply({ok:true});
  } catch(e) { console.error(e); return reply({error:"Не удалось сохранить действие. Попробуйте ещё раз."},503); }
}
