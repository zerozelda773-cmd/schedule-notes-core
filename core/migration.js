// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,u=node?require('./state.js'):root.ScheduleCoreV2.state,c=node?require('./contracts.js'):root.ScheduleCoreV2.contracts,p=node?require('./period.js'):root.ScheduleCoreV2.period,snap=node?require('./snapshot.js'):root.ScheduleCoreV2.snapshot;
 const migrationRegistry=u.frozen([{fromVersion:1,toVersion:2,status:'EXPERIMENTAL',id:'schema-1-to-2-explicit-fields'}]);
 async function migrationPreview(input,{targetDataset,toVersion=2}={}){
  const started=Date.now(),issues=[],warnings=[];let source=input;
  const safety=u.guard(input);if(!safety.valid)return u.frozen({status:'BLOCKED',issues:safety.issues});
  if(input?.records){const checked=await snap.validateSnapshot(input,{allowLegacy:true});if(!checked.valid)return u.frozen({status:'BLOCKED',issues:checked.issues});source=input.records;}
  if(!source||source.synthetic!==true||![1,2].includes(source.schemaVersion)||toVersion!==2)return u.frozen({status:'BLOCKED',issues:[{code:'UNSUPPORTED_MIGRATION'}]});
  if(targetDataset&&!u.checkDataset(targetDataset).valid)return u.frozen({status:'BLOCKED',issues:[{code:'INVALID_TARGET_CONTEXT'}]});
  const next=c.emptyDataset(),sourceHash=await u.hash(source),counts={read:0,changed:0,skipped:0,rejected:0};
  if(source.schemaVersion===2){const checked=u.checkDataset(source);issues.push(...checked.issues);Object.assign(next,u.clone(source));counts.read=Object.values(c.entities).reduce((n,d)=>n+(Array.isArray(source[d.collection])?source[d.collection].length:0),0);}
  else{
   const collections=Object.values(c.entities).map(d=>d.collection),allowed=['schemaVersion','synthetic','generatorVersion','seed','sourcePolicy','importBatches','manualTasks',...collections];
   for(const key of Object.keys(source))if(!allowed.includes(key))issues.push({code:'UNKNOWN_LEGACY_FIELD',field:key});
   if(source.importBatches?.length)issues.push({code:'LEGACY_IMPORT_HISTORY_REQUIRES_EXPLICIT_MAPPING'});
   if(source.tasks&&source.manualTasks)issues.push({code:'AMBIGUOUS_TASK_COLLECTION'});
   for(const [type,def] of Object.entries(c.entities)){
    const rows=type==='Task'?(source.tasks??source.manualTasks):source[def.collection];
    if(!Array.isArray(rows)){issues.push({code:'MISSING_LEGACY_COLLECTION',field:def.collection});continue;}
    for(let index=0;index<rows.length;index++){
     counts.read++;const original=rows[index];if(!original||typeof original!=='object'||Array.isArray(original)||original.synthetic!==true){issues.push({code:'INVALID_LEGACY_RECORD',entityType:type,rowIndex:index+1});counts.rejected++;continue;}
     const row=u.clone(original),extras={Hospital:['hospitalName'],Department:['departmentName'],Employee:['employeeName'],Customer:['customerName'],Product:['productName'],SalesRecord:['date','matchQuality'],EmployeePlanRecord:['month'],Activity:['hospitalName','departmentId','departmentName','applicantId','applicantName','startTime','endTime','productId','expense'],Task:['sourceType'],Visit:['date'],ObservationPeriod:[]}[type];
     const unknown=Object.keys(row).filter(k=>!Object.hasOwn(def.fields,k)&&!extras.includes(k));if(unknown.length){issues.push({code:'UNKNOWN_LEGACY_RECORD_FIELD',entityType:type,id:row.id,fields:unknown});counts.rejected++;continue;}
     const names={Hospital:'hospitalName',Department:'departmentName',Employee:'employeeName',Customer:'customerName',Product:'productName'};if(names[type]&&Object.hasOwn(row,names[type])){if(row.name!==undefined&&row.name!==row[names[type]])issues.push({code:'CONFLICTING_LEGACY_NAME',id:row.id});row.name=row[names[type]];}
     if(Object.hasOwn(row,'date')){if(row.eventDate!==undefined&&row.eventDate!==row.date)issues.push({code:'CONFLICTING_LEGACY_DATE',id:row.id});row.eventDate=row.date;}
     if(type==='EmployeePlanRecord'&&Object.hasOwn(row,'month')){let period=null;if(/^\d{4}-\d{2}$/.test(row.month)&&p.validDate(row.month+'-01')){let last=31;while(!p.validDate(row.month+'-'+last))last--;period={kind:'plan',from:row.month+'-01',to:row.month+'-'+last};}if(!period)issues.push({code:'INVALID_LEGACY_MONTH',id:row.id});if(row.planPeriod!==undefined&&u.canonical(row.planPeriod)!==u.canonical(period))issues.push({code:'CONFLICTING_LEGACY_PERIOD',id:row.id});row.planPeriod=period;}
     if(type==='Activity'){
      const approvals={'已批准':'approved','草稿':'draft','已取消':'cancelled'};if(Object.hasOwn(approvals,row.approval))row.approval=approvals[row.approval];
      if(!Object.hasOwn(row,'eventDate')||!Object.hasOwn(row,'endDate')||!Object.hasOwn(row,'status'))issues.push({code:'ACTIVITY_PERIOD_STATUS_MAPPING_REQUIRED',id:row.id});
      if(Object.hasOwn(row,'expense')){if(row.expenseAmount!==undefined&&row.expenseAmount!==row.expense)issues.push({code:'CONFLICTING_LEGACY_AMOUNT',id:row.id});row.expenseAmount=row.expense;}
     }
     if(type==='Task'&&Object.hasOwn(row,'sourceType')){if(row.kind!==undefined&&row.kind!==row.sourceType)issues.push({code:'CONFLICTING_LEGACY_TASK_KIND',id:row.id});row.kind=row.sourceType;}
     for(const key of extras)if(Object.hasOwn(row,key)){delete row[key];warnings.push({code:'EXPLICIT_LEGACY_FIELD_MAPPING',entityType:type,id:row.id,field:key});}
     if(!Object.hasOwn(row,'source'))row.source={sourceId:'SRC_SYN_MIGRATION',fingerprint:sourceHash,rowIndex:index+1};
     next[def.collection].push(row);counts.changed++;
    }
   }
   const checked=u.checkDataset(next);issues.push(...checked.issues);counts.rejected+=new Set(checked.issues.map(x=>x.id).filter(Boolean)).size;
  }
  const backup={schemaVersion:source.schemaVersion,apiVersion:u.apiVersion,records:u.clone(source),provenance:{synthetic:true,sourceIds:[]},generatedAt:'2030-01-01T00:00:00.000Z'};backup.checksum=await u.hash(backup);
  if(source.schemaVersion===2)counts.skipped=counts.read;
  const plan={status:issues.length?'BLOCKED':source.schemaVersion===2?'NO_CHANGE':'READY',fromVersion:source.schemaVersion,toVersion:2,sourceHash,baseRevision:targetDataset?await u.hash(targetDataset):null,backup,dataset:issues.length?null:next,counts,recordsRead:counts.read,recordsChanged:counts.changed,recordsSkipped:counts.skipped,recordsRejected:counts.rejected,warnings,errors:issues,issues,durationMs:Date.now()-started,result:issues.length?'VALIDATION_FAILED':'DRY_RUN_VALID'};plan.planHash=await u.hash(plan);return u.frozen(plan);
 }
 async function commitMigration(plan,store){
  if(!plan||!['READY','NO_CHANGE'].includes(plan.status))return {status:'PREVIEW_NOT_READY'};
  const {planHash,...payload}=plan;if(planHash!==await u.hash(payload))return {status:'TAMPERED_PREVIEW'};
  if(plan.baseRevision===null)return {status:'TARGET_CONTEXT_REQUIRED'};
  const result=await store.writeAtomic(plan.dataset,{expectedRevision:plan.baseRevision});return {...result,fromVersion:plan.fromVersion,toVersion:plan.toVersion,counts:plan.counts,recordsRead:plan.recordsRead,recordsChanged:plan.recordsChanged,recordsSkipped:plan.recordsSkipped,recordsRejected:plan.recordsRejected,warnings:plan.warnings,errors:result.issues||[],durationMs:plan.durationMs,result:result.status};
 }
 const api={migrationRegistry,migrationPreview,commitMigration};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).migration=api;
})(globalThis);
