// SPDX-License-Identifier: Apache-2.0
'use strict';
// Executed in a fresh headless browser by scripts/browser-test.cjs, never by the demo.
module.exports=async function browserSuite(phase){
 const api=globalThis.ScheduleNotesCore,fixture=await (await fetch('/fixtures/synthetic.json')).json(),results=[];
 const assert=(value,message)=>{if(!value)throw Error(message);},equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 async function check(name,run){await run();results.push({name,status:'PASS'});}
 const open=(name,seed=fixture)=>api.createIndexedDBStore({name,seed});
 const rawDB=name=>new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Raw test DB unavailable'));});
 const cleanupEvents=[];
 function deleteSyntheticDatabase(name,{timeoutMs=5000,onBlocked}={}){
  assert(name.startsWith('Synthetic '),'Cleanup must target an isolated synthetic database');
  return new Promise((resolve,reject)=>{
   const evidence={blocked:false,completed:false,timedOut:false},request=indexedDB.deleteDatabase(name);let settled=false;
   const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);cleanupEvents.push({...evidence});error?reject(error):resolve({...evidence});};
   const timer=setTimeout(()=>{evidence.timedOut=true;finish(Object.assign(Error('Synthetic cleanup timed out'),{code:'SYNTHETIC_CLEANUP_TIMEOUT'}));},timeoutMs);
   request.onsuccess=()=>{evidence.completed=true;finish();};request.onerror=()=>finish(Error('Synthetic cleanup failed'));
   request.onblocked=()=>{evidence.blocked=true;try{onBlocked?.();}catch(error){finish(error);}};
  });
 }
 async function rawWrite(name,edit,abort=false){const db=await rawDB(name);await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),s=tx.objectStore('state'),r=s.get('head');r.onsuccess=()=>{const value=edit(r.result);s.put(value,'head');if(abort)tx.abort();};tx.oncomplete=resolve;tx.onabort=()=>abort?resolve():reject(Error('Unexpected abort'));});db.close();}
 if(phase==='crash-before'||phase==='crash-after'){
  const store=open('Synthetic '+phase);await store.read();
  if(phase==='crash-before'){store.transaction(draft=>{draft.sales[0].amount=49;draft.tasks[0].status='done';globalThis.syntheticCrashReady=true;return new Promise(()=>{});});}
  else{const outcome=await store.transaction(draft=>{draft.sales[0].amount=49;draft.tasks[0].status='done';});assert(outcome.status==='COMMITTED','Native commit failed');globalThis.syntheticCrashReady=true;}
  return new Promise(()=>{});
 }else if(phase==='seed'){
  await check('native browser ESM and headless command/query work without DOM business logic',async()=>{const module=await import('/index.mjs'),client=module.default.createClient({dataset:fixture}),before=await client.query('getCurrentTasks'),commands=await client.command('cancelTask',{id:fixture.tasks[0].id});assert(before.result.status!=='FAILED','ESM query failed');assert(commands.result.status!=='FAILED','ESM command failed');});
  const {runStorageCompatibilitySuite}=await import('/storage-conformance.mjs');
  const legacy=await (await fetch('/fixtures/legacy-schema1.json')).json();let conformanceSequence=0;
  const conformance=await runStorageCompatibilitySuite({name:'native-indexeddb',persistence:'RESTARTABLE',dataset:fixture,legacyDataset:legacy,createHarness:seed=>{const name='Synthetic conformance '+(++conformanceSequence),store=api.createIndexedDBStore({name,seed});return {store,reopen:()=>api.createIndexedDBStore({name,seed}),raw:async()=>{const db=await rawDB(name);try{return await new Promise((resolve,reject)=>{const request=db.transaction('state','readonly').objectStore('state').get('head');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Synthetic raw read failed'));});}finally{db.close();}},corrupt:()=>rawWrite(name,value=>({...value,checksum:'0'.repeat(64)})),cleanup:async()=>{await store.close();await deleteSyntheticDatabase(name);}};}});
  assert(conformance.status==='PASS'&&conformance.passCount===13,'Native adapter conformance failed '+JSON.stringify({conformance,cleanupEvents}));for(const [i,result] of conformance.cases.entries())results.push({name:'adapter conformance: '+result.case,status:result.status,cleanup:cleanupEvents[i]});
  await check('native cleanup waits for blocked notification then verifies actual deletion',async()=>{const name='Synthetic cleanup release',store=open(name);await store.read();await store.close();const blocking=await rawDB(name);try{const evidence=await deleteSyntheticDatabase(name,{onBlocked:()=>blocking.close()});assert(evidence.blocked&&evidence.completed&&!evidence.timedOut,'Blocked cleanup did not settle after real close');}finally{blocking.close();}});
  await check('native cleanup rejects a genuinely held connection at a bounded deadline',async()=>{const name='Synthetic cleanup held',store=open(name);await store.read();await store.close();const blocking=await rawDB(name);let failed=false;try{await deleteSyntheticDatabase(name,{timeoutMs:100});}catch(error){failed=error.code==='SYNTHETIC_CLEANUP_TIMEOUT';}finally{blocking.close();}assert(failed,'Held connection was incorrectly accepted');await deleteSyntheticDatabase(name);});
  await check('fresh persistent store validates seed and metadata',async()=>{const store=open('Synthetic browser');assert(equal(await store.read(),fixture),'Seed changed');assert((await store.metadata()).schemaVersion===2,'Metadata missing');await store.close();});
  await check('reopen preserves IDs, null, zero and source provenance',async()=>{const store=open('Synthetic browser',api.emptyDataset());assert(equal(await store.read(),fixture),'Reopen lost data');await store.close();});
  await check('two windows reading the same revision have exactly one CAS winner',async()=>{
   const a=open('Synthetic browser'),b=open('Synthetic browser');let arrived=0,release;
   const barrier=new Promise(resolve=>{release=resolve;}),snapshots=[];
   try{
    const before=await a.read();await b.read();
    const out=await Promise.all([a,b].map((store,i)=>store.transaction(async d=>{
     snapshots[i]=JSON.stringify(d);d.sales[i].amount=i===0?14:18;
     if(++arrived===2)release();await barrier;
    })));
    assert(snapshots[0]===snapshots[1],'CAS contenders did not read the same revision');
    assert(out.filter(x=>x.status==='COMMITTED').length===1,'Same-revision writes both committed');
    assert(out.filter(x=>x.status==='STALE_PREVIEW').length===1,'Same-revision conflict missing');
    const after=await a.read(),winner=out[0].status==='COMMITTED'?0:1;
    assert(winner===0?after.sales[0].amount===14&&after.sales[1].amount===before.sales[1].amount:after.sales[1].amount===18&&after.sales[0].amount===before.sales[0].amount,'CAS loser partially persisted');
   }finally{await a.close();await b.close();}
  });
  await check('thrown multi-write transaction rolls back before commit',async()=>{const store=open('Synthetic browser'),before=await store.read(),out=await store.transaction(d=>{d.sales[0].amount=21;d.tasks[0].status='done';throw Error('Synthetic crash');});assert(out.status==='TRANSACTION_FAILED','Failure reported success');assert(equal(await store.read(),before),'Partial write');await store.close();});
  await check('native aborted IndexedDB write never changes persistent bytes',async()=>{const store=open('Synthetic browser'),before=await store.read();await rawWrite('Synthetic browser',value=>{value.records.sales[0].amount=23;return value;},true);assert(equal(await store.read(),before),'Aborted write persisted');await store.close();});
  await check('partial invalid draft and future schema cannot persist',async()=>{const store=open('Synthetic browser'),before=await store.read();for(const mutate of [d=>{delete d.sales[0].amount;},d=>{d.tasks[0].status='unexpected';},d=>{d.schemaVersion=3;}])assert((await store.transaction(mutate)).status==='INVALID_INPUT','Invalid persisted');assert(equal(await store.read(),before),'Data replaced');await store.close();});
  await check('snapshot roundtrip and stale restore preserve data',async()=>{const store=open('Synthetic browser'),snapshot=await store.snapshot(),plan=await api.restorePreview(snapshot,store);await store.delete('SalesRecord','S_SYN_002');assert((await api.restoreSnapshot(plan,store)).status==='STALE_PREVIEW','Stale overwrite');assert((await store.restore(snapshot)).status==='COMMITTED','Restore failed');await store.close();});
  await check('corruption detects read-only recovery without empty reset',async()=>{const store=open('Synthetic corrupt');await store.read();const snapshot=await store.snapshot();await rawWrite('Synthetic corrupt',value=>{value.records.sales[0].amount='broken';return value;});assert((await store.recoveryStatus()).status==='RECOVERY_REQUIRED','Corruption hidden');assert((await store.writeAtomic(fixture)).status==='RECOVERY_REQUIRED','Automatic overwrite');const raw=await store.exportRecovery();assert(raw.raw.records.sales[0].amount==='broken','Scene destroyed');assert((await store.recover(snapshot,{expectedChecksum:raw.raw.checksum})).status==='COMMITTED','Recovery failed');assert(equal(await store.read(),fixture),'Bad recovery');await store.close();});
  await check('migration from old schema commits into persistent storage',async()=>{const old=structuredClone(fixture);old.schemaVersion=1;for(const rows of Object.values(old).filter(Array.isArray))for(const row of rows)delete row.source;const store=open('Synthetic migrated',api.emptyDataset()),plan=await api.migrationPreview(old,{targetDataset:await store.read()});assert(plan.status==='READY','Migration blocked');assert((await api.commitMigration(plan,store)).status==='COMMITTED','Migration failed');assert((await store.read()).schemaVersion===2,'Version not marked');await store.close();});
  await check('duplicate import and atomic activity sync persist before restart',async()=>{const store=open('Synthetic restart');const row={...fixture.sales[0],id:'S_SYN_BROWSER_RESTART'};delete row.source;const input={format:'json',text:JSON.stringify([row]),entityType:'SalesRecord',sourceId:'SRC_SYN_BROWSER',batchId:'BATCH_SYN_BROWSER'};const plan=await api.importPreview({...input,dataset:await store.read()});assert((await api.commitImport(plan,store)).status==='COMMITTED','Import failed');assert((await api.syncActivityTasksAtomic(fixture.activities[0],store)).status==='COMPLETE','Sync failed');await store.close();});
  await check('demo uses public APIs and shows exact/ambiguous output',async()=>{document.querySelector('#ambiguous').click();for(let n=0;n<100&&!document.querySelector('#identity').textContent.includes('AMBIGUOUS');n++)await new Promise(resolve=>setTimeout(resolve,10));assert(document.querySelector('#identity').textContent.includes('AMBIGUOUS'),'Demo ambiguity missing');document.querySelector('#exact').click();for(let n=0;n<100&&!document.querySelector('#identity').textContent.includes('EXACT');n++)await new Promise(resolve=>setTimeout(resolve,10));assert(document.querySelector('#identity').textContent.includes('EXACT'),'Demo exact missing');});
 }else if(phase==='restart'){
  await check('process killed before commit retains the original complete state',async()=>{const store=open('Synthetic crash-before',api.emptyDataset());assert(equal(await store.read(),fixture),'Crash left partial write');await store.close();});
  await check('process killed after commit retains both facts and task state',async()=>{const store=open('Synthetic crash-after',api.emptyDataset()),data=await store.read();assert(data.sales[0].amount===49&&data.tasks[0].status==='done','Committed facts lost');assert(data.sales[3].amount===null,'Unknown changed');await store.close();});
  await check('new browser process retains committed import and tasks',async()=>{const store=open('Synthetic restart',api.emptyDataset()),data=await store.read();assert(data.sales.length===5,'Committed fact lost');assert(data.tasks.filter(x=>x.activityId==='A_SYN_001').length===3,'Tasks lost');assert(data.sales[3].amount===null&&data.sales[1].amount===0,'Truth lost');const row={...fixture.sales[0],id:'S_SYN_BROWSER_RESTART'};delete row.source;const plan=await api.importPreview({dataset:data,format:'json',text:JSON.stringify([row]),entityType:'SalesRecord',sourceId:'SRC_SYN_BROWSER',batchId:'BATCH_SYN_BROWSER_AGAIN'});assert(plan.status==='REPEATED_IMPORT','Duplicate not recognized');assert((await api.commitImport(plan,store)).status==='NO_CHANGE','Duplicate added');await store.close();});
  await check('new process retains migrated version and provenance',async()=>{const store=open('Synthetic migrated',api.emptyDataset()),data=await store.read();assert(data.schemaVersion===2&&data.sales.length===4,'Migration lost');assert(data.sales[0].source.sourceId==='SRC_SYN_MIGRATION','Provenance lost');await store.close();});
 }else throw Error('Unknown test phase');
 return results;
};
