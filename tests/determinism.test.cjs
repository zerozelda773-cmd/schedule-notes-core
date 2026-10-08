// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),api=require('../core/index.js'),state=require('../core/state.js'),{generate}=require('../generator.cjs'),{schema1}=require('../fixtures/synthetic/reliability.cjs');
const timestamp='2030-01-01T00:00:00.000Z',withoutSource=row=>{const {source,...fact}=row;return fact;};
test('identical Activity input produces identical derived stable task IDs and task hashes',async()=>{
 const data=generate(),a=api.syncActivityTasks(data.activities[0],data.tasks,data),b=api.syncActivityTasks(structuredClone(data.activities[0]),structuredClone(data.tasks),structuredClone(data));assert.deepEqual(a,b);assert.equal(await state.hash(a),await state.hash(b));
});
test('explicit migration output, classification and backup are deterministic independently of duration',async()=>{
 const a=await api.migrationPreview(schema1(),{targetDataset:generate()}),b=await api.migrationPreview(schema1(),{targetDataset:generate()});
 for(const key of ['status','dataset','counts','issues','warnings','sourceHash','baseRevision','backup'])assert.deepEqual(a[key],b[key],key);assert.equal(await state.hash(a.dataset),await state.hash(b.dataset));
 // durationMs and hashes covering duration describe this invocation, not fact identity.
});
test('same single-entity import input yields identical classification, IDs, source and preview hash',async()=>{
 const data=generate(),row={...withoutSource(data.sales[0]),id:'S_SYN_DETERMINISM'},options={format:'json',text:JSON.stringify([row]),entityType:'SalesRecord',dataset:data,sourceId:'SRC_SYN_DETERMINISM',batchId:'BATCH_SYN_DETERMINISM'};
 assert.deepEqual(await api.importPreview(options),await api.importPreview(structuredClone(options)));
});
test('same multi-entity file input yields identical row classifications and committed content',async()=>{
 const data=api.emptyDataset(),files=[{name:'Synthetic hospital.json',entityType:'Hospital',format:'json',text:JSON.stringify([{id:'H_SYN_DETERMINISM',name:'Synthetic Hospital Determinism',synthetic:true}])}],options={dataset:data,files,sourceId:'SRC_SYN_DETERMINISM',batchId:'BATCH_SYN_DETERMINISM'},a=await api.multiImportPreview(options),b=await api.multiImportPreview(structuredClone(options));
 assert.deepEqual(a,b);const sa=api.createMemoryStore(data),sb=api.createMemoryStore(data);assert.equal((await api.commitMultiImport(a,sa)).status,'COMMITTED');assert.equal((await api.commitMultiImport(b,sb)).status,'COMMITTED');assert.equal(await state.hash(await sa.read()),await state.hash(await sb.read()));
});
test('fixed snapshot metadata plus same data yields same checksum and deterministic restore',async()=>{
 const data=generate(),a=await api.exportSnapshot(data,{generatedAt:timestamp}),b=await api.exportSnapshot(structuredClone(data),{generatedAt:timestamp});assert.deepEqual(a,b);assert.equal(a.checksum,b.checksum);
 const first=api.createMemoryStore(api.emptyDataset()),second=api.createMemoryStore(api.emptyDataset()),pa=await api.restorePreview(a,first),pb=await api.restorePreview(b,second);assert.deepEqual(pa,pb);assert.equal((await api.restoreSnapshot(pa,first)).status,'COMMITTED');assert.equal((await api.restoreSnapshot(pb,second)).status,'COMMITTED');assert.deepEqual(await first.read(),await second.read());
});
test('sales output is deterministic and object key order does not change integrity hash',async()=>{
 const data=generate(),options={productId:'P_SYN_001',period:{kind:'report',from:'2030-10-01',to:'2030-10-07'}},a=api.summarizeSales(data,options),b=api.summarizeSales(structuredClone(data),structuredClone(options));assert.deepEqual(a,b);assert.equal(await state.hash(a),await state.hash(Object.fromEntries(Object.entries(b).reverse())));
});
test('alias candidate ordering and scores are deterministic across registry input order',()=>{
 const data=generate(),entries=[{entityType:'Hospital',id:'H_SYN_002',namespace:null,alias:'Synthetic Alias'},{entityType:'Hospital',id:'H_SYN_001',namespace:null,alias:'Synthetic Alias'}],first=api.matching.createAliasRegistry(data,entries),second=api.matching.createAliasRegistry(data,[...entries].reverse());assert.deepEqual(first,second);assert.deepEqual(api.matching.candidates('Hospital',{name:'Synthetic Alias'},data,{aliases:first.aliases}),api.matching.candidates('Hospital',{name:'Synthetic Alias'},data,{aliases:second.aliases}));
});
test('new full backup profile has deterministic default metadata and checksum',async()=>{const data=generate(),first=await api.exportBackup(data),second=await api.exportBackup(structuredClone(data));assert.deepEqual(first,second);assert.equal(first.metadata.incremental.containsDelta,false);assert.equal(first.metadata.payloadMode,'FULL');});
