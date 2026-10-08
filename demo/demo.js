// SPDX-License-Identifier: Apache-2.0
'use strict';
const api=ScheduleNotesCore,$=selector=>document.querySelector(selector);
let store,preview=null,savedSnapshot=null,batch=Date.now(),previewSequence=0;
const show=(selector,value)=>$(selector).textContent=JSON.stringify(value,null,2);
async function showOutput(){const current=await store.read(),mode=$('#period').value,to=mode==='complete'?'2030-10-03':mode==='missing'?'2030-10-04':'2030-10-31';show('#facts',api.summarizeSales(current,{productId:'P_SYN_001',period:{kind:'report',from:'2030-10-01',to}}));}
async function renderActivity(id,patch={}){const activity={...await store.get('Activity',id),...patch},result=await api.syncActivityTasksAtomic(activity,store);$('#status').textContent=result.status;const host=$('#tasks');host.replaceChildren();for(const task of await store.list('Task')){const card=document.createElement('article');card.textContent=task.title+' · '+task.status;host.append(card);}await showOutput();}
async function refresh(){await showOutput();show('#storageResult',await store.recoveryStatus());}
async function boot(){
 const response=await fetch('fixtures/synthetic.json');if(!response.ok)throw Error('Fixture unavailable');const seed=await response.json();store=api.createIndexedDBStore({name:'schedule-notes-core-synthetic-demo',seed});
 const health=await store.recoveryStatus();show('#storageResult',health);if(health.status!=='HEALTHY'){document.querySelectorAll('button').forEach(button=>{button.disabled=true;});$('#recoveryExport').disabled=false;$('#recoveryExport').onclick=async()=>show('#snapshotResult',await store.exportRecovery());$('#status').textContent='Recovery required. Existing data retained; export for review.';return;}
 const current=await store.read(),{source,...sample}=current.sales[0]||seed.sales[0];$('#input').value=JSON.stringify([{...sample,id:'S_SYN_DEMO_IMPORT',eventDate:'2030-10-06',amount:12,netQuantity:4}],null,2);
 const identity=async(type,query)=>show('#identity',api.resolveIdentity(type,query,await store.read()));
 $('#exact').onclick=()=>identity('Customer',{id:'C_SYN_001'});$('#probable').onclick=()=>identity('Employee',{name:'Synthetic Employee 1'});$('#ambiguous').onclick=()=>identity('Customer',{name:'Synthetic Same Name'});
 $('#period').onchange=showOutput;
 $('#input').oninput=()=>{preview=null;previewSequence++;$('#commit').disabled=true;$('#previewResult').textContent='Input changed; preview invalidated';};
 $('#preview').onclick=async()=>{const sequence=++previewSequence,text=$('#input').value;$('#commit').disabled=true;const result=await api.importPreview({format:'json',text,entityType:'SalesRecord',dataset:await store.read(),sourceId:'SRC_SYN_DEMO',batchId:'BATCH_SYN_DEMO_'+batch});if(sequence!==previewSequence||text!==$('#input').value)return;preview=result;show('#previewResult',{status:result.status,counts:result.counts,matching:result.matching,issues:result.issues,normalizations:result.normalizations});$('#commit').disabled=!['READY','REPEATED_IMPORT'].includes(result.status);};
 $('#commit').onclick=async()=>{if(!preview)return;$('#commit').disabled=true;const result=await api.commitImport(preview,store);$('#commitResult').textContent=result.status;preview=null;batch++;await refresh();};
 $('#active').onclick=()=>renderActivity('A_SYN_001',{approval:'approved',status:'planned'});$('#draft').onclick=()=>renderActivity('A_SYN_002');$('#cancel').onclick=()=>renderActivity('A_SYN_001',{approval:'cancelled'});$('#complete').onclick=()=>renderActivity('A_SYN_004');
 $('#snapshot').onclick=async()=>{savedSnapshot=await store.snapshot();show('#snapshotResult',savedSnapshot);$('#restore').disabled=false;};
 $('#restore').onclick=async()=>{const plan=await api.restorePreview(savedSnapshot,store);show('#storageResult',await api.restoreSnapshot(plan,store));preview=null;$('#commit').disabled=true;await showOutput();};
 $('#migration').onclick=async()=>{const old=await (await fetch('fixtures/legacy-schema1.json')).json(),plan=await api.migrationPreview(old,{targetDataset:await store.read()});show('#migrationResult',{status:plan.status,fromVersion:plan.fromVersion,toVersion:plan.toVersion,counts:plan.counts,warnings:plan.warnings,issues:plan.issues});};
 $('#recoveryExport').onclick=async()=>show('#snapshotResult',await store.exportRecovery());
 await identity('Customer',{id:'C_SYN_001'});await refresh();$('#status').textContent='Persistent synthetic store ready';
}
boot().catch(()=>{$('#status').textContent='Storage unavailable or invalid. No data inferred or reset.';$('#commit').disabled=true;});