// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const definitions=Object.freeze({
  VALIDATION_ERROR:['Input does not satisfy the public contract.',true,'Correct the input and validate it before retrying.'],
  IDENTITY_AMBIGUOUS:['More than one identity candidate exists.',true,'Select an explicit stable ID in the correct namespace.'],
  IDENTITY_UNMATCHED:['The referenced identity is not present.',true,'Supply an existing stable ID; do not infer one from a name.'],
  PERIOD_INVALID:['The period or date does not satisfy the required role.',true,'Supply valid dates and the explicit period role.'],
  STORAGE_FAILURE:['Storage did not commit the requested operation.',true,'Keep the previous state and inspect the storage adapter.'],
  MIGRATION_FAILURE:['Migration could not complete safely.',true,'Keep the source and backup; review the explicit mapping.'],
  IMPORT_CONFLICT:['Import cannot commit the current preview.',true,'Resolve conflicts or obtain a fresh preview before retrying.'],
  RECOVERY_REQUIRED:['Storage requires explicit recovery.',true,'Export recovery evidence and use a validated recovery flow.'],
  UNSUPPORTED_SCHEMA:['The schema version is unsupported.',false,'Use a supported schema or an explicitly supported migration.'],
  UNSUPPORTED_OPERATION:['This operation is not part of the public contract.',false,'Use a supported operation; do not add unsupported fact fields.']
 });
 const operations=Object.freeze(['createTask','updateTask','cancelTask','createActivity','saveDraft','archiveCustomer','importRecords','restoreSnapshot','getCurrentTasks','getCustomerSummary','getActivityStatus','getSalesSummary','importPreview','restorePreview','snapshot','getRecoveryStatus','why','unknown']);
 const entities=Object.freeze(['Hospital','Department','Employee','Customer','Product','SalesRecord','EmployeePlanRecord','Activity','Task','Visit','ObservationPeriod']);
 const fields=Object.freeze(['id','synthetic','source','name','hospitalId','departmentId','employeeId','customerId','productId','activityId','customerIds','eventDate','endDate','title','dueDate','status','kind','approval','amount','netQuantity','expenseAmount','planPeriod','plannedVisits','plannedActivities','from','to','schemaVersion','importBatches']);
 const legacy=Object.freeze({
  AMBIGUOUS_IDENTITY:'IDENTITY_AMBIGUOUS',DUPLICATE_IDENTITY:'IDENTITY_AMBIGUOUS',
  UNMATCHED_IDENTITY:'IDENTITY_UNMATCHED',UNKNOWN_CUSTOMER:'IDENTITY_UNMATCHED',UNKNOWN_PRODUCT:'IDENTITY_UNMATCHED',UNKNOWN_HOSPITAL:'IDENTITY_UNMATCHED',UNKNOWN_EMPLOYEE:'IDENTITY_UNMATCHED',UNKNOWN_ACTIVITY:'IDENTITY_UNMATCHED',UNKNOWN_DEPARTMENT:'IDENTITY_UNMATCHED',MISSING_HOSPITAL:'IDENTITY_UNMATCHED',MISSING_HOSPITAL_NAMESPACE:'IDENTITY_UNMATCHED',
  INVALID_DATE:'PERIOD_INVALID',INVALID_PERIOD:'PERIOD_INVALID',INVALID_PLAN_PERIOD:'PERIOD_INVALID',INVALID_REPORT_PERIOD:'PERIOD_INVALID',
  RECOVERY_REQUIRED:'RECOVERY_REQUIRED',READ_ONLY_RECOVERY:'RECOVERY_REQUIRED',STORAGE_CHECKSUM_MISMATCH:'RECOVERY_REQUIRED',
  UNSUPPORTED_SCHEMA_VERSION:'UNSUPPORTED_SCHEMA',SCHEMA_MISMATCH:'UNSUPPORTED_SCHEMA',
  MIGRATION_BLOCKED:'MIGRATION_FAILURE',MIGRATION_FAILED:'MIGRATION_FAILURE',MIGRATION_REQUIRED_MANUAL:'MIGRATION_FAILURE',
  STALE_PREVIEW:'IMPORT_CONFLICT',TAMPERED_PREVIEW:'IMPORT_CONFLICT',PREVIEW_NOT_READY:'IMPORT_CONFLICT',BATCH_ID_CONFLICT:'IMPORT_CONFLICT',CONFLICTING_INPUT_ROWS:'IMPORT_CONFLICT',EXPLICIT_UPDATE_FINGERPRINT_REQUIRED:'IMPORT_CONFLICT',DUPLICATE_RECORD:'IMPORT_CONFLICT',
  STORAGE_FAILED:'STORAGE_FAILURE',TRANSACTION_FAILED:'STORAGE_FAILURE',INVALID_TRANSACTION:'STORAGE_FAILURE'
 });
 function dataProperty(input,key){let current=input;try{for(let depth=0;current!==null&&(typeof current==='object'||typeof current==='function')&&depth<8;depth++){const descriptor=Object.getOwnPropertyDescriptor(current,key);if(descriptor)return Object.hasOwn(descriptor,'value')?descriptor.value:undefined;current=Object.getPrototypeOf(current);}}catch{/* Invalid error objects must not replace the original operation outcome. */}return undefined;}
 const knownCode=code=>typeof code==='string'&&(Object.hasOwn(definitions,code)||Object.hasOwn(legacy,code));
 function safeContext(input={}){
  const context={},operation=dataProperty(input,'operation'),entity=dataProperty(input,'entity'),field=dataProperty(input,'field');if(operations.includes(operation))context.operation=operation;
  if(entities.includes(entity))context.entity=entity;if(fields.includes(field))context.field=field;
  for(const key of ['rowIndex','fileIndex','recordCount','fromSchema','toSchema']){const value=dataProperty(input,key);if(Number.isSafeInteger(value)&&value>=0)context[key]=value;}
  return Object.freeze(context);
 }
 function coreError(code,context={}){const key=typeof code==='string'&&Object.hasOwn(definitions,code)?code:'VALIDATION_ERROR',definition=definitions[key];return Object.freeze({code:key,message:definition[0],context:safeContext(context),recoverable:definition[1],recommendedAction:definition[2]});}
 function fromLegacy(value,context={},fallback='VALIDATION_ERROR'){
  const codes=[dataProperty(value,'code'),dataProperty(value,'status')],issues=dataProperty(value,'issues'),length=dataProperty(issues,'length');
  if(Array.isArray(issues)&&Number.isSafeInteger(length))for(let index=0;index<Math.min(length,10000);index++)codes.push(dataProperty(dataProperty(issues,String(index)),'code'));
  const chosen=codes.find(knownCode);
  return coreError(typeof chosen==='string'&&Object.hasOwn(definitions,chosen)?chosen:typeof chosen==='string'?legacy[chosen]:fallback,context);
 }
 function diagnostic(input={}){
  const operation=dataProperty(input,'operation'),entity=dataProperty(input,'entity'),duration=dataProperty(input,'duration'),result=dataProperty(input,'result'),errorCode=dataProperty(input,'errorCode'),warningCount=dataProperty(input,'warningCount');
  const event={operation:operations.includes(operation)?operation:'unknown',result:['COMPLETE','NO_CHANGE','FAILED'].includes(result)?result:'FAILED',duration:Number.isFinite(duration)&&duration>=0?duration:0,warningCount:Number.isSafeInteger(warningCount)&&warningCount>=0?warningCount:0};
  if(entities.includes(entity))event.entity=entity;if(typeof errorCode==='string'&&Object.hasOwn(definitions,errorCode))event.errorCode=errorCode;
  return Object.freeze(event);
 }
 const api=Object.freeze({coreError,fromLegacy,safeContext,diagnostic,errorCodes:Object.freeze(Object.keys(definitions))});
 if(typeof module==='object'&&module.exports)module.exports=api;else(root.ScheduleCoreV2??={}).errors=api;
})(globalThis);
