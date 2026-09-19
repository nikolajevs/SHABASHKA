import { POST as webAuth } from '../../auth/route';
import { marketDatabase } from '../../../admin-access';
import { digest, SESSION_COOKIE } from '../../../auth-store';
import { mobileJson, mobileToken, mobileUser } from '../../../mobile-auth';
import { TERMS_VERSION } from '../../../privacy-store';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await mobileUser(request);
  return user ? mobileJson({ user: { name: user.displayName, email: user.email } }) : mobileJson({ error: 'Войдите в аккаунт.' }, 401);
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 5000) return mobileJson({ error: 'Слишком большой запрос.' }, 413);
    const body = JSON.parse(raw);
    if (request.headers.has('origin') && request.headers.get('origin') !== new URL(request.url).origin) return mobileJson({ error: 'Недопустимый источник запроса.' }, 403);
    if (body.action === 'logout') {
      const token = mobileToken(request);
      if (token) await marketDatabase().prepare("DELETE FROM records WHERE id=? AND kind='auth-session'").bind('auth-session:' + await digest(token)).run();
      return mobileJson({ ok: true });
    }
    if (!['login', 'register', 'forgot'].includes(body.action)) return mobileJson({ error: 'Неизвестное действие.' }, 400);
    if (body.action === 'register' && body.acceptTerms !== true) return mobileJson({ error: 'Примите условия использования.' }, 400);
    // Reuse website password hashing, duplicate-account protection and rate limits.
    // Native clients receive a bearer token; browser cookie/CSRF rules stay unchanged.
    const headers = new Headers({ 'Content-Type': 'application/json', origin: new URL(request.url).origin });
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) headers.set('cf-connecting-ip', ip);
    const response = await webAuth(new Request(request.url, { method: 'POST', headers, body: raw }));
    const result = await response.json();
    if (!response.ok || body.action === 'forgot') return mobileJson(result, response.status);
    const token = response.headers.get('set-cookie')?.match(new RegExp(SESSION_COOKIE + '=([a-f0-9]{64})'))?.[1];
    if (!token) return mobileJson({ error: 'Не удалось войти.' }, 500);
    const user = await mobileUser(new Request(request.url, { headers: { authorization: 'Bearer ' + token } }));
    if (!user) {
      await marketDatabase().prepare("DELETE FROM records WHERE id=? AND kind='auth-session'").bind('auth-session:' + await digest(token)).run();
      return mobileJson({ error: 'Аккаунт недоступен. Обратитесь в поддержку.' }, 403);
    }
    if (body.action === 'register') await marketDatabase().prepare("UPDATE records SET data=json_set(data,'$.role','customer','$.termsVersion',?,'$.acceptedAt',?) WHERE id=? AND kind='account'").bind(TERMS_VERSION, new Date().toISOString(), 'account:' + user.userId).run();
    return mobileJson({ token, user: { name: user.displayName, email: user.email } });
  } catch { return mobileJson({ error: 'Не удалось выполнить запрос. Попробуйте ещё раз.' }, 400); }
}
