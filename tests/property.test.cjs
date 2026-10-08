// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),api=require('../core/index.js'),state=require('../core/state.js'),{generate}=require('../generator.cjs');
function random(seed){let value=seed>>>0;return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
const rng=random(0x50345359),withoutSource=row=>{const {source,...fact}=row;return fact;};
test('seeded numeric boundaries never silently turn invalid or unknown amounts into zero',()=>{
 const values=[null,0,-0,Number.MAX_VALUE,Number.MIN_VALUE,Infinity,-Infinity,NaN,'0','',undefined,...Array.from({length:80},()=>Math.floor(rng()*100000))],data=generate();
 for(const amount of values){const row={...data.sales[0],amount},checked=api.validateRecord('SalesRecord',row,data);assert.equal(checked.valid,amount===null||typeof amount==='number'&&Number.isFinite(amount));if(checked.valid){const dataset=generate();dataset.sales=[row];const output=api.summarizeSales(dataset,{productId:row.productId,period:{kind:'report',from:'2030-10-01',to:'2030-10-01'}});assert.equal(output.value,amount===0?0:amount);}}
});
test('seeded date and role boundaries reject impossible dates and cross-role periods',()=>{
 const invalid=['','2030-02-30','2030-13-01','2030-00-01','2030-01-00','2030-1-01','2030-01-01T00:00:00Z',null,0];
 for(let n=0;n<40;n++)invalid.push('2030-'+String(13+Math.floor(rng()*50)).padStart(2,'0')+'-01');
 for(const from of invalid)assert.equal(api.validatePeriod({kind:'report',from,to:'2030-12-31'}).valid,false);
 for(const kind of ['event','plan','observation','unknown',null])assert.equal(api.validatePeriod({kind,from:'2030-01-01',to:'2030-01-02'},'report').valid,false);
 assert.equal(api.validatePeriod({kind:'report',from:'2032-02-29',to:'2032-02-29'}).valid,true);
});
test('Unicode, Chinese, symbols and long synthetic text preserve exact IDs without name promotion',()=>{
 for(const name of ['Synthetic 中文🧪','Synthetic e\u0301','Synthetic é','Synthetic <>&"\n','Synthetic '+ 'x'.repeat(50000)]){const data=generate();data.hospitals[0].name=name;assert.equal(api.validateDataset(data).valid,true);assert.equal(api.resolveIdentity('Hospital',{name},data).quality,'PROBABLE');assert.equal(api.resolveIdentity('Hospital',{id:'H_SYN_001'},data).id,'H_SYN_001');}
});
test('seeded repeated IDs and cross-hospital same names cannot produce accidental exact identity',()=>{
 for(let n=0;n<60;n++){const data=generate(),hospitalId=rng()<.5?'H_SYN_001':'H_SYN_002',result=api.resolveIdentity('Department',{name:'Synthetic Shared Department',hospitalId},data);assert.equal(result.quality,'PROBABLE');assert.equal(result.id,null);assert.deepEqual(result.candidates,[hospitalId==='H_SYN_001'?'D_SYN_001':'D_SYN_002']);data.hospitals.push({...data.hospitals[0]});assert.equal(api.resolveIdentity('Hospital',{id:'H_SYN_001'},data).quality,'AMBIGUOUS');}
});
test('future schemas, unknown enums and duplicate records fail before writes',async()=>{
 const store=api.createMemoryStore(generate()),before=await store.read();
 for(const schemaVersion of [0,3,999,null,'2'])assert.equal((await store.writeAtomic({...before,schemaVersion})).status,'INVALID_INPUT');
 for(const status of ['',null,'future',false])assert.equal(api.validateRecord('Task',{...before.tasks[0],status},before).valid,false);
 const duplicate=structuredClone(before);duplicate.tasks.push({...duplicate.tasks[0]});assert.equal((await store.writeAtomic(duplicate)).status,'INVALID_INPUT');assert.deepEqual(await store.read(),before);
});
test('JSON prototype pollution and forbidden object graph inputs cannot enter public storage',async()=>{
 const payloads=[JSON.parse('{"__proto__":{"syntheticMarker":true}}'),JSON.parse('{"constructor":{"prototype":{"syntheticMarker":true}}}'),{nested:{prototype:{syntheticMarker:true}}}];
 for(const payload of payloads){assert.equal(state.guard(payload).valid,false);const data={...generate(),extra:payload};assert.equal((await api.createMemoryStore(generate()).writeAtomic(data)).status,'INVALID_INPUT');}
 assert.equal({}.syntheticMarker,undefined);
});
test('duplicate JSON rows classify without multiplying facts; conflicting duplicate blocks atomically',async()=>{
 const data=generate(),row={...withoutSource(data.sales[0]),id:'S_SYN_PROPERTY'},options={format:'json',entityType:'SalesRecord',dataset:data,sourceId:'SRC_SYN_PROPERTY',batchId:'BATCH_SYN_PROPERTY'};
 for(const count of [2,3,8,17]){const plan=await api.importPreview({...options,text:JSON.stringify(Array.from({length:count},()=>({...row})))});assert.equal(plan.status,'READY');assert.equal(plan.counts.valid,1);assert.equal(plan.counts.duplicate,count-1);}
 const store=api.createMemoryStore(data),plan=await api.importPreview({...options,text:JSON.stringify([row,{...row,amount:31}])});assert.equal(plan.status,'BLOCKED');assert.equal((await api.commitImport(plan,store)).status,'PREVIEW_NOT_READY');assert.deepEqual(await store.read(),data);
});
test('cyclic, excessive-depth and non-finite values are safely classified without accepting unsafe state',()=>{
 const cycle={synthetic:true};cycle.next=cycle;const deeplyNested={};let cursor=deeplyNested;for(let i=0;i<80;i++){cursor.next={};cursor=cursor.next;}
 for(const value of [cycle,deeplyNested,{value:NaN},{value:Infinity},{value:undefined},new Date('2030-01-01')])assert.equal(state.guard(value).valid,false);
});
test('duplicate aliases deduplicate within an owner while rename retains stable identity and probable quality',()=>{
 const data=generate(),entry={entityType:'Hospital',id:'H_SYN_001',namespace:null,alias:'Synthetic Alias 中文'},registry=api.matching.createAliasRegistry(data,[entry,{...entry,alias:'  SYNTHETIC   Alias 中文  '}]);assert.equal(registry.status,'COMPLETE');assert.equal(registry.aliases.length,1);
 data.hospitals[0].name='Synthetic Renamed Hospital';const result=api.matching.candidates('Hospital',{name:entry.alias},data,{aliases:registry.aliases,threshold:1});assert.equal(result.quality,'PROBABLE');assert.equal(result.id,null);assert.deepEqual(result.candidates.map(x=>x.id),['H_SYN_001']);assert.equal(api.resolveIdentity('Hospital',{id:'H_SYN_001'},data).quality,'EXACT');
});
test('cross-hospital same alias remains isolated and unsafe alias ownership is rejected',()=>{
 const data=generate(),entries=[{entityType:'Department',id:'D_SYN_001',namespace:'H_SYN_001',alias:'Synthetic Shared Alias'},{entityType:'Department',id:'D_SYN_002',namespace:'H_SYN_002',alias:'Synthetic Shared Alias'}],registry=api.matching.createAliasRegistry(data,entries);assert.equal(registry.status,'COMPLETE');
 for(const namespace of ['H_SYN_001','H_SYN_002']){const result=api.matching.candidates('Department',{name:'Synthetic Shared Alias',namespace},data,{aliases:registry.aliases,threshold:1});assert.equal(result.quality,'PROBABLE');assert.equal(result.id,null);assert.deepEqual(result.candidates.map(x=>x.id),[namespace==='H_SYN_001'?'D_SYN_001':'D_SYN_002']);}
 for(const entry of [{...entries[0],namespace:null},{...entries[0],namespace:'H_SYN_002'},{...entries[0],alias:'x'.repeat(4097)}])assert.equal(api.matching.createAliasRegistry(data,[entry]).status,'FAILED');
});
test('seeded Unicode candidate scoring is bounded, symmetric and never claims exact matching',()=>{
 const names=['Synthetic 中文','Synthetic 🧪','Synthetic e\u0301','Synthetic é','  Ｓｙｎｔｈｅｔｉｃ   Hospital  ','Synthetic <>&'];
 for(let n=0;n<80;n++){const a=names[Math.floor(rng()*names.length)],b=names[Math.floor(rng()*names.length)],score=api.matching.score(a,b);assert.ok(score>=0&&score<=1);assert.equal(score,api.matching.score(b,a));const data=generate();data.hospitals[0].name=a;const result=api.matching.candidates('Hospital',{name:a},data);assert.notEqual(result.quality,'EXACT');assert.equal(result.id,null);}
 assert.equal(api.matching.normalize(null),'');assert.equal(api.matching.score('',null),0);
});
