import { marketDatabase } from '../../../../admin-access';
import { mobileJson, mobileUser } from '../../../../mobile-auth';
import { ORDER_CATEGORIES } from '../../../../../mobile/shared/order-catalog';
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
    if (raw.length > 950000) return mobileJson({ error: 'Фотографии слишком большие.' }, 413);
    const body = JSON.parse(raw);
    // New fields are optional only for older installed clients. Validate every supplied value.
    if (body.category !== undefined && !(ORDER_CATEGORIES as readonly unknown[]).includes(body.category)) return mobileJson({ error: 'Выберите категорию из списка.' }, 400);
    if (body.budgetCents !== undefined && (!Number.isSafeInteger(body.budgetCents) || body.budgetCents < 1 || body.budgetCents > 10000000 || body.currency !== 'EUR')) return mobileJson({ error: 'Укажите корректный бюджет в евро.' }, 400);
    if (body.currency !== undefined && (body.currency !== 'EUR' || body.budgetCents === undefined)) return mobileJson({ error: 'Укажите корректный бюджет в евро.' }, 400);
    for (const [key,max] of [['city',100],['street',300]] as const) if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > max || (key==='city'&&!body[key].trim()))) return mobileJson({ error: 'Проверьте город и адрес.' }, 400);
    const point = body.location;
    if (point !== undefined && point !== null && (typeof point !== 'object' || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || point.latitude < -90 || point.latitude > 90 || point.longitude < -180 || point.longitude > 180)) return mobileJson({ error: 'Некорректная точка на карте.' }, 400);
    if (body.city !== undefined && !body.street?.trim() && !point) return mobileJson({ error: 'Укажите улицу и дом или точку на карте.' }, 400);
    const details = {
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.budgetCents !== undefined ? { budgetCents: body.budgetCents, currency: 'EUR' } : {}),
      ...(body.city !== undefined ? { city: body.city.trim() } : {}),
      ...(body.street !== undefined ? { street: body.street.trim() } : {}),
      ...(point ? { location: { latitude: point.latitude, longitude: point.longitude } } : {}),
    };
    const limits: Record<string, number> = { title: 120, description: 4000, address: 500 };
    for (const [key, max] of Object.entries(limits)) {
      if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > max) return mobileJson({ error: 'Заполните название, описание, адрес и желаемое время.' }, 400);
    }
    const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
    const hasRange = body.dateFrom !== undefined || body.dateTo !== undefined;
    if (hasRange && (!validDate(body.dateFrom) || !validDate(body.dateTo) || body.dateTo < body.dateFrom)) return mobileJson({ error: 'Укажите корректные даты «от» и «до».' }, 400);
    // Keep already-installed clients working while they update to the date range UI.
    if (!hasRange && (typeof body.scheduledAt !== 'string' || !body.scheduledAt.trim() || body.scheduledAt.length > 80)) return mobileJson({ error: 'Укажите желаемые даты.' }, 400);
    const photos = body.photos ?? [];
    if (!Array.isArray(photos) || photos.length > 5 || photos.some((photo: unknown) => {
      if (typeof photo !== 'string' || photo.length > 180000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)) return true;
      try { const bytes = atob(photo.slice(23)); return bytes.length < 4 || bytes.charCodeAt(0) !== 255 || bytes.charCodeAt(1) !== 216 || bytes.charCodeAt(bytes.length-2) !== 255 || bytes.charCodeAt(bytes.length-1) !== 217; } catch { return true; }
    })) return mobileJson({ error: 'Можно приложить не более 5 фотографий JPEG допустимого размера.' }, 400);
    if (typeof body.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.requestId)) return mobileJson({ error: 'Некорректный номер запроса.' }, 400);
    const id = 'mobile-order:' + user.userId + ':' + body.requestId;
    const data = { ...details, title: body.title.trim(), description: body.description.trim(), address: body.address.trim(), scheduledAt: hasRange ? `${body.dateFrom} — ${body.dateTo}` : body.scheduledAt.trim(), ...(hasRange ? { dateFrom: body.dateFrom, dateTo: body.dateTo } : {}), photos, status: 'new', customerName: user.displayName };
    const db = marketDatabase();
    await db.prepare("INSERT INTO records(id,kind,owner,data,created) VALUES (?,'mobile-order',?,?,?) ON CONFLICT(id) DO NOTHING").bind(id, user.userId, JSON.stringify(data), new Date().toISOString()).run();
    const row = await db.prepare("SELECT data,created FROM records WHERE id=? AND owner=? AND kind='mobile-order'").bind(id, user.userId).first<{ data: string; created: string }>();
    return mobileJson({ ...JSON.parse(row!.data), id, created: row!.created }, 201);
  } catch { return mobileJson({ error: 'Не удалось сохранить заказ. Повторите попытку.' }, 400); }
}
