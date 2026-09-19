import { marketDatabase } from '../../../../admin-access';
import { mobileJson, mobileUser } from '../../../../mobile-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await mobileUser(request);
  if (!user) return mobileJson({ error: 'Войдите в аккаунт.' }, 401);
  const rows = await marketDatabase().prepare("SELECT id,data,created FROM records WHERE kind='mobile-order' AND owner=? ORDER BY created DESC LIMIT 100").bind(user.userId).all<{ id: string; data: string; created: string }>();
  return mobileJson(rows.results.map(row => ({ ...JSON.parse(row.data), id: row.id, created: row.created })));
}

export async function POST(request: Request) {
  const user = await mobileUser(request);
  if (!user) return mobileJson({ error: 'Войдите в аккаунт.' }, 401);
  try {
    const raw = await request.text();
    if (raw.length > 12000) return mobileJson({ error: 'Слишком большой запрос.' }, 413);
    const body = JSON.parse(raw);
    const limits: Record<string, number> = { title: 120, description: 4000, address: 500, scheduledAt: 80 };
    for (const [key, max] of Object.entries(limits)) {
      if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > max) return mobileJson({ error: 'Заполните название, описание, адрес и желаемое время.' }, 400);
    }
    if (typeof body.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.requestId)) return mobileJson({ error: 'Некорректный номер запроса.' }, 400);
    const id = 'mobile-order:' + user.userId + ':' + body.requestId;
    const data = { title: body.title.trim(), description: body.description.trim(), address: body.address.trim(), scheduledAt: body.scheduledAt.trim(), status: 'new', customerName: user.displayName };
    const db = marketDatabase();
    await db.prepare("INSERT INTO records(id,kind,owner,data,created) VALUES (?,'mobile-order',?,?,?) ON CONFLICT(id) DO NOTHING").bind(id, user.userId, JSON.stringify(data), new Date().toISOString()).run();
    const row = await db.prepare("SELECT data,created FROM records WHERE id=? AND owner=? AND kind='mobile-order'").bind(id, user.userId).first<{ data: string; created: string }>();
    return mobileJson({ ...JSON.parse(row!.data), id, created: row!.created }, 201);
  } catch { return mobileJson({ error: 'Не удалось сохранить заказ. Повторите попытку.' }, 400); }
}
