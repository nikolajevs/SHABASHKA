import {marketDatabase,unavailable} from '../../admin-access';
import {getChatGPTUser} from '../../chatgpt-auth';
import {localizedJson} from '../../i18n/shared';
import {expireReports,hashToken} from '../../report-store';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const reply=localizedJson(request),token=request.headers.get('X-Report-Token')||'',id=new URL(request.url).searchParams.get('id')||'';
 if(!/^[a-f0-9]{64}$/.test(token))return reply({error:"Обращение не найдено."},{status:404});
 try{await expireReports();const row=await marketDatabase().prepare("SELECT data,created FROM records WHERE id=? AND kind='report' AND json_extract(data,'$.tokenHash')=?").bind(id,await hashToken(token)).first<{data:string;created:string}>();
 if(!row)return reply({error:"Обращение не найдено."},{status:404});
 const d=JSON.parse(row.data);return reply({id,created:row.created,status:d.status,decision:d.decision||null,basis:d.basis||null,resolvedAt:d.resolvedAt||null});
 }catch{return reply({error:"Не удалось загрузить данные. Попробуйте ещё раз."},{status:503});}
}
export async function POST(request:Request){
 const reply=localizedJson(request),raw=await request.text();
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:"Недопустимый источник запроса"},{status:403});
 if(raw.length>10000)return reply({error:"Слишком большой запрос"},{status:413});
 try{
 const b=JSON.parse(raw);if(!b||typeof b.target!=='string'||b.target.length>300||typeof b.reason!=='string'||b.reason.trim().length<20||b.reason.length>4000||b.goodFaith!==true||!['illegal','rules','child-safety'].includes(b.category))return reply({error:"Опишите нарушение и подтвердите добросовестность обращения."},{status:400});
 const name=typeof b.name==='string'?b.name.trim():'',email=typeof b.email==='string'?b.email.trim():'';
 if(name.length>100||email.length>254||(b.category!=='child-safety'&&(!name||!email))||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return reply({error:"Укажите имя и корректный email."},{status:400});
 const db=marketDatabase(),target=await db.prepare("SELECT id,kind FROM records WHERE id=? AND kind IN ('task','profile','review')").bind(b.target).first<{id:string;kind:string}>();
 if(!target||await unavailable(target.id))return reply({error:"Публикация недоступна."},{status:404});
 const user=await getChatGPTUser(),token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,'0')).join(''),id=crypto.randomUUID(),now=new Date().toISOString();
 // Short-lived pseudonymous quota; raw IP is never persisted.
 const quota=await hashToken((request.headers.get('cf-connecting-ip')||user?.userId||'local')+now.slice(0,13));
 await expireReports();
 const count=await db.prepare("SELECT count(*) AS n FROM records WHERE kind='report' AND json_extract(data,'$.quota')=?").bind(quota).first<{n:number}>();
 if((count?.n||0)>=10)return reply({error:"Слишком много обращений. Попробуйте позже."},{status:429});
 const data={name,email,reason:b.reason.trim(),category:b.category,goodFaith:true,status:'pending',target:target.id,targetKind:target.kind,url:new URL('/?item='+encodeURIComponent(target.id),request.url).href,tokenHash:await hashToken(token),quota,receiptEmailSent:false,decisionEmailSent:false};
 const saved=await db.prepare("INSERT INTO records(id,kind,owner,parent,data,created) SELECT ?,'report',?,?,?,? WHERE (SELECT count(*) FROM records WHERE kind='report' AND json_extract(data,'$.quota')=?)<10 AND EXISTS (SELECT 1 FROM records WHERE id=? AND kind IN ('task','profile','review'))").bind(id,user?.userId||'',target.id,JSON.stringify(data),now,quota,target.id).run();
 if(!saved.meta.changes)return reply({error:"Слишком много обращений. Попробуйте позже."},{status:429});
 return reply({ok:true,id,token,status:'pending'}, {status:201});
 }catch(e){console.error(e);return reply({error:"Не удалось сохранить. Попробуйте ещё раз."},{status:400});}
}
