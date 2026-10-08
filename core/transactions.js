// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,t=node?require('./task.js'):root.ScheduleCoreV2.task;
 async function syncActivityTasksAtomic(activity,store){
  const committed=await store.transaction(draft=>{const result=t.syncActivityTasks(activity,draft.tasks,{...draft,activities:[...draft.activities.filter(x=>x.id!==activity.id),activity]});if(!['VALID','NO_CHANGE'].includes(result.status)){const error=new Error('INVALID_INPUT');error.status='INVALID_INPUT';error.issues=result.issues;throw error;}draft.activities=draft.activities.filter(x=>x.id!==activity.id);draft.activities.push(structuredClone(activity));draft.tasks=result.tasks;return {taskCount:result.tasks.length};});
  return {status:committed.status==='COMMITTED'?'COMPLETE':'FAILED',commitStatus:committed.status,taskCount:committed.status==='COMMITTED'?committed.result.taskCount:null,issues:committed.issues||[]};
 }
 const api={syncActivityTasksAtomic};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).transactions=api;
})(globalThis);
