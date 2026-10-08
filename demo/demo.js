// SPDX-License-Identifier: Apache-2.0
'use strict';
const api=ScheduleNotesCore,$=s=>document.querySelector(s);
let dataset,store,preview=null,tasks=[],batch=1,previewSequence=0;
const show=(selector,value)=>$(selector).textContent=JSON.stringify(value,null,2);
async function showOutput(){const current=await store.read(),mode=$('#period').value,to=mode==='complete'?'2030-10-03':mode==='missing'?'2030-10-04':'2030-10-31';show('#facts',api.summarizeSales(current,{productId:'P_SYN_001',period:{kind:'report',from:'2030-10-01',to}}));}
function renderActivity(activity){const result=api.syncActivityTasks(activity,tasks,dataset);tasks=result.tasks;$('#status').textContent=result.status+' · '+tasks.length+' tasks';const host=$('#tasks');host.replaceChildren();for(const task of tasks){const card=document.createElement('article');card.textContent=task.title+' · '+task.status;host.append(card);}}
async function boot(){const response=await fetch('fixtures/synthetic.json');if(!response.ok)throw Error('Fixture unavailable');dataset=await response.json();if(!api.validateDataset(dataset,{requireSynthetic:true}).valid)throw Error('Invalid fixture');store=api.createMemoryStore(dataset);
 const {source,...sample}=dataset.sales[0];$('#input').value=JSON.stringify([{...sample,id:'S_SYN_DEMO_IMPORT',eventDate:'2030-10-06',amount:12,netQuantity:4}],null,2);
 const identity=(type,query)=>show('#identity',api.resolveIdentity(type,query,dataset));
 $('#exact').onclick=()=>identity('Customer',{id:'C_SYN_001'});$('#probable').onclick=()=>identity('Employee',{name:'Synthetic Employee 1'});$('#ambiguous').onclick=()=>identity('Customer',{name:'Synthetic Same Name'});
 $('#period').onchange=showOutput;
 $('#input').oninput=()=>{preview=null;previewSequence++;$('#commit').disabled=true;$('#previewResult').textContent='Input changed; preview invalidated';};
 $('#preview').onclick=async()=>{const sequence=++previewSequence,text=$('#input').value;$('#commit').disabled=true;const result=await api.importPreview({format:'json',text,entityType:'SalesRecord',dataset:await store.read(),sourceId:'SRC_SYN_001',batchId:'BATCH_SYN_DEMO_'+batch});
 if(sequence!==previewSequence||text!==$('#input').value)return;preview=result;show('#previewResult',{status:preview.status,counts:preview.counts,matching:preview.matching,issues:preview.issues,normalizations:preview.normalizations});$('#commit').disabled=!['READY','REPEATED_IMPORT'].includes(preview.status);};
 $('#commit').onclick=async()=>{if(!preview)return;$('#commit').disabled=true;const result=await api.commitImport(preview,store);$('#commitResult').textContent=result.status;preview=null;batch++;await showOutput();};
 $('#active').onclick=()=>renderActivity(dataset.activities[0]);$('#draft').onclick=()=>{tasks=[];renderActivity(dataset.activities[1]);};$('#cancel').onclick=()=>renderActivity({...dataset.activities[0],approval:'cancelled'});$('#complete').onclick=()=>{tasks=[];renderActivity(dataset.activities[3]);};
 identity('Customer',{id:'C_SYN_001'});await showOutput();renderActivity(dataset.activities[0]);
}
boot().catch(()=>{$('#status').textContent='INVALID_INPUT: demo unavailable; no facts inferred';$('#commit').disabled=true;});
