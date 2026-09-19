import { marketDatabase } from "./admin-access";
export const TERMS_VERSION = "2026-09-15";
export async function expirePrivacyMarkers(){
 const db=marketDatabase(),cutoff=new Date(Date.now()-30*86400000).toISOString();
 await db.batch([
  db.prepare("DELETE FROM records WHERE kind='block' AND parent IN (SELECT id FROM records WHERE kind='account' AND json_extract(data,'$.erased')=1 AND coalesce(json_extract(data,'$.adminErased'),0)=0 AND created<?)").bind(cutoff),
  db.prepare("DELETE FROM records WHERE kind='account' AND json_extract(data,'$.erased')=1 AND coalesce(json_extract(data,'$.adminErased'),0)=0 AND created<?").bind(cutoff),
 ]);
}
export async function accountState(owner: string) {
  await expirePrivacyMarkers();
  const row = await marketDatabase().prepare("SELECT data FROM records WHERE id=? AND kind='account'").bind('account:'+owner).first<{data:string}>();
  return row ? JSON.parse(row.data) as {name?:string;role?:string;inactive?:boolean;erased?:boolean;termsVersion?:string;acceptedAt?:string} : null;
}
export async function inactive(owner: string) {
  const state=await accountState(owner);
  return !!(state?.inactive || state?.erased);
}

export async function eraseAccount(owner: string, admin?: {id:string;email:string;reason:string;basis:string}) {
  const db=marketDatabase();
  if(!admin && await db.prepare("SELECT id FROM records WHERE id=? AND kind='account' AND json_extract(data,'$.adminErased')=1").bind('account:'+owner).first())return;
  // Remove shared threads connected to the departing account. No orphaned bids,
  // author IDs embedded in profile IDs, or copies in moderation snapshots survive.
  const affected="SELECT id FROM records WHERE owner=? OR (kind IN ('bid','review') AND parent IN (SELECT id FROM records WHERE kind='task' AND owner=?)) OR (kind='review' AND json_extract(data,'$.profile')=?)";
  const args=[owner,owner,'profile:'+owner];
  await db.batch([
    db.prepare(`DELETE FROM records WHERE kind IN ('audit','hidden','report','notice') AND parent IN (${affected})`).bind(...args),
    db.prepare("DELETE FROM records WHERE kind='message' AND parent IN (SELECT id FROM records WHERE kind='bid' AND (owner=? OR parent IN (SELECT id FROM records WHERE kind='task' AND owner=?)))").bind(owner,owner),
    db.prepare("UPDATE records SET data=json_set(data,'$.status',CASE WHEN json_extract(data,'$.status')='active' THEN 'open' ELSE json_extract(data,'$.status') END,'$.chosen',NULL) WHERE kind='task' AND json_extract(data,'$.chosen') IN (SELECT id FROM records WHERE kind='bid' AND owner=?)").bind(owner),
    db.prepare(`DELETE FROM records WHERE id IN (${affected}) AND kind<>'account'`).bind(...args),
    db.prepare("DELETE FROM records WHERE owner=? AND kind<>'account'").bind(owner),
    // A minimal tombstone prevents a stale request from re-creating the account.
    // It contains no name, email, content, or role; explicit re-registration is required.
    db.prepare("INSERT INTO records(id,kind,owner,parent,data,created) VALUES (?,'account',?,NULL,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,created=excluded.created").bind('account:'+owner,owner,JSON.stringify({erased:true,inactive:true,...(admin?{adminErased:true}:{})}),new Date().toISOString()),
    db.prepare("UPDATE records SET data='{}' WHERE id=? AND kind='block'").bind('block:'+owner),
    ...(admin?[
      db.prepare("INSERT INTO records(id,kind,owner,parent,data,created) VALUES (?,'block',?,?,'{}',?) ON CONFLICT(id) DO UPDATE SET data='{}'").bind('block:'+owner,admin.id,'account:'+owner,new Date().toISOString()),
      db.prepare("INSERT INTO records(id,kind,owner,parent,data,created) VALUES (?,'audit',?,?,?,?)").bind(crypto.randomUUID(),admin.id,'account:'+owner,JSON.stringify({action:'delete',target:'account:'+owner,targetKind:'account',actor:admin.email,reason:admin.reason,basis:admin.basis}),new Date().toISOString()),
    ]:[]),
  ]);
}
