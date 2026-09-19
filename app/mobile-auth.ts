import { blocked } from './admin-access';
import { sessionUser } from './auth-store';
import { inactive } from './privacy-store';

export function mobileToken(request: Request) {
  return /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization') || '')?.[1] || '';
}
export async function mobileUser(request: Request) {
  const user = await sessionUser(mobileToken(request));
  if (!user || await blocked(user.userId) || await inactive(user.userId)) return null;
  return user;
}
export function mobileJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
