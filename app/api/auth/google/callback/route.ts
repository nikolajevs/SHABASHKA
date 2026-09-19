import { marketDatabase } from '../../../../admin-access';
import { authEnv,authRow,cookie,cookieValue,digest,emailValue,googleConfigured,publicOrigin,randomToken,SESSION_COOKIE,startSession } from '../../../../auth-store';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const failure=()=>new Response(null,{status:303,headers:{Location:'/?auth=login&authError=google','Set-Cookie':cookieValue(request,'gigs_oauth','',0),'Cache-Control':'no-store'}});
  try {
    if(!googleConfigured()||new URL(request.url).origin!==publicOrigin())return failure();
    const url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code');
    if(!state||!code||code.length>4096||! /^[a-f0-9]{64}$/.test(state)||cookie(request,'gigs_oauth')!==state)return failure();
    const row=await marketDatabase().prepare("DELETE FROM records WHERE id=? AND kind='auth-oauth' AND json_extract(data,'$.expires')>? RETURNING data").bind('auth-oauth:'+await digest(state),Date.now()).first<{data:string}>();
    if(!row)return failure();
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:authEnv().GOOGLE_CLIENT_ID!,client_secret:authEnv().GOOGLE_CLIENT_SECRET!,redirect_uri:publicOrigin()+'/api/auth/google/callback',code_verifier:JSON.parse(row.data).verifier})});
    if(!response.ok)return failure();
    const token=await response.json() as {access_token?:string};if(!token.access_token)return failure();
    const infoResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+token.access_token}});
    if(!infoResponse.ok)return failure();
    const info=await infoResponse.json() as {sub?:string;email?:string;email_verified?:boolean;name?:string};
    if(typeof info.sub!=='string'||!info.sub||info.sub.length>255||info.email_verified!==true)return failure();
    const id='auth-google:'+await digest(info.sub),email=emailValue(info.email),owner='google:'+await digest(info.sub);
    // Identities are keyed by Google's stable subject, never linked by email alone.
    await marketDatabase().prepare("INSERT INTO records(id,kind,owner,data,created) SELECT ?,'auth-identity',?,?,? WHERE NOT EXISTS(SELECT 1 FROM records WHERE id=? AND json_extract(data,'$.adminErased')=1) ON CONFLICT(id) DO UPDATE SET data=json_set(records.data,'$.email',?,'$.name',?,'$.verified',json('true'))")
      .bind(id,owner,JSON.stringify({email,name:(info.name||'').slice(0,80),verified:true,version:randomToken()}),new Date().toISOString(),'account:'+owner,email,(info.name||'').slice(0,80)).run();
    const identity=await authRow(id);if(!identity)return failure();
    await marketDatabase().prepare("INSERT INTO records(id,kind,owner,data,created) VALUES (?,'account',?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,created=excluded.created WHERE json_extract(records.data,'$.erased')=1 AND coalesce(json_extract(records.data,'$.adminErased'),0)=0 AND NOT EXISTS(SELECT 1 FROM records WHERE id=? AND kind='block')").bind('account:'+owner,owner,JSON.stringify({name:(info.name||'').slice(0,80),role:null}),new Date().toISOString(),'block:'+owner).run();
    const session=await startSession(identity);
    const headers=new Headers({Location:'/?auth=complete','Cache-Control':'no-store'});
    headers.append('Set-Cookie',cookieValue(request,SESSION_COOKIE,session,7*86400));headers.append('Set-Cookie',cookieValue(request,'gigs_oauth','',0));
    return new Response(null,{status:303,headers});
  }catch{return failure();}
}
