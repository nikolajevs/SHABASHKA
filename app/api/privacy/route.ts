import {getChatGPTUser} from "../../chatgpt-auth";
import {marketDatabase} from "../../admin-access";
import {accountState,eraseAccount} from "../../privacy-store";
import {localizedJson} from "../../i18n/shared";
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const reply=localizedJson(request),user=await getChatGPTUser();
 if(!user)return reply({error:"Войдите, чтобы сохранить данные."},{status:401});
 try{
  const db=marketDatabase(),state=await accountState(user.userId);
  if(new URL(request.url).searchParams.get('export')!=='1')return reply({state});
  const rows=await db.prepare("SELECT id,kind,parent,data,created FROM records WHERE (owner=? AND kind IN ('account','profile','task','bid','review','report','notice','auth-identity')) OR (kind='message' AND parent IN (SELECT id FROM records WHERE kind='bid' AND (owner=? OR parent IN (SELECT id FROM records WHERE kind='task' AND owner=?)))) ORDER BY created,id").bind(user.userId,user.userId,user.userId).all<{id:string;kind:string;parent:string|null;data:string;created:string}>();
  const records=rows.results.map(r=>{const data=JSON.parse(r.data);delete data.hash;delete data.version;delete data.tokenHash;delete data.quota;delete data.emailDelivery;return {...r,data};});
  return Response.json({format:'shabashka-personal-data-v1',exportedAt:new Date().toISOString(),identity:{email:user.email,name:user.fullName},records},{headers:{'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="gigs-data.json"','X-Content-Type-Options':'nosniff'}});
 }catch(e){console.error(e);return reply({error:"Не удалось загрузить данные. Попробуйте ещё раз."},{status:503});}
}
export async function POST(request:Request){
 const reply=localizedJson(request),raw=await request.text();
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:"Недопустимый источник запроса"},{status:403});
 const user=await getChatGPTUser();if(!user)return reply({error:"Войдите, чтобы сохранить данные."},{status:401});
 try{
  if(raw.length>1000)return reply({error:"Слишком большой запрос"},{status:413});
  const b=JSON.parse(raw),db=marketDatabase();
  if(b?.action==='erase'){
   if(b.confirm!=='DELETE')return reply({error:"Введите DELETE для подтверждения удаления."},{status:400});
   await eraseAccount(user.userId);return reply({ok:true,erased:true});
  }
  if(!['deactivate','reactivate'].includes(b?.action))return reply({error:"Неизвестное действие"},{status:400});
  const result=await db.prepare("UPDATE records SET data=json_set(data,'$.inactive',json(?)) WHERE id=? AND kind='account' AND coalesce(json_extract(data,'$.erased'),0)=0").bind(b.action==='deactivate'?'true':'false','account:'+user.userId).run();
  if(!result.meta.changes)return reply({error:"Сначала завершите регистрацию в личном кабинете"},{status:400});
  return reply({ok:true});
 }catch(e){console.error(e);return reply({error:"Не удалось сохранить. Попробуйте ещё раз."},{status:400});}
}
