import { env } from 'cloudflare:workers';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { marketDatabase } from './admin-access';
import type { ChatGPTUser } from './chatgpt-auth';

type AuthEnv = { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; RESEND_API_KEY?: string; AUTH_EMAIL_FROM?: string; AUTH_PUBLIC_ORIGIN?: string };
export const authEnv = () => env as unknown as AuthEnv;
export const SESSION_COOKIE = 'gigs_session';
export type AuthData = { email: string; name: string; hash?: string; verified: boolean; version: string; expires?: number };
export type AuthRow = { id: string; owner: string; data: string };
export function randomToken() { return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex'); }
export async function digest(value: string) { return Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('hex'); }
export function cookie(request: Request, name: string) { return request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1) || ''; }
export function cookieValue(request: Request, name: string, value: string, maxAge: number) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export function emailValue(value: unknown) {
  if(typeof value!=='string'||value.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw Error('Укажите корректный email.');
  return value.trim().toLowerCase();
}
export function passwordValue(value: unknown) {
  if(typeof value!=='string'||value.length<12||value.length>128) throw Error('Пароль должен содержать от 12 до 128 символов.');
  return value;
}
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve,reject)=>scrypt(password,salt,32,{N:16384,r:8,p:5,maxmem:32*1024*1024},(err,key)=>err?reject(err):resolve(key)));
}
export async function passwordHash(password: string) { const salt=randomToken();return `scrypt-v1$${salt}$${(await derive(password,salt)).toString('hex')}`; }
export async function passwordMatches(password: string, hash?: string) {
  const parts=hash?.split('$');
  const salt=parts?.[0]==='scrypt-v1'&&parts[1]?.length===64?parts[1]:'0'.repeat(64);
  const actual=await derive(password,salt),expected=Buffer.from(parts?.[2]?.length===64?parts[2]:'0'.repeat(64),'hex');
  return timingSafeEqual(actual,expected)&&!!hash;
}
export async function emailIdentity(email: string) { return 'auth-email:'+await digest(email); }
export async function authRow(id: string) { return marketDatabase().prepare("SELECT id,owner,data FROM records WHERE id=? AND kind='auth-identity'").bind(id).first<AuthRow>(); }
export async function authCleanup() {
  await marketDatabase().prepare("DELETE FROM records WHERE kind IN ('auth-session','auth-token','auth-oauth','auth-rate') AND json_extract(data,'$.expires')<?").bind(Date.now()).run();
}
export async function rateLimit(request: Request, email='') {
  const db=marketDatabase(),bucket=Math.floor(Date.now()/900000),expires=(bucket+1)*900000;
  for(const [scope,limit] of [[`ip:${request.headers.get('cf-connecting-ip')||'local'}`,40],...(email?[[`email:${email}`,10]]:[])] as [string,number][]) {
    const id='auth-rate:'+await digest(scope+':'+bucket);
    const result=await db.prepare("INSERT INTO records(id,kind,owner,data,created) VALUES (?,'auth-rate','',?,?) ON CONFLICT(id) DO UPDATE SET data=json_set(records.data,'$.count',json_extract(records.data,'$.count')+1) WHERE json_extract(records.data,'$.count')<?")
      .bind(id,JSON.stringify({count:1,expires}),new Date().toISOString(),limit).run();
    if(!result.meta.changes) throw Error('Слишком много попыток. Попробуйте через 15 минут.');
  }
}
export async function sessionUser(token: string): Promise<ChatGPTUser|null> {
  if(!/^[a-f0-9]{64}$/.test(token))return null;
  const row=await marketDatabase().prepare("SELECT a.id,a.owner,a.data FROM records s JOIN records a ON a.id=s.parent AND a.kind='auth-identity' WHERE s.id=? AND s.kind='auth-session' AND json_extract(s.data,'$.expires')>? AND json_extract(s.data,'$.version')=json_extract(a.data,'$.version') AND NOT EXISTS(SELECT 1 FROM records r WHERE r.id='account:'||a.owner AND json_extract(r.data,'$.erased')=1)")
    .bind('auth-session:'+await digest(token),Date.now()).first<AuthRow>();
  if(!row)return null;
  const d=JSON.parse(row.data) as AuthData;
  return {userId:row.owner,email:d.email,fullName:d.name,displayName:d.name||d.email,emailVerified:d.verified,authProvider:row.id.startsWith('auth-google:')?'google':'password'};
}
export async function startSession(row: AuthRow) {
  const d=JSON.parse(row.data) as AuthData,token=randomToken();
  const result=await marketDatabase().prepare("INSERT INTO records(id,kind,owner,parent,data,created) SELECT ?,'auth-session',?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND kind='auth-identity' AND json_extract(data,'$.version')=?) AND NOT EXISTS(SELECT 1 FROM records WHERE id=? AND json_extract(data,'$.erased')=1)")
    .bind('auth-session:'+await digest(token),row.owner,row.id,JSON.stringify({expires:Date.now()+7*86400000,version:d.version}),new Date().toISOString(),row.id,d.version,'account:'+row.owner).run();
  if(!result.meta.changes)throw Error('Не удалось войти. Попробуйте ещё раз.');
  return token;
}
export function mailConfigured() { const e=authEnv(); return !!(e.RESEND_API_KEY&&e.AUTH_EMAIL_FROM&&e.AUTH_PUBLIC_ORIGIN); }
export function googleConfigured() { const e=authEnv();return !!(e.GOOGLE_CLIENT_ID&&e.GOOGLE_CLIENT_SECRET&&e.AUTH_PUBLIC_ORIGIN); }
export function publicOrigin() { const u=new URL(authEnv().AUTH_PUBLIC_ORIGIN||'https://gigs.lv');if(u.protocol!=='https:')throw Error('Invalid auth origin');return u.origin; }
export async function sendAuthEmail(row: AuthRow, purpose: 'reset'|'verify') {
  if(!mailConfigured())throw Error('Отправка писем пока недоступна.');
  const token=randomToken(),id='auth-token:'+await digest(token),d=JSON.parse(row.data) as AuthData;
  const expires=Date.now()+(purpose==='reset'?30*60000:24*3600000);
  await marketDatabase().prepare("INSERT INTO records(id,kind,owner,parent,data,created) SELECT ?,'auth-token',?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND kind='auth-identity')")
    .bind(id,row.owner,row.id,JSON.stringify({purpose,expires,version:d.version}),new Date().toISOString(),row.id).run();
  // Tokens stay in URL fragments so they are not sent in HTTP paths or referrers.
  const link=`${publicOrigin()}/auth/${purpose}#${token}`;
  const subject=purpose==='reset'?'Gigs — password reset / paroles atjaunošana':'Gigs — confirm email / apstipriniet e-pastu';
  const text=purpose==='reset'
    ?`Reset your Gigs password / Atjaunojiet Gigs paroli / Восстановление пароля / Відновлення пароля:\n${link}\n30 minutes / 30 minūtes / 30 минут / 30 хвилин.\nIf you did not request this, ignore this email.`
    :`Confirm your Gigs email / Apstipriniet e-pastu / Подтвердите email / Підтвердьте email:\n${link}\n24 hours / 24 stundas / 24 часа / 24 години.\nIf you did not request this, ignore this email.`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+authEnv().RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:authEnv().AUTH_EMAIL_FROM,to:[d.email],subject,text})});
  if(!response.ok){await marketDatabase().prepare('DELETE FROM records WHERE id=?').bind(id).run();throw Error('Отправка писем пока недоступна.');}
}
