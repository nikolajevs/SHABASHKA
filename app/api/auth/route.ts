import { marketDatabase } from '../../admin-access';
import { getChatGPTUser } from '../../chatgpt-auth';
import { localizedJson } from '../../i18n/shared';
import { authCleanup,authRow,cookie,cookieValue,digest,emailIdentity,emailValue,googleConfigured,mailConfigured,passwordHash,passwordMatches,passwordValue,randomToken,rateLimit,sendAuthEmail,SESSION_COOKIE,startSession,type AuthData,type AuthRow } from '../../auth-store';
export const dynamic='force-dynamic';
export async function GET(request: Request) {
  const user=await getChatGPTUser();
  return localizedJson(request)({google:googleConfigured(),email:mailConfigured(),user:user?{email:user.email,emailVerified:user.emailVerified,provider:user.authProvider}:null});
}
export async function POST(request: Request) {
  const reply=localizedJson(request),raw=await request.text();
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Недопустимый источник запроса'},{status:403});
  if(raw.length>5000)return reply({error:'Слишком большой запрос'},{status:413});
  try {
    const b=JSON.parse(raw),db=marketDatabase();
    await authCleanup();
    if(b.action==='logout'||b.action==='chatgpt') {
      const token=cookie(request,SESSION_COOKIE);
      if(token)await db.prepare("DELETE FROM records WHERE id=? AND kind='auth-session'").bind('auth-session:'+await digest(token)).run();
      return reply({ok:true},{headers:{'Set-Cookie':cookieValue(request,SESSION_COOKIE,'',0)}});
    }
    const email=['login','register','forgot'].includes(b.action)?emailValue(b.email):'';
    await rateLimit(request,email);
    if(b.action==='register') {
      if(typeof b.name!=='string'||!b.name.trim()||b.name.length>80)throw Error('Заполните корректно: name');
      const password=passwordValue(b.password),id=await emailIdentity(email);
      const data:AuthData={email,name:b.name.trim(),hash:await passwordHash(password),verified:false,version:randomToken()};
      const owner='local:'+crypto.randomUUID();
      const saved=await db.batch([
        db.prepare("INSERT INTO records(id,kind,owner,data,created) VALUES (?,'auth-identity',?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,owner,JSON.stringify(data),new Date().toISOString()),
        db.prepare("INSERT INTO records(id,kind,owner,data,created) SELECT ?,'account',?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND owner=? AND kind='auth-identity')").bind('account:'+owner,owner,JSON.stringify({name:data.name}),new Date().toISOString(),id,owner),
      ]);
      if(!saved[0].meta.changes)throw Error('Регистрация недоступна для этого email. Войдите или восстановите пароль.');
      const row={id,owner,data:JSON.stringify(data)},token=await startSession(row);
      // Sending is an explicit separate action; failed delivery never loses an account.
      return reply({ok:true,needsVerification:true},{headers:{'Set-Cookie':cookieValue(request,SESSION_COOKIE,token,7*86400)}});
    }
    if(b.action==='login') {
      if(typeof b.password!=='string'||b.password.length>128)throw Error('Неверный email или пароль.');
      const row=await authRow(await emailIdentity(email)),data=row?JSON.parse(row.data) as AuthData:null;
      const matches=await passwordMatches(b.password,data?.hash);
      if(!row||!matches)throw Error('Неверный email или пароль.');
      const token=await startSession(row);
      return reply({ok:true},{headers:{'Set-Cookie':cookieValue(request,SESSION_COOKIE,token,7*86400)}});
    }
    if(b.action==='forgot') {
      if(!mailConfigured())return reply({error:'Отправка писем пока недоступна.'},{status:503});
      const row=await authRow(await emailIdentity(email));
      if(row)await sendAuthEmail(row,'reset');
      return reply({ok:true,message:'Если аккаунт существует, письмо со ссылкой придёт на указанный email.'});
    }
    if(b.action==='send-verification') {
      const user=await getChatGPTUser();if(!user||user.authProvider!=='password')return reply({error:'Войдите, чтобы сохранить данные.'},{status:401});
      const row=await authRow(await emailIdentity(user.email));if(row&&!user.emailVerified)await sendAuthEmail(row,'verify');
      return reply({ok:true,message:'Письмо подтверждения отправлено.'});
    }
    if(b.action==='reset'||b.action==='verify') {
      if(typeof b.token!=='string'||! /^[a-f0-9]{64}$/.test(b.token))throw Error('Ссылка недействительна или устарела.');
      const tokenId='auth-token:'+await digest(b.token),now=Date.now();
      const row=await db.prepare("SELECT a.id,a.owner,a.data FROM records t JOIN records a ON a.id=t.parent AND a.kind='auth-identity' WHERE t.id=? AND t.kind='auth-token' AND json_extract(t.data,'$.purpose')=? AND json_extract(t.data,'$.expires')>? AND json_extract(t.data,'$.version')=json_extract(a.data,'$.version')").bind(tokenId,b.action,now).first<AuthRow>();
      if(!row)throw Error('Ссылка недействительна или устарела.');
      const old=JSON.parse(row.data) as AuthData;
      if(b.action==='verify'&&(typeof b.password!=='string'||b.password.length>128||!await passwordMatches(b.password,old.hash)))throw Error('Неверный email или пароль.');
      const data=b.action==='reset'?{...old,hash:await passwordHash(passwordValue(b.password)),verified:true,version:randomToken()}:{...old,verified:true};
      const results=await db.batch([
        db.prepare("UPDATE records SET data=? WHERE id=? AND kind='auth-identity' AND json_extract(data,'$.version')=? AND EXISTS(SELECT 1 FROM records WHERE id=? AND kind='auth-token' AND json_extract(data,'$.expires')>?)").bind(JSON.stringify(data),row.id,old.version,tokenId,Date.now()),
        db.prepare("DELETE FROM records WHERE kind='auth-session' AND parent=? AND ?='reset' AND json_extract(data,'$.version')<>? AND EXISTS(SELECT 1 FROM records WHERE id=? AND kind='auth-token')").bind(row.id,b.action,data.version,tokenId),
        db.prepare("DELETE FROM records WHERE id=? AND kind='auth-token'").bind(tokenId),
      ]);
      if(!results[0].meta.changes)throw Error('Ссылка недействительна или устарела.');
      return reply({ok:true,message:b.action==='reset'?'Пароль изменён. Войдите с новым паролем.':'Email подтверждён.'});
    }
    return reply({error:'Неизвестное действие'},{status:400});
  } catch(error) {
    const message=error instanceof Error?error.message:'';
    // Never log passwords, tokens or provider responses.
    const known=['Укажите корректный email.','Пароль должен содержать от 12 до 128 символов.','Заполните корректно: name','Регистрация недоступна для этого email. Войдите или восстановите пароль.','Неверный email или пароль.','Ссылка недействительна или устарела.','Слишком много попыток. Попробуйте через 15 минут.','Отправка писем пока недоступна.','Не удалось войти. Попробуйте ещё раз.'];
    return reply({error:known.includes(message)?message:'Не удалось сохранить. Попробуйте ещё раз.'},{status:message.startsWith('Слишком много')?429:400});
  }
}
