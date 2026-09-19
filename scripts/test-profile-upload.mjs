import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5174',id='upload-test-'+Date.now();
const headers={Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':id,'oai-authenticated-user-email':id+'@example.test'};
async function send(body,status=200){const r=await fetch(origin+'/api/market',{method:'POST',headers,body:JSON.stringify(body)});const b=await r.json();assert.equal(r.status,status,JSON.stringify(b));return b;}
try{
 await send({action:'register',name:'Upload test',role:'provider',acceptTerms:true});
 const base={action:'profile',title:'Test service',description:'Test description',category:'Ремонт',city:'Рига',cities:['Рига','Юрмала'],skills:'Test skills',price:'50',transport:true};
 // Real PNG with harmless trailing padding exercises the previous 16KB ceiling.
 const png='data:image/png;base64,'+Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),Buffer.alloc(20000)]).toString('base64');
 await send({...base,photo:png,portfolioImages:[png,png]});
 await send({...base,title:'Updated without files'});
 const data=await (await fetch(origin+'/api/market',{headers})).json(),profile=data.records.find(r=>r.id==='profile:'+id);
 assert.equal(profile.title,'Updated without files');assert.equal(profile.photo,png);assert.deepEqual(profile.portfolioImages,[png,png]);assert.equal(profile.transport,true);assert.deepEqual(profile.cities,base.cities);
 await send({...base,portfolioImages:[{}]},400);
 await send({...base,photo:'data:image/svg+xml;base64,PHN2Zz4='},400);
 await send({...base,portfolioImages:Array(9).fill(png)},400);
 await send({...base,photo:'',portfolioImages:[],transport:false});
 const updated=(await (await fetch(origin+'/api/market',{headers})).json()).records.find(r=>r.id==='profile:'+id);
 assert.equal(updated.photo,'');assert.deepEqual(updated.portfolioImages,[]);assert.equal(updated.transport,false);
 console.log('PASS: photo and gallery uploads above 16KB, updates preserve images, city/transport fields, invalid uploads rejected, explicit clearing.');
}finally{await fetch(origin+'/api/privacy',{method:'POST',headers,body:JSON.stringify({action:'erase',confirm:'DELETE'})});}
