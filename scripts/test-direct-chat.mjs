import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://localhost:5175';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
async function request(path,body,token,status=200){
  const response=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Cookie:'gigs_session='+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;
}
const market=(body,token,status)=>request('/api/market',body,token,status);
async function account(label){
 const auth=await request('/api/mobile/auth',{action:'register',name:label,email:`direct-${label}-${Date.now()}@example.test`,password:'Long-test-password-123',acceptTerms:true});
 await market({action:'register',name:label,acceptTerms:true},auth.token);return auth.token;
}
const a=await account('sender'),b=await account('specialist'),c=await account('outsider');
let erasedB=false;
try {
 const profile={action:'profile',title:'Direct chat test',description:'Test profile',category:'Ремонт',city:'Рига',skills:'Repair'};
 await market(profile,b);await market(profile,a);
 const pa=(await market(null,a)).records.find(r=>r.kind==='profile'&&r.mine);
 const pb=(await market(null,b)).records.find(r=>r.kind==='profile'&&r.mine);
 await market({action:'start-chat',id:pb.id},null,401);
 await market({action:'start-chat',id:pb.id},b,403);
 const {conversation}=await market({action:'start-chat',id:pb.id},a);
 assert.equal((await market({action:'start-chat',id:pb.id},a)).conversation.id,conversation.id);
 assert.equal((await market({action:'start-chat',id:pa.id},b)).conversation.id,conversation.id);
 await market({action:'message',parent:conversation.id,description:'Hello specialist'},a);
 const message=(await market(null,b)).records.find(r=>r.kind==='message'&&r.parent===conversation.id);
 assert.equal(message.unread,true);
 for(const token of [c,null])assert.equal((await market(null,token)).records.some(r=>r.id===conversation.id||r.id===message.id),false);
 await market({action:'message',parent:conversation.id,description:'Forbidden'},c,403);
 await market({action:'read-notifications',ids:[message.id]},c);
 assert.equal((await market(null,b)).records.find(r=>r.id===message.id).unread,true);
 await market({action:'read-notifications',ids:[message.id]},b);
 assert.equal((await market(null,b)).records.find(r=>r.id===message.id).unread,false);
 await market({action:'message',parent:conversation.id,description:'Hello customer'},b);
 await market({action:'delete-chat',id:conversation.id,confirm:true},c,403);
 await market({action:'delete-chat',id:conversation.id,confirm:true},a);
 assert.equal((await market(null,a)).records.find(r=>r.id===conversation.id).chatHidden,true);
 assert.equal((await market(null,b)).records.find(r=>r.id===conversation.id).chatHidden,false);
 assert.equal((await market(null,a)).records.some(r=>r.kind==='message'&&r.parent===conversation.id&&r.unread),false);
 await market({action:'message',parent:conversation.id,description:'New message restores conversation'},b);
 assert.equal((await market(null,a)).records.find(r=>r.id===conversation.id).chatHidden,false);
 await market({action:'delete-chat',id:conversation.id,confirm:true},a);
 await market({action:'start-chat',id:pb.id},a);
 assert.equal((await market(null,a)).records.find(r=>r.id===conversation.id).chatHidden,false);
 assert.ok((await request('/api/privacy?export=1',null,a)).records.some(r=>r.description==='Hello customer'||r.data?.description==='Hello customer'));
 await request('/api/privacy',{action:'deactivate'},b);
 await market({action:'message',parent:conversation.id,description:'Unavailable'},a,403);
 await request('/api/privacy',{action:'erase',confirm:'DELETE'},b);
 erasedB=true;
 assert.equal((await market(null,a)).records.some(r=>r.id===conversation.id||r.parent===conversation.id),false);
 console.log('PASS: direct chat, repeat/reverse deduplication, participant isolation, unread state, export, deactivation and erasure');
}finally{for(const token of [a,...(erasedB?[]:[b]),c])await request('/api/privacy',{action:'erase',confirm:'DELETE'},token);}
