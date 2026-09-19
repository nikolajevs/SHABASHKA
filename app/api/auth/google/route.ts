import { marketDatabase } from '../../../admin-access';
import { authCleanup,authEnv,cookieValue,digest,googleConfigured,publicOrigin,randomToken,rateLimit } from '../../../auth-store';
import { Buffer } from 'node:buffer';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  if(!googleConfigured())return Response.redirect(new URL('/?auth=login&authError=google',request.url),303);
  if(new URL(request.url).origin!==publicOrigin())return Response.redirect(publicOrigin()+'/api/auth/google',303);
  try {
    await authCleanup();await rateLimit(request);
    const state=randomToken(),verifier=randomToken(),challenge=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url');
    await marketDatabase().prepare("INSERT INTO records(id,kind,owner,data,created) VALUES (?,'auth-oauth','',?,?)").bind('auth-oauth:'+await digest(state),JSON.stringify({verifier,expires:Date.now()+600000}),new Date().toISOString()).run();
    const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search=new URLSearchParams({client_id:authEnv().GOOGLE_CLIENT_ID!,redirect_uri:publicOrigin()+'/api/auth/google/callback',response_type:'code',scope:'openid email profile',state,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'}).toString();
    return new Response(null,{status:303,headers:{Location:url.href,'Set-Cookie':cookieValue(request,'gigs_oauth',state,600),'Cache-Control':'no-store'}});
  }catch{return Response.redirect(new URL('/?auth=login&authError=google',request.url),303);}
}
