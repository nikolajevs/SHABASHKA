import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://localhost:5175';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
async function send(path,body,token){const response=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Cookie:'gigs_session='+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;}
async function account(label){const auth=await send('/api/mobile/auth',{action:'register',name:'No prices test',email:`price-${label}-${Date.now()}@example.test`,password:'Long-test-password-123',acceptTerms:true});await send('/api/market',{action:'register',name:'Test '+label,acceptTerms:true},auth.token);return auth.token;}
const customer=await account('customer'),provider=await account('provider');
const common={title:'No financial fields test',description:'Test service description',category:'Ремонт',city:'Рига',dateFrom:'2030-05-10',dateTo:'2030-05-14'};
await send('/api/market',{action:'task',...common},customer);
await send('/api/market',{action:'profile',...common,skills:'Repair',price:'999',budget:'123'},provider);
const task=(await send('/api/market',null,customer)).records.find(r=>r.kind==='task'&&r.mine&&r.title===common.title);
assert.ok(task);
assert.equal(task.dateFrom,common.dateFrom);
assert.equal(task.dateTo,common.dateTo);
const invalid=await fetch(origin+'/api/market',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:'gigs_session='+customer},body:JSON.stringify({action:'task',...common,title:'Invalid date test',dateFrom:'2030-05-20',dateTo:'2030-05-10'})});
assert.notEqual(invalid.status,200);
await send('/api/market',{action:'bid',parent:task.id,description:'I can help',price:'999'},provider);
const rows=(await send('/api/market',null,provider)).records;
await send('/api/market',{action:'profile',...common,skills:'Repair'},customer);
await send('/api/market',{action:'task',...common,title:'Provider also requests help'},provider);
const reverseTask=(await send('/api/market',null,customer)).records.find(r=>r.kind==='task'&&r.title==='Provider also requests help');
assert.ok(reverseTask);
await send('/api/market',{action:'bid',parent:reverseTask.id,description:'Customer also offers help'},customer);
const selfBid=await fetch(origin+'/api/market',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:'gigs_session='+customer},body:JSON.stringify({action:'bid',parent:task.id,description:'Self bid must fail'})});
assert.notEqual(selfBid.status,200);
assert.equal((await send('/api/market',null,customer)).user.registered,true);
for(const row of rows.filter(r=>r.id===task.id||(r.mine&&['profile','bid'].includes(r.kind)))){
 for(const key of ['price','budget','budgetCents','currency'])assert.equal(Object.hasOwn(row,key),false);
}
console.log('PASS: both accounts create tasks, profiles and bids without switching roles; self-bids rejected; date ranges and no-price responses verified');
