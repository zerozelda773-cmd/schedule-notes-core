/* SPDX-License-Identifier: Apache-2.0 */
'use strict';
let fixture, tasks=[];
const store=ScheduleCore.createStore(localStorage);
function render(state) {
  tasks=ScheduleCore.activityTasks({...fixture.activities[0],approvalStatus:state},tasks);
  document.querySelector('#status').textContent=`${state} · ${tasks.length} tasks`;
  const container=document.querySelector('#tasks');container.replaceChildren();
  for(const task of tasks) {const card=document.createElement('article');const title=document.createElement('h2');title.textContent=task.title;const detail=document.createElement('p');detail.textContent=`${task.dueDate} · ${task.status}`;card.append(title,detail);container.append(card);}
}
async function boot(){
  const response=await fetch('fixtures/synthetic.json');if(!response.ok)throw new Error('Fixture unavailable');fixture=await response.json();
  const summary=ScheduleCore.salesSummary(fixture.sales,{productId:'P_SYN_001',from:'2030-10-01',to:'2030-10-31'});
  document.querySelector('#facts').textContent=`Product ${summary.productId}; period ${summary.from} to ${summary.to}; source ${summary.source}; amount ${summary.salesAmount===null?'Unknown':summary.salesAmount}; ${summary.truth}`;
  document.querySelector('#active').onclick=()=>render('已通过');document.querySelector('#draft').onclick=()=>{tasks=[];render('草稿');};document.querySelector('#cancel').onclick=()=>render('已取消');
  document.querySelector('#save').onclick=()=>{try{store.save({synthetic:true,tasks});document.querySelector('#saved').textContent='Saved and read back locally';}catch{document.querySelector('#saved').textContent='Save failed';}};
  const saved=store.load();if(saved?.synthetic===true && Array.isArray(saved.tasks))tasks=saved.tasks;
  render('已通过');
}
boot().catch(()=>{document.querySelector('#status').textContent='Demo unavailable; no facts inferred';});
