import { localizedJson } from "../../i18n/shared";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
export const dynamic = "force-dynamic";
type Row = {
  id: string;
  kind: string;
  owner: string;
  parent: string | null;
  data: string;
  created: string;
};
function database() {
  const db = (env as unknown as { DB: D1Database }).DB;
  if (!db) throw Error("Хранилище временно недоступно");
  return db;
}
function unpack(r: Row, uid?: string) {
  return {
    ...JSON.parse(r.data),
    id: r.id,
    kind: r.kind,
    parent: r.parent,
    created: r.created,
    mine: r.owner === uid,
  };
}
const cities = [
  "Рига",
  "Юрмала",
  "Даугавпилс",
  "Лиепая",
  "Елгава",
  "Вентспилс",
  "Резекне",
  "Валмиера",
  "Екабпилс",
  "Огре",
  "Цесис",
  "Сигулда",
  "Другой населённый пункт Латвии",
  "Удалённо · Латвия",
];
export async function GET(request: Request) {
  const reply = localizedJson(request);
  try {
    const u = await getChatGPTUser();
    const db = database();
    const uid = u?.userId || "";
    const rows = await db
      .prepare(
        "SELECT * FROM records WHERE kind IN ('profile','task','review') OR owner=? OR (kind='bid' AND parent IN (SELECT id FROM records WHERE kind='task' AND owner=?)) OR (kind='message' AND parent IN (SELECT id FROM records WHERE kind='bid' AND (owner=? OR parent IN (SELECT id FROM records WHERE kind='task' AND owner=?)))) ORDER BY created DESC",
      )
      .bind(uid, uid, uid, uid)
      .all<Row>();
    const account = rows.results.find(
      (r) => r.kind === "account" && r.owner === uid,
    );
    return reply(
      {
        user: u
          ? {
              name: account ? JSON.parse(account.data).name : u.fullName || "",
              role: account ? JSON.parse(account.data).role : null,
            }
          : null,
        records: rows.results
          .filter((r) => r.kind !== "account")
          .map((r) => unpack(r, uid)),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    console.error(e);
    return reply(
      { error: "Не удалось загрузить данные. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  const reply = localizedJson(request);
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return reply({ error: "Недопустимый источник запроса" }, { status: 403 });
    const u = await getChatGPTUser();
    if (!u)
      return reply(
        { error: "Войдите, чтобы сохранить данные." },
        { status: 401 },
      );
    const db = database();
    const raw = await request.text();
    if (raw.length > 16000)
      return reply({ error: "Слишком большой запрос" }, { status: 413 });
    const b = JSON.parse(raw) as Record<string, unknown>;
    const action = b.action;
    const value = (key: string, max = 2000) => {
      const v = b[key];
      if (typeof v !== "string" || !v.trim() || v.length > max)
        throw Error("Заполните корректно: " + key);
      return v.trim();
    };
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const account = await db
      .prepare("SELECT * FROM records WHERE id=? AND kind='account'")
      .bind("account:" + u.userId)
      .first<Row>();
    const identity = account ? JSON.parse(account.data) : null;
    const insert = async (
      kind: string,
      data: unknown,
      parent: string | null = null,
      recordId = id,
    ) =>
      db
        .prepare(
          "INSERT INTO records (id,kind,owner,parent,data,created) VALUES (?,?,?,?,?,?)",
        )
        .bind(recordId, kind, u.userId, parent, JSON.stringify(data), now)
        .run();
    if (action === "register") {
      const role = value("role", 20);
      if (!["customer", "provider"].includes(role))
        throw Error("Выберите роль");
      const data = { name: value("name", 80), role };
      await db
        .prepare(
          "INSERT INTO records (id,kind,owner,parent,data,created) VALUES (?,'account',?,NULL,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .bind("account:" + u.userId, u.userId, JSON.stringify(data), now)
        .run();
      return reply({ ok: true });
    }
    if (!identity)
      throw Error("Сначала завершите регистрацию в личном кабинете");
    if (action === "task" || action === "profile") {
      if (identity.role !== (action === "task" ? "customer" : "provider"))
        throw Error(
          action === "task"
            ? "Переключитесь на роль заказчика в кабинете"
            : "Переключитесь на роль исполнителя в кабинете",
        );
      const data: Record<string, unknown> = {
        title: value("title", 140),
        description: value("description"),
        category: value("category", 60),
        city: value("city", 80),
        price: value("price", 80),
        name: identity.name,
        status: "open",
      };
      if (!cities.includes(data.city as string))
        throw Error("Выберите населённый пункт Латвии");
      if (
        ![
          "Ремонт",
          "Уборка",
          "Обучение",
          "IT и дизайн",
          "Доставка",
          "Красота",
          "Для животных",
          "Другое",
        ].includes(data.category as string)
      )
        throw Error("Выберите категорию");
      if (action === "profile") {
        data.skills = value("skills", 500);
        const portfolio =
          typeof b.portfolio === "string" ? b.portfolio.trim() : "";
        if (portfolio) {
          if (portfolio.length > 1500)
            throw Error("Не более 1500 символов для портфолио");
          for (const link of portfolio.split("\n").filter(Boolean)) {
            const url = new URL(link);
            if (url.protocol !== "https:")
              throw Error("Портфолио: используйте ссылки https://");
          }
        }
        data.portfolio = portfolio;
        await db
          .prepare(
            "INSERT INTO records (id,kind,owner,parent,data,created) VALUES (?,'profile',?,NULL,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
          )
          .bind("profile:" + u.userId, u.userId, JSON.stringify(data), now)
          .run();
      } else await insert("task", data);
    } else if (action === "bid") {
      if (identity.role !== "provider")
        throw Error("Отклики доступны исполнителям");
      const parent = value("parent", 100);
      const task = await db
        .prepare("SELECT * FROM records WHERE id=? AND kind='task'")
        .bind(parent)
        .first<Row>();
      if (
        !task ||
        task.owner === u.userId ||
        JSON.parse(task.data).status !== "open"
      )
        throw Error("Это задание недоступно для отклика");
      const profile = await db
        .prepare("SELECT id FROM records WHERE kind='profile' AND owner=?")
        .bind(u.userId)
        .first();
      if (!profile) throw Error("Сначала заполните профиль исполнителя");
      await insert(
        "bid",
        {
          description: value("description"),
          price: value("price", 80),
          name: identity.name,
        },
        parent,
        "bid:" + parent + ":" + u.userId,
      );
    } else if (action === "choose") {
      const bid = await db
        .prepare("SELECT * FROM records WHERE id=? AND kind='bid'")
        .bind(value("id", 240))
        .first<Row>();
      if (!bid) throw Error("Отклик не найден");
      const result = await db
        .prepare(
          "UPDATE records SET data=json_set(data,'$.status','active','$.chosen',?) WHERE id=? AND owner=? AND kind='task' AND json_extract(data,'$.status')='open'",
        )
        .bind(bid.id, bid.parent, u.userId)
        .run();
      if (!result.meta.changes) throw Error("Выбор исполнителя недоступен");
    } else if (action === "complete") {
      const result = await db
        .prepare(
          "UPDATE records SET data=json_set(data,'$.status','complete') WHERE id=? AND owner=? AND kind='task' AND json_extract(data,'$.status')='active'",
        )
        .bind(value("id", 100), u.userId)
        .run();
      if (!result.meta.changes) throw Error("Завершение недоступно");
    } else if (action === "message") {
      const parent = value("parent", 240);
      const bid = await db
        .prepare("SELECT * FROM records WHERE id=? AND kind='bid'")
        .bind(parent)
        .first<Row>();
      if (!bid) throw Error("Диалог не найден");
      const task = await db
        .prepare("SELECT * FROM records WHERE id=? AND kind='task'")
        .bind(bid.parent)
        .first<Row>();
      if (!task || !(bid.owner === u.userId || task.owner === u.userId))
        return reply({ error: "Нет доступа к диалогу" }, { status: 403 });
      await insert(
        "message",
        { description: value("description"), name: identity.name },
        parent,
      );
    } else if (action === "review") {
      const task = await db
        .prepare("SELECT * FROM records WHERE id=? AND kind='task' AND owner=?")
        .bind(value("parent", 100), u.userId)
        .first<Row>();
      if (!task || JSON.parse(task.data).status !== "complete")
        throw Error("Отзыв доступен заказчику после выполнения");
      const bid = await db
        .prepare("SELECT * FROM records WHERE id=? AND kind='bid' AND parent=?")
        .bind(JSON.parse(task.data).chosen, task.id)
        .first<Row>();
      if (!bid) throw Error("Исполнитель не найден");
      const rating = Number(b.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5)
        throw Error("Оценка от 1 до 5");
      await insert(
        "review",
        {
          name: identity.name,
          description: value("description"),
          rating,
          profile: "profile:" + bid.owner,
        },
        task.id,
        "review:" + task.id,
      );
    } else throw Error("Неизвестное действие");
    return reply({ ok: true, id });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "";
    return reply(
      {
        error: message.includes("UNIQUE constraint")
          ? "Вы уже отправили отклик или отзыв."
          : message.includes("D1") || message.includes("SQLITE")
            ? "Не удалось сохранить. Попробуйте ещё раз."
            : message || "Не удалось сохранить.",
      },
      { status: 400 },
    );
  }
}
