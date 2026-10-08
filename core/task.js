// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,v=node?require('./validation.js'):root.ScheduleCoreV2.validation;
 function createTask(row,dataset){const checked=v.validateRecord('Task',row,dataset,{checkDuplicate:true});return checked.valid?{status:'VALID',task:structuredClone(row),issues:[]}:{status:'INVALID_INPUT',task:null,issues:checked.issues};}
 function syncActivityTasks(activity,existing,dataset){
 const checked=v.validateRecord('Activity',activity,dataset);const taskErrors=existing.flatMap(t=>v.validateRecord('Task',t,dataset).issues);
 if(!checked.valid||taskErrors.length||new Set(existing.map(t=>t.id)).size!==existing.length)return {status:'INVALID_INPUT',tasks:structuredClone(existing),issues:[...checked.issues,...taskErrors,...(new Set(existing.map(t=>t.id)).size!==existing.length?[{code:'DUPLICATE_RECORD'}]:[])]};
 const owned=existing.filter(t=>t.activityId===activity.id),rest=existing.filter(t=>t.activityId!==activity.id);
 if(activity.approval==='draft')return {status:'NO_CHANGE',tasks:structuredClone(existing),issues:[]};
 if(activity.approval==='cancelled'||activity.status==='cancelled')return {status:'VALID',tasks:[...rest,...owned.map(t=>({...t,status:t.status==='done'?'done':'cancelled'}))],issues:[]};
 const tasks=['prepare','execute','review'].map(kind=>{const prior=owned.find(t=>t.kind===kind);return {...(prior||{id:activity.id+'_'+kind.toUpperCase(),kind,activityId:activity.id,customerId:null,productId:null,synthetic:activity.synthetic,source:activity.source}),title:kind+': '+activity.title,dueDate:activity.eventDate,status:prior?.status==='done'||prior?.status==='cancelled'?prior.status:activity.status==='completed'?'done':'pending'};});
 return {status:'VALID',tasks:[...rest,...tasks],issues:[]};}
 const api={createTask,syncActivityTasks};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).task=api;
})(globalThis);
