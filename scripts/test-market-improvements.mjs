import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://localhost:5175';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
async function call(path,body,token,status=200){
 const response=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Cookie:'gigs_session='+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;
}
const market=(body,token,status)=>call('/api/market',body,token,status);
const tokens=[];
async function account(label){
 const auth=await call('/api/mobile/auth',{action:'register',name:label,email:`improvements-${label}-${crypto.randomUUID()}@example.test`,password:'Long-test-password-123',acceptTerms:true});
 tokens.push(auth.token);await market({action:'register',name:label,acceptTerms:true},auth.token);return auth.token;
}
const common={title:'Improvements test',description:'A useful test description',category:'Ремонт',city:'Рига',dateFrom:'2030-04-10',dateTo:'2030-04-14'};
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHt8AAAAASUVORK5CYII=';
try {
 const a=await account('customer'),b=await account('specialist'),c=await account('outsider');
 await market({action:'profile',...common,skills:'Repair',available:false},b);
 const profile=(await market(null,b)).records.find(r=>r.kind==='profile'&&r.mine);
 assert.equal(profile.available,false);
 await market({action:'profile',...common,skills:'Repair',available:true},b);
 assert.equal((await market(null,a)).records.find(r=>r.id===profile.id).available,true);
 await market({action:'favorite',id:profile.id,enabled:true},a);
 assert.equal((await market(null,a)).records.find(r=>r.id===profile.id).favorite,true);
 assert.equal((await market(null,c)).records.find(r=>r.id===profile.id).favorite,false);
 await market({action:'favorite',id:profile.id,enabled:false},a);
 assert.equal((await market(null,a)).records.find(r=>r.id===profile.id).favorite,false);
 await market({action:'task',...common,images:[photo]},a);
 const task=(await market(null,a)).records.find(r=>r.kind==='task'&&r.mine);
 await market({action:'bid',parent:task.id,description:'Can help'},b);
 const bid=(await market(null,a)).records.find(r=>r.kind==='bid'&&r.parent===task.id);
 await market({action:'choose',id:bid.id},a);
 await market({action:'message',parent:bid.id,description:'Original chat'},b);
 const edit={action:'task',...common,id:task.id,title:'Edited task',dateTo:'2030-04-20',images:[]};
 await market(edit,c,403);
 await market(edit,a);
 const edited=(await market(null,a)).records.find(r=>r.id===task.id);
 assert.equal(edited.title,'Edited task');assert.equal(edited.status,'active');assert.equal(edited.chosen,bid.id);assert.equal(edited.dateTo,'2030-04-20');assert.deepEqual(edited.images,[]);
 assert.ok((await market(null,b)).records.some(r=>r.kind==='message'&&r.parent===bid.id));
 await market({action:'favorite',id:task.id,enabled:true},b);
 const {conversation}=await market({action:'start-chat',id:profile.id},a);
 await market({action:'message',parent:conversation.id,description:'Direct message'},a);
 const recipient=(await market(null,b)).records;
 assert.ok(recipient.some(r=>r.id===conversation.id));assert.ok(recipient.some(r=>r.parent===conversation.id&&r.unread));
 await market({action:'message',parent:conversation.id,description:'Direct message'},a,429);
 await market({action:'block-chat',id:conversation.id,enabled:true},c,403);
 await market({action:'block-chat',id:conversation.id,enabled:true},b);
 assert.equal((await market(null,b)).records.find(r=>r.id===conversation.id).blockedByMe,true);
 assert.equal((await market(null,a)).records.find(r=>r.id===bid.id).communicationBlocked,true);
 for(const [token,parent] of [[a,conversation.id],[b,conversation.id],[a,bid.id]])await market({action:'message',parent,description:'Blocked'},token,403);
 await market({action:'start-chat',id:profile.id},a,403);
 await market({action:'block-chat',id:conversation.id,enabled:false},a);
 await market({action:'message',parent:conversation.id,description:'Still blocked'},a,403);
 await market({action:'block-chat',id:conversation.id,enabled:false},b);
 await market({action:'message',parent:conversation.id,description:'Unblocked'},a);
 const results=await Promise.all(Array.from({length:40},async(_,i)=>{
   const response=await fetch(origin+'/api/market',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:'gigs_session='+a},body:JSON.stringify({action:'message',parent:conversation.id,description:'Rate test '+i})});
   assert.ok([200,429].includes(response.status));return response.status;
 }));
 assert.ok(results.includes(429));assert.ok(results.filter(status=>status===200).length<=30);
 await market({action:'complete',id:task.id},a);await market(edit,a,403);
 const exported=await call('/api/privacy?export=1',null,b);
 assert.ok(exported.records.some(r=>r.kind==='favorite'));
 console.log('PASS: persistent private favorites, availability, editing ownership and status preservation, inbox records, two-way blocking and unblock ownership, atomic spam quota, duplicate messages, export');
}finally{for(const token of tokens)await call('/api/privacy',{action:'erase',confirm:'DELETE'},token);}
