// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path'),{generate}=require('../generator.cjs');
const entry=import(pathToFileURL(path.resolve(__dirname,'../index.mjs')).href);
test('ES Module default and named exports let a real consumer use Core without DOM or Demo',async()=>{
 const module=await entry,api=module.default;assert.equal(typeof globalThis.document,'undefined');assert.equal(module.createClient,api.createClient);assert.equal(module.schemaVersion,2);const result=await api.createClient({dataset:generate()}).query('getCurrentTasks');assert.equal(result.result.status,'COMPLETE');assert.equal(result.result.value.tasks.length,1);
});
test('headless create/edit/save/cancel lifecycle preserves IDs and exposes terminal state',async()=>{
 const api=(await entry).default,seed=generate(),client=api.createClient({dataset:seed}),record={...seed.tasks[0],id:'T_SYN_HEADLESS',title:'Synthetic Headless New'};
 let result=await client.command('createTask',{record});assert.equal(result.result.status,'COMPLETE');assert.deepEqual(result.changes,[{entityType:'Task',id:record.id,action:'CREATE'}]);
 result=await client.command('updateTask',{id:record.id,changes:{title:'Synthetic Headless Saved',dueDate:'2030-10-08'}});assert.equal(result.result.value.id,record.id);assert.equal(result.result.value.title,'Synthetic Headless Saved');
 result=await client.command('cancelTask',{id:record.id});assert.equal(result.result.value.status,'cancelled');assert.equal(result.changes[0].action,'CANCEL');assert.ok(!(await client.query('getCurrentTasks')).result.value.tasks.some(x=>x.id===record.id));
 const rejected=await client.command('updateTask',{id:record.id,changes:{status:'pending'}});assert.equal(rejected.result.status,'FAILED');assert.equal(rejected.result.error.code,'VALIDATION_ERROR');
});
test('headless query reads never change facts and invalid periods use structured errors',async()=>{
 const api=(await entry).default,store=api.createMemoryStore(generate()),client=api.createClient({store}),before=await store.read();
 for(const [name,payload] of [['getCurrentTasks',{}],['getCustomerSummary',{id:'C_SYN_001',hospitalId:'H_SYN_001'}],['getActivityStatus',{id:'A_SYN_001'}],['getSalesSummary',{productId:'P_SYN_001',period:{kind:'report',from:'2030-10-01',to:'2030-10-07'}}],['snapshot',{generatedAt:'2030-01-01T00:00:00.000Z'}]])assert.equal((await client.query(name,payload)).result.status,'COMPLETE');
 assert.deepEqual(await store.read(),before);const failure=await client.query('getSalesSummary',{productId:'P_SYN_001',period:{kind:'plan',from:'2030-10-01',to:'2030-10-07'}});assert.equal(failure.result.status,'FAILED');assert.equal(failure.result.error.code,'PERIOD_INVALID');assert.deepEqual(await store.read(),before);
});
test('headless import preview diagnoses rows, explicit command commits atomically, reimport is no change',async()=>{
 const api=(await entry).default,client=api.createClient(),options={sourceId:'SRC_SYN_HEADLESS',batchId:'BATCH_SYN_HEADLESS',files:[{name:'Synthetic headless.json',entityType:'Hospital',format:'json',text:JSON.stringify([{id:'H_SYN_HEADLESS',name:'Synthetic Headless Hospital',synthetic:true}])}]};
 let result=await client.query('importPreview',options);assert.equal(result.result.value.rows[0].outcome,'CREATE');assert.equal(result.result.value.rows[0].reason[0].code,'NEW_STABLE_ID');let committed=await client.command('importRecords',{plan:result.result.value.plan});assert.equal(committed.result.status,'COMPLETE');assert.equal(committed.changes[0].id,'H_SYN_HEADLESS');
 result=await client.query('importPreview',{...options,batchId:'BATCH_SYN_HEADLESS_SECOND'});assert.equal(result.result.value.rows[0].outcome,'DUPLICATE');committed=await client.command('importRecords',{plan:result.result.value.plan});assert.equal(committed.result.status,'NO_CHANGE');assert.deepEqual(committed.changes,[]);
});
test('headless snapshot preview then restore command restores facts and exposes why unknown stays null',async()=>{
 const api=(await entry).default,seed=generate(),store=api.createMemoryStore(seed),client=api.createClient({store}),snapshot=(await client.query('snapshot',{generatedAt:'2030-01-01T00:00:00.000Z'})).result.value;
 await client.command('updateTask',{id:'T_SYN_001',changes:{title:'Synthetic Changed'}});const preview=await client.query('restorePreview',{snapshot});assert.equal(preview.result.value.status,'READY');assert.equal((await client.command('restoreSnapshot',{plan:preview.result.value})).result.status,'COMPLETE');assert.deepEqual(await store.read(),seed);
 const output=await client.query('getSalesSummary',{productId:'P_SYN_001',period:{kind:'report',from:'2030-10-01',to:'2030-10-07'}}),why=client.why(output);assert.equal(output.result.value.value,null);assert.ok(why.limitations.includes('MISSING_AMOUNT'));assert.deepEqual(why.sourceRecordIds,['S_SYN_001','S_SYN_003','S_SYN_004']);
});
test('headless diagnostics are local, sanitized and observer failure cannot break writes',async()=>{
 const api=(await entry).default,events=[],seed=generate(),client=api.createClient({dataset:seed,onDiagnostic:event=>{events.push(event);throw Error('Synthetic observer failed');}}),record={...seed.tasks[0],id:'T_SYN_OBSERVER',title:'Synthetic Private-Like Text'};
 assert.equal((await client.command('createTask',{record})).result.status,'COMPLETE');assert.equal(events.length,1);assert.ok(!JSON.stringify(events).includes(record.title));assert.deepEqual(Object.keys(events[0]).sort(),['duration','entity','operation','result','warningCount']);assert.equal(events[0].result,'COMPLETE');
 let observed=0;const unsubscribe=client.onDiagnostic(()=>{observed++;});await client.query('getCurrentTasks');unsubscribe();await client.query('getCurrentTasks');assert.equal(observed,1);
});
