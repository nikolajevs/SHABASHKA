import {env} from 'cloudflare:workers';
import {buildPushPayload} from '@block65/webcrypto-web-push';
import {marketDatabase} from './admin-access';
export const pushEnv=()=>env as unknown as {VAPID_PUBLIC_KEY?:string;VAPID_PRIVATE_KEY?:string};
export function validPushEndpoint(endpoint:string){
  try { const url=new URL(endpoint);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname); }catch{return false;}
}
export async function sendPush(owner:string,item:string,chat=false){
  try {
    const config=pushEnv();
    if(!config.VAPID_PRIVATE_KEY||!config.VAPID_PUBLIC_KEY){console.error('Push not sent: VAPID keys are not configured');return;}
    const db=marketDatabase();
    const rows=await db.prepare("SELECT id,data FROM records WHERE kind='push-subscription' AND owner=? AND NOT EXISTS(SELECT 1 FROM records WHERE id='account:'||? AND json_extract(data,'$.inactive')=1) AND NOT EXISTS(SELECT 1 FROM records WHERE id='block:'||?) LIMIT 10").bind(owner,owner,owner).all<{id:string;data:string}>();
    if(!rows.results.length){console.log('Push not sent: no subscriptions for owner',owner);return;}
    await Promise.allSettled(rows.results.map(async row=>{
      try {
        const {subscription,locale}=JSON.parse(row.data);
        if(!validPushEndpoint(subscription.endpoint)){console.error('Push skipped: invalid endpoint for subscription',row.id);return;}
        const copy:Record<string,string[]>={ru:['Новый отклик на задание','Новое сообщение в чате'],lv:['Jauns pieteikums uzdevumam','Jauna ziņa sarakstē'],en:['New response to your task','New chat message'],uk:['Новий відгук на завдання','Нове повідомлення в чаті']};
        const payload=await buildPushPayload({data:{title:'Gigs',body:(copy[locale]||copy.lv)[chat?1:0],url:'/?item='+encodeURIComponent(item)+(chat?'&chat=1':''),tag:item},options:{ttl:3600}},subscription,{subject:'https://gigs.lv',publicKey:config.VAPID_PUBLIC_KEY!,privateKey:config.VAPID_PRIVATE_KEY!});
        const response=await fetch(subscription.endpoint,{...payload,redirect:'error',signal:AbortSignal.timeout(5000)});
        if(response.status===404||response.status===410){
          console.log('Push subscription gone, removing',row.id,response.status);
          await db.prepare("DELETE FROM records WHERE id=? AND kind='push-subscription'").bind(row.id).run();
        } else if(!response.ok){
          console.error('Push delivery rejected',row.id,response.status,await response.text().catch(()=>''));
        }
      } catch(e) {console.error('Push delivery failed for subscription',row.id,e);}
    }));
  }catch(e){console.error('Push delivery failed',e);}
}
