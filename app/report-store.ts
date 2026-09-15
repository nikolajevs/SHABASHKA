import {marketDatabase} from './admin-access';
import {expirePrivacyMarkers} from './privacy-store';
export async function hashToken(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function expireReports(){
 await expirePrivacyMarkers();
 const cutoff=new Date(Date.now()-180*86400000).toISOString();
 await marketDatabase().prepare("DELETE FROM records WHERE kind IN ('report','notice') AND created<?").bind(cutoff).run();
 await marketDatabase().prepare("UPDATE records SET data=json_remove(data,'$.quota') WHERE kind='report' AND created<? AND json_type(data,'$.quota') IS NOT NULL").bind(new Date(Date.now()-3600000).toISOString()).run();
}
