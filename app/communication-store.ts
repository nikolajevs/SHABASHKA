import {marketDatabase,blocked} from './admin-access';
import {inactive} from './privacy-store';

export async function pairBlocked(a:string,b:string) {
  return !!await marketDatabase().prepare("SELECT id FROM records WHERE kind='user-block' AND ((owner=? AND parent=?) OR (owner=? AND parent=?)) LIMIT 1").bind(a,b,b,a).first();
}
export async function communicationAllowed(a:string,b:string) {
  return !await pairBlocked(a,b) && !await blocked(b) && !await inactive(b);
}
export async function threadPeer(id:string,uid:string) {
  const db=marketDatabase();
  const thread=await db.prepare("SELECT kind,owner,parent FROM records WHERE id=? AND kind IN ('conversation','bid')").bind(id).first<{kind:string;owner:string;parent:string}>();
  if(!thread)return null;
  const other=thread.kind==='conversation'?thread.parent:(await db.prepare("SELECT owner FROM records WHERE id=? AND kind='task'").bind(thread.parent).first<{owner:string}>())?.owner;
  if(!other||![thread.owner,other].includes(uid))return null;
  return thread.owner===uid?other:thread.owner;
}
// Fixed windows and a conditional UPSERT keep simultaneous requests within limits.
export async function consumeCommunicationQuota(uid:string,scope:string,limit:number,windowMs:number) {
  const db=marketDatabase(),now=Date.now(),bucket=Math.floor(now/windowMs);
  const result=await db.prepare("INSERT INTO records(id,kind,owner,parent,data,created) VALUES (?,'communication-rate',?,NULL,'{\"count\":1}',?) ON CONFLICT(id) DO UPDATE SET data=json_set(records.data,'$.count',json_extract(records.data,'$.count')+1) WHERE json_extract(records.data,'$.count')<?")
    .bind('communication-rate:'+uid+':'+scope+':'+bucket,uid,new Date(now).toISOString(),limit).run();
  await db.prepare("DELETE FROM records WHERE kind='communication-rate' AND owner=? AND created<?").bind(uid,new Date(now-86400000).toISOString()).run();
  return !!result.meta.changes;
}
