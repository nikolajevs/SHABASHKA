import {getChatGPTUser} from '../../chatgpt-auth';
import {marketDatabase,blocked} from '../../admin-access';
import {inactive} from '../../privacy-store';
import {pushEnv,validPushEndpoint} from '../../push-store';
import {digest} from '../../auth-store';
export async function GET(){return Response.json({publicKey:pushEnv().VAPID_PUBLIC_KEY||null},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
  const user=await getChatGPTUser();if(!user)return new Response(null,{status:401});
  if(await blocked(user.userId)||await inactive(user.userId))return new Response(null,{status:403});
  const raw=await request.text();if(raw.length>6000)return new Response(null,{status:413});
  try {
    const b=JSON.parse(raw),subscription=b.subscription,endpoint=subscription?.endpoint;
    if(typeof endpoint!=='string'||endpoint.length>2500||!validPushEndpoint(endpoint))return new Response(null,{status:400});
    const id='push:'+await digest(endpoint),db=marketDatabase();
    if(b.action==='remove'){await db.prepare("DELETE FROM records WHERE id=? AND owner=? AND kind='push-subscription'").bind(id,user.userId).run();return Response.json({ok:true});}
    if(b.action!=='subscribe'||!pushEnv().VAPID_PUBLIC_KEY)return new Response(null,{status:400});
    if(!/^[A-Za-z0-9_-]{87}$/.test(subscription.keys?.p256dh||'')||!/^[A-Za-z0-9_-]{22}$/.test(subscription.keys?.auth||''))return new Response(null,{status:400});
    await db.prepare("INSERT INTO records(id,kind,owner,data,created) VALUES (?,'push-subscription',?,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,data=excluded.data,created=excluded.created").bind(id,user.userId,JSON.stringify({subscription,locale:['ru','lv','en','uk'].includes(b.locale)?b.locale:'lv'}),new Date().toISOString()).run();
    return Response.json({ok:true});
  }catch{return new Response(null,{status:400});}
}
