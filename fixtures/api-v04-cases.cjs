// SPDX-License-Identifier: Apache-2.0
'use strict';
// An output evaluator only: no baseline update or file-writing operation exists here.
async function evaluatePromoted(api,input){
 const data=structuredClone(input.dataset),time='2030-01-01T00:00:00.000Z',snapshot=await api.exportSnapshot(data,{generatedAt:time}),output={exportSnapshot:snapshot,validateSnapshot:{valid:await api.validateSnapshot(snapshot),invalid:await api.validateSnapshot({...snapshot,checksum:'0'.repeat(64)})}},empty=api.emptyDataset();
 const restoreStore=api.createMemoryStore(empty),plan=await api.restorePreview(snapshot,restoreStore);output.restorePreview=plan;output.restoreSnapshot={committed:await api.restoreSnapshot(plan,restoreStore),stale:await api.restoreSnapshot(plan,restoreStore),blocked:await api.restoreSnapshot({status:'BLOCKED'},restoreStore),readback:await restoreStore.read()};
 const files=[{name:'Synthetic promoted.json',entityType:'Hospital',format:'json',text:JSON.stringify([{id:'H_SYN_PROMOTED',name:'Synthetic Promoted Hospital',synthetic:true}])}],importPlan=await api.multiImportPreview({files,dataset:empty,sourceId:'SRC_SYN_PROMOTED',batchId:'BATCH_SYN_PROMOTED'});output.multiImportPreview=importPlan;
 const importStore=api.createMemoryStore(empty);output.commitMultiImport={committed:await api.commitMultiImport(importPlan,importStore),stale:await api.commitMultiImport(importPlan,importStore),blocked:await api.commitMultiImport({status:'BLOCKED'},importStore),readback:await importStore.read()};
 output.syncActivityTasksAtomic=await api.syncActivityTasksAtomic(data.activities[0],api.createMemoryStore(data));
 const store=api.createMemoryStore(data);output['store.get']={existing:await store.get('Task','T_SYN_001'),missing:await store.get('Task','T_SYN_MISSING')};output['store.list']={tasks:await store.list('Task')};
 const task={...data.tasks[0],id:'T_SYN_PROMOTED',title:'Synthetic Promoted Task'};output['store.put']={committed:await store.put('Task',task),readback:await store.get('Task',task.id)};output['store.delete']={committed:await store.delete('Task',task.id),readback:await store.get('Task',task.id)};
 const before=await store.read();output['store.transaction']={committed:await store.transaction(draft=>{draft.tasks[0].title='Synthetic Transaction';return {updated:1};}),invalid:await store.transaction(null),rolledBack:await store.transaction(draft=>{draft.tasks[0].title='Synthetic Never Committed';throw new Error('Synthetic rollback');}),readback:await store.read(),before};
 output['store.snapshot']=await store.snapshot({generatedAt:time});output['store.restore']={committed:await store.restore(snapshot),readback:await store.read()};
 const metadata=await store.metadata();for(const key of ['createdAt','updatedAt']){if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(metadata[key]))throw new Error('INVALID_TIMESTAMP_CONTRACT');metadata[key]='<valid runtime timestamp>';}
 if(!/^[a-f0-9]{64}$/.test(metadata.checksum))throw new Error('INVALID_CHECKSUM_CONTRACT');metadata.checksum='<64 hex storage-envelope checksum>';output['store.metadata']=metadata;output['store.close']={value:await store.close()};
 function encode(value){if(value===undefined)return {$type:'undefined'};if(value===null||typeof value!=='object')return value;if(Array.isArray(value))return value.map(encode);return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]));}
 return encode(output);
}
module.exports={evaluatePromoted};
