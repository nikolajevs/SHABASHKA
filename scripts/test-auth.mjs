import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync} from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5174';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Local tests only');
const dir='.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const files=readdirSync(dir).filter(f=>f.endsWith('.sqlite')).filter(f=>{const candidate=new DatabaseSync(dir+'/'+f);try{return !!candidate.prepare("SELECT name FROM sqlite_master WHERE name='records'").get();}finally{candidate.close();}});assert.equal(files.length,1);
const db=new DatabaseSync(dir+'/'+files[0]);db.exec('PRAGMA busy_timeout=5000');
const prefix='auth-test-'+Date.now(),email=prefix+'@example.test',password='Test-password-12345';
const hash=v=>createHash('sha256').update(v).digest('hex');
const admin={'oai-authenticated-user-id':prefix+'-admin','oai-authenticated-user-email':process.env.TEST_ADMIN_EMAIL||'seedy@sites.test'};
let checks=0,ip=0;const owners=new Set([prefix+'-admin']);
async function req(path,body,headers={},expected=200){
 const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':`192.0.2.${++ip%250+1}`,...headers},body:body?JSON.stringify(body):undefined,redirect:'manual'});
 const text=await r.text();assert.equal(r.status,expected,text);checks++;
 return {r,b:text&&r.headers.get('content-type')?.includes('json')?JSON.parse(text):text};
}
const auth=(body,headers={},status=200)=>req('/api/auth',body,headers,status);
const identity=()=>db.prepare("SELECT * FROM records WHERE id=?").get('auth-email:'+hash(email));
function token(purpose,expires=Date.now()+60000){const row=identity(),raw=randomBytes(32).toString('hex');db.prepare("INSERT INTO records(id,kind,owner,parent,data,created) VALUES (?,'auth-token',?,?,?,?)").run('auth-token:'+hash(raw),row.owner,row.id,JSON.stringify({purpose,expires,version:JSON.parse(row.data).version}),new Date().toISOString());return raw;}
try{
 const config=(await auth()).b;assert.equal(config.google,false);assert.equal(config.email,false);
 await auth({action:'register',email,password:'short',name:prefix},{},400);
 await auth({action:'register',email,password,name:prefix},{Origin:'https://evil.example'},403);
 const registered=await auth({action:'register',email,password,name:prefix});
 let cookie=registered.r.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);cookie=cookie.split(';')[0];
 const owner=identity().owner;owners.add(owner);assert.notEqual(JSON.parse(identity().data).hash,password);
 assert.ok(db.prepare('SELECT id FROM records WHERE id=?').get('account:'+owner));
 assert.equal((await auth(undefined,{Cookie:cookie})).b.user.emailVerified,false);
 await auth({action:'register',email,password,name:prefix},{},400);
 await auth({action:'login',email,password:'bad-password'},{},400);
 await auth({action:'forgot',email},{},503);
 await req('/api/admin',undefined,{Cookie:cookie},403);
 const exportData=(await req('/api/privacy?export=1',undefined,{Cookie:cookie})).b;
 assert.ok(exportData.records.some(r=>r.kind==='auth-identity'));assert.ok(!JSON.stringify(exportData).includes('scrypt-v1'));assert.ok(!exportData.records.some(r=>r.kind==='auth-session'));
 const verify=token('verify');await auth({action:'verify',token:verify,password:'bad-password'},{},400);
 await auth({action:'verify',token:verify,password});await auth({action:'verify',token:verify,password},{},400);
 assert.equal((await auth(undefined,{Cookie:cookie})).b.user.emailVerified,true);
 await auth({action:'reset',token:token('reset',Date.now()-1000),password:password+'new'},{},400);
 const reset=token('reset');
 const concurrent=await Promise.all([1,2].map(()=>fetch(origin+'/api/auth',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.240'},body:JSON.stringify({action:'reset',token:reset,password:password+'new'})})));
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,400]);checks+=2;
 assert.equal((await auth(undefined,{Cookie:cookie})).b.user,null);
 await auth({action:'reset',token:reset,password},{},400);
 await auth({action:'login',email,password},{},400);
 cookie=(await auth({action:'login',email,password:password+'new'})).r.headers.get('set-cookie').split(';')[0];
 await req('/api/market',{action:'register',name:prefix,role:'customer',acceptTerms:true},{Cookie:cookie});
 await req('/api/market',{action:'register',name:prefix+' admin',role:'customer',acceptTerms:true},admin);
 const task=(await req('/api/market',{action:'task',title:prefix,description:'Auth deletion test',category:'Ремонт',city:'Рига',price:'10 €'},{Cookie:cookie})).b;
 const deletion={action:'delete',id:task.id,reason:'Test deletion',basis:'Terms section 3',confirm:'DELETE'};
 const bidder=prefix+'-bidder';owners.add(bidder);
 const insert=db.prepare('INSERT INTO records(id,kind,owner,parent,data,created) VALUES (?,?,?,?,?,?)');
 insert.run(prefix+'-bid','bid',bidder,task.id,'{}',new Date().toISOString());
 insert.run(prefix+'-message','message',bidder,prefix+'-bid',JSON.stringify({description:'Retained chat'}),new Date().toISOString());
 await req('/api/admin',deletion,{Cookie:cookie},403);
 await req('/api/admin',{...deletion,confirm:''},admin,400);
 await req('/api/admin',deletion,admin);
 assert.ok(db.prepare('SELECT id FROM records WHERE id=?').get(prefix+'-message'));
 assert.ok(!(await req('/api/market')).b.records.some(r=>r.id===task.id));
 assert.ok((await req('/api/market',undefined,{Cookie:cookie})).b.records.some(r=>r.id===task.id));
 await req('/api/admin',{...deletion,id:'account:'+admin['oai-authenticated-user-id']},admin,400);
 await req('/api/admin',{...deletion,id:'account:'+owner},admin);
 assert.equal(identity(),undefined);assert.equal((await auth(undefined,{Cookie:cookie})).b.user,null);
 assert.equal(db.prepare("SELECT count(*) AS n FROM records WHERE owner=? AND kind IN ('auth-session','auth-token')").get(owner).n,0);
 await req('/api/admin',{...deletion,action:'restore',id:'account:'+owner},admin,409);
 const spoofEmail=admin['oai-authenticated-user-email'];
 // Claimed admin email must not grant privilege without email proof.
 const existing=db.prepare('SELECT id FROM records WHERE id=?').get('auth-email:'+hash(spoofEmail));
 if(!existing){const spoof=await auth({action:'register',email:spoofEmail,password,name:prefix});owners.add(db.prepare('SELECT owner FROM records WHERE id=?').get('auth-email:'+hash(spoofEmail)).owner);await req('/api/admin',undefined,{Cookie:spoof.r.headers.get('set-cookie').split(';')[0]},403);}
 const rateEmail=prefix+'-rate@example.test';for(let n=0;n<10;n++)await auth({action:'login',email:rateEmail,password},{},400);await auth({action:'login',email:rateEmail,password},{},429);
 const google=await req('/api/auth/google',undefined,{},303);assert.match(google.r.headers.get('location'),/authError=google/);
 await req('/api/auth/google/callback?code=fake&state=fake',undefined,{},303);
 console.log(`PASS: ${checks} auth and deletion responses; sessions, reset replay/expiry, verification, export, admin permissions, throttling and provider configuration.`);
}finally{
 for(const owner of owners){db.prepare('DELETE FROM records WHERE owner=? OR parent=?').run(owner,'account:'+owner);}
 db.close();
}
