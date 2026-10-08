// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,c=node?require('./contracts.js'):root.ScheduleCoreV2.contracts,u=node?require('./state.js'):root.ScheduleCoreV2.state,e=node?require('./errors.js'):root.ScheduleCoreV2.errors,t=node?require('./task.js'):root.ScheduleCoreV2.task;
 const commandEntities=Object.freeze({createTask:'Task',updateTask:'Task',cancelTask:'Task',createActivity:'Activity',saveDraft:'Activity',archiveCustomer:'Customer'});
 const rowReason=Object.freeze({CREATE:'NEW_STABLE_ID',UPDATE:'EXPLICIT_UPDATE_APPROVED',UNCHANGED:'FACT_EQUIVALENT',DUPLICATE:'INPUT_OR_BATCH_DUPLICATE',CONFLICT:'EXPLICIT_RESOLUTION_REQUIRED',REJECT:'CONTRACT_REJECTED'});
 const reasonCodes=new Set([...Object.values(rowReason),'CONFLICTING_INPUT_ROWS','EXPLICIT_UPDATE_FINGERPRINT_REQUIRED','INVALID_RECORD','INVALID_ID','UNKNOWN_FIELD','MISSING_REQUIRED_FIELD','INVALID_ENUM','INVALID_TEXT','INVALID_DATE','INVALID_PERIOD','INVALID_PLAN_PERIOD','INVALID_NUMERIC_TYPE','INVALID_COUNT','INVALID_RETURN_SEMANTICS','INVALID_NEGATIVE_SEMANTICS','INVALID_BOOLEAN','INVALID_ARRAY','DUPLICATE_IDENTITY','AMBIGUOUS_IDENTITY','MISSING_HOSPITAL','MISSING_DATASET_CONTEXT','UNKNOWN_CUSTOMER','UNKNOWN_HOSPITAL','UNKNOWN_PRODUCT','UNKNOWN_EMPLOYEE','UNKNOWN_DEPARTMENT','UNKNOWN_ACTIVITY','CROSS_HOSPITAL_RELATION','INVALID_NUMERIC_TOKEN','INVALID_STRUCTURED_FIELD','SYNTHETIC_PROVENANCE_REQUIRED','IMPORT_PROVENANCE_RESERVED','FORBIDDEN_FIELD','FORBIDDEN_CONTENT','NON_JSON_VALUE','NON_PLAIN_OBJECT','CYCLIC_INPUT','INPUT_COMPLEXITY_LIMIT','CONTRACT_REJECTED']);
 function shape(payload,fields){return !!payload&&typeof payload==='object'&&!Array.isArray(payload)&&Object.keys(payload).every(k=>fields.includes(k));}
 function dataOnly(value){const seen=new Set();let nodes=0;function inspect(current,depth){if(depth>32||++nodes>200000)return false;if(current===null||typeof current!=='object')return true;if(seen.has(current))return false;if(!Array.isArray(current)&&![Object.prototype,null].includes(Object.getPrototypeOf(current)))return false;seen.add(current);const descriptors=Object.getOwnPropertyDescriptors(current);for(const key of Reflect.ownKeys(descriptors)){const descriptor=descriptors[key];if(typeof key!=='string'||!Object.hasOwn(descriptor,'value')||!inspect(descriptor.value,depth+1))return false;}seen.delete(current);return true;}try{return inspect(value,0);}catch{return false;}}
 function safeInput(value){return dataOnly(value)&&u.guard(value).valid;}
 function issueList(issues){return (Array.isArray(issues)?issues:[]).map(issue=>({code:reasonCodes.has(issue?.code)?issue.code:'CONTRACT_REJECTED',...(e.safeContext(issue).field?{field:e.safeContext(issue).field}:{})}));}
 function warningList(warnings){return (Array.isArray(warnings)?warnings:[]).map(warning=>({code:warning?.code==='EXPLICIT_LEGACY_FIELD_MAPPING'?warning.code:'CONTRACT_WARNING',...(Object.hasOwn(c.entities,warning?.entityType)?{entityType:warning.entityType}:{}),...(e.safeContext(warning).field?{field:e.safeContext(warning).field}:{})}));}
 function explainImport(plan){return (plan?.results||[]).map(row=>({entityType:Object.hasOwn(c.entities,row.entityType)?row.entityType:null,fileIndex:Number.isSafeInteger(row.fileIndex)?row.fileIndex:null,rowIndex:Number.isSafeInteger(row.rowIndex)?row.rowIndex:null,outcome:Object.hasOwn(rowReason,row.outcome)?row.outcome:'REJECT',reason:row.reason?.length?issueList(row.reason):[{code:rowReason[row.outcome]||'CONTRACT_REJECTED'}]}));}
 function sourceRecords(rows){return [...new Set(rows.map(row=>row?.id).filter(x=>typeof x==='string'))].sort();}
 function changesBetween(before,after){const changes=[];for(const [type,def] of Object.entries(c.entities)){const previous=new Map(before[def.collection].map(row=>[row.id,row])),next=new Map(after[def.collection].map(row=>[row.id,row]));for(const [id,row] of next){if(!previous.has(id))changes.push({entityType:type,id,action:'CREATE'});else if(u.canonical(previous.get(id))!==u.canonical(row))changes.push({entityType:type,id,action:row.status==='cancelled'?'CANCEL':'UPDATE'});}for(const id of previous.keys())if(!next.has(id))changes.push({entityType:type,id,action:'DELETE'});}return changes;}
 function why(value){
  const empty=()=>u.frozen({source:null,sourceRecordIds:[],period:null,identityMatch:null,calculation:null,completeness:null,limitations:['NO_EXPLAINABLE_OUTPUT']});if(!safeInput(value))return empty();
  const output=value?.result?.value??value;if(!output||typeof output!=='object')return empty();
  const recordIds=output.sourceRecordIds||output.calculation?.recordIds||[];
  return u.frozen({source:output.source?u.clone(output.source):null,sourceRecordIds:Array.isArray(recordIds)?u.clone(recordIds):[],period:output.period?u.clone(output.period):null,identityMatch:output.identityMatch??output.matchingQuality??null,calculation:output.calculation?u.clone(output.calculation):null,completeness:output.completeness?u.clone(output.completeness):null,limitations:Array.isArray(output.limitations)?u.clone(output.limitations):[]});
 }
 /** Create a headless command/query client. Diagnostics stay local and contain only contract enums and counts. */
 function createClient(api,options={}){
  function factoryFailure(code){const detail=e.coreError(code),error=new TypeError(detail.message);Object.assign(error,detail);error.coreError=detail;throw error;}
  let properties,plain;try{plain=!!options&&typeof options==='object'&&!Array.isArray(options)&&[Object.prototype,null].includes(Object.getPrototypeOf(options));if(plain)properties=Object.getOwnPropertyDescriptors(options);}catch{factoryFailure('VALIDATION_ERROR');}
  if(!plain||Reflect.ownKeys(properties).some(key=>typeof key!=='string'||!['store','dataset','onDiagnostic'].includes(key)||!Object.hasOwn(properties[key],'value')))factoryFailure('VALIDATION_ERROR');
  const settings=Object.fromEntries(Object.entries(properties).map(([key,descriptor])=>[key,descriptor.value]));
  if(settings.onDiagnostic!==undefined&&typeof settings.onDiagnostic!=='function')factoryFailure('VALIDATION_ERROR');
  if(settings.dataset!==undefined&&(!safeInput(settings.dataset)||!u.checkDataset(settings.dataset).valid))factoryFailure('VALIDATION_ERROR');
  const backend=settings.store===undefined?api.createMemoryStore(settings.dataset===undefined?api.emptyDataset():settings.dataset):settings.store;
  function method(name){let current=backend;try{for(let depth=0;current&&depth<8;depth++){const descriptor=Object.getOwnPropertyDescriptor(current,name);if(descriptor)return Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function'?descriptor.value:null;current=Object.getPrototypeOf(current);}}catch{return null;}return null;}
  const readMethod=method('read'),writeMethod=method('writeAtomic'),recoveryMethod=method('recoveryStatus');if(!backend||!readMethod||!writeMethod)factoryFailure('STORAGE_FAILURE');
  const store=Object.freeze({read:async()=>{const records=await Reflect.apply(readMethod,backend,[]);if(!safeInput(records))throw new u.StateError('STORAGE_FAILED');return u.clone(records);},writeAtomic:async(...args)=>{const result=await Reflect.apply(writeMethod,backend,args);return safeInput(result)?u.clone(result):{status:'STORAGE_FAILED'};},...(recoveryMethod?{recoveryStatus:async()=>{const result=await Reflect.apply(recoveryMethod,backend,[]);if(!safeInput(result))throw new u.StateError('STORAGE_FAILED');return u.clone(result);}}:{})});
  const listeners=new Set();if(typeof settings.onDiagnostic==='function')listeners.add(settings.onDiagnostic);
  function onDiagnostic(listener){if(typeof listener!=='function')factoryFailure('VALIDATION_ERROR');listeners.add(listener);return ()=>listeners.delete(listener);}
  function emit(event){for(const listener of listeners){try{const pending=listener(event);if(pending&&typeof pending.then==='function')Promise.resolve(pending).catch(()=>{});}catch{/* Observer failure must never affect facts or the command result. */}}}
  function complete(operation,value,{status='COMPLETE',changes=[],warnings=[],revision=null,sourceRecordIds=[]}={}){return u.frozen({result:{status,value,error:null},changes,warnings,provenance:{operation,schemaVersion:2,revision,sourceRecordIds}});}
  function failed(operation,error){return u.frozen({result:{status:'FAILED',value:null,error},changes:[],warnings:[],provenance:{operation,schemaVersion:2,revision:null,sourceRecordIds:[]}});}
  async function run(operation,entity,handler){const start=Date.now();let outcome;try{outcome=await handler();}catch(error){try{outcome=failed(operation,e.fromLegacy(error,{operation,entity},'STORAGE_FAILURE'));}catch{outcome=failed(operation,e.coreError('STORAGE_FAILURE',{operation,entity}));}}emit(e.diagnostic({operation,entity,duration:Math.max(0,Date.now()-start),result:outcome.result.status,errorCode:outcome.result.error?.code,warningCount:outcome.warnings.length}));return outcome;}
  function invalid(operation,entity,legacy={status:'INVALID_INPUT'}){return failed(operation,e.fromLegacy(legacy,{operation,entity}));}
  async function command(name,payload={}){
   const supported=['createTask','updateTask','cancelTask','createActivity','saveDraft','archiveCustomer','importRecords','restoreSnapshot'],operation=supported.includes(name)?name:'unknown',entity=commandEntities[operation];
   return run(operation,entity,async()=>{
    if(operation==='unknown'||operation==='archiveCustomer')return failed(operation,e.coreError('UNSUPPORTED_OPERATION',{operation,entity}));
    if(!safeInput(payload))return invalid(operation,entity);
    payload=u.clone(payload);
    const dataset=await store.read(),checked=u.checkDataset(dataset);if(!checked.valid)return invalid(operation,entity,checked);
    const revision=await u.hash(dataset);
    if(operation==='importRecords'||operation==='restoreSnapshot'){
     if(!shape(payload,['plan'])||!payload.plan)return invalid(operation,entity);
     const next=operation==='importRecords'?payload.plan.nextDataset:payload.plan.snapshot?.records;
     const committed=await (operation==='importRecords'?api.commitMultiImport(payload.plan,store):api.restoreSnapshot(payload.plan,store));
     if(!['COMMITTED','NO_CHANGE'].includes(committed.status))return failed(operation,e.fromLegacy(committed,{operation},operation==='importRecords'?'IMPORT_CONFLICT':'STORAGE_FAILURE'));
     const changes=next?changesBetween(dataset,next):[];
     return complete(operation,operation==='importRecords'?{counts:u.clone(committed.counts||{}),rows:explainImport(payload.plan)}:{recordCount:Object.values(c.entities).reduce((count,def)=>count+(next?.[def.collection]?.length||0),0)},{status:changes.length?'COMPLETE':'NO_CHANGE',changes,warnings:warningList(payload.plan.migration?.warnings||payload.plan.warnings),revision:committed.revision||revision,sourceRecordIds:next?sourceRecords(Object.values(next).filter(Array.isArray).flat()):[]});
    }
    const next=u.clone(dataset);let row;
    if(operation==='createTask'||operation==='createActivity'||operation==='saveDraft'){
     if(!shape(payload,['record'])||!payload.record)return invalid(operation,entity);row=u.clone(payload.record);
     const rows=next[c.entities[entity].collection],existing=rows.find(x=>x.id===row.id);
     if(existing&&operation!=='saveDraft')return invalid(operation,entity,{code:'DUPLICATE_RECORD'});
     if(operation==='saveDraft'&&(row.approval!=='draft'||row.status!=='planned'||existing&&existing.approval!=='draft'))return invalid(operation,entity);
     if(operation==='saveDraft'&&existing&&(row.source?.sourceId!==existing.source?.sourceId||row.synthetic!==existing.synthetic))return invalid(operation,entity);
     if(existing)rows[rows.indexOf(existing)]=row;else rows.push(row);
     if(entity==='Activity'){
      const synchronized=t.syncActivityTasks(row,next.tasks,next);if(!['VALID','NO_CHANGE'].includes(synchronized.status))return invalid(operation,entity,synchronized);next.tasks=synchronized.tasks;
     }
    }else{
     const keys=operation==='cancelTask'?['id']:['id','changes'];if(!shape(payload,keys)||typeof payload.id!=='string')return invalid(operation,entity);
     row=next.tasks.find(x=>x.id===payload.id);if(!row)return invalid(operation,entity,{code:'UNMATCHED_IDENTITY'});
     if(operation==='cancelTask'){
      if(row.status==='done')return invalid(operation,entity);row.status='cancelled';
     }else{
      const patch=payload.changes,mutable=['title','dueDate','status','kind','activityId','customerId','productId'];
      if(!shape(patch,mutable)||!Object.keys(patch).length)return invalid(operation,entity);
      if(['done','cancelled'].includes(row.status)&&patch.status!==undefined&&patch.status!==row.status)return invalid(operation,entity);
      Object.assign(row,u.clone(patch));
     }
    }
    const validation=u.checkDataset(next);if(!validation.valid)return invalid(operation,entity,validation);
    const changes=changesBetween(dataset,next);if(!changes.length)return complete(operation,u.clone(row),{status:'NO_CHANGE',revision,sourceRecordIds:sourceRecords([row])});
    const committed=await store.writeAtomic(next,{expectedRevision:revision});if(committed.status!=='COMMITTED')return failed(operation,e.fromLegacy(committed,{operation,entity},'STORAGE_FAILURE'));
    return complete(operation,u.clone(row),{changes,revision:committed.revision||await u.hash(next),sourceRecordIds:sourceRecords([row])});
   });
  }
  async function query(name,payload={}){
   const supported=['getCurrentTasks','getCustomerSummary','getActivityStatus','getSalesSummary','importPreview','restorePreview','snapshot','getRecoveryStatus'],operation=supported.includes(name)?name:'unknown';
   return run(operation,undefined,async()=>{
    if(operation==='unknown')return failed(operation,e.coreError('UNSUPPORTED_OPERATION',{operation}));
    if(!safeInput(payload))return invalid(operation);
    payload=u.clone(payload);
    if(operation==='getRecoveryStatus'){if(!shape(payload,[]))return invalid(operation);if(typeof store.recoveryStatus!=='function')return failed(operation,e.coreError('UNSUPPORTED_OPERATION',{operation}));return complete(operation,u.clone(await store.recoveryStatus()));}
    const dataset=await store.read(),checked=u.checkDataset(dataset);if(!checked.valid)return invalid(operation,undefined,checked);const revision=await u.hash(dataset);let value;
    if(operation==='getCurrentTasks'){if(!shape(payload,[]))return invalid(operation);value={tasks:dataset.tasks.filter(row=>row.status==='pending')};}
    if(operation==='getCustomerSummary'){
     if(!shape(payload,['id','hospitalId']))return invalid(operation);const identity=api.resolveIdentity('Customer',{id:payload.id},dataset);
     if(identity.quality!=='EXACT')return invalid(operation,'Customer',{code:identity.quality==='AMBIGUOUS'?'AMBIGUOUS_IDENTITY':'UNMATCHED_IDENTITY'});
     const customer=dataset.customers.find(x=>x.id===identity.id);if(payload.hospitalId!==undefined&&payload.hospitalId!==customer.hospitalId)return invalid(operation,'Customer',{code:'UNMATCHED_IDENTITY'});
     value={customer,identityMatch:'EXACT',activityIds:dataset.activities.filter(x=>x.customerIds.includes(identity.id)).map(x=>x.id),taskIds:dataset.tasks.filter(x=>x.customerId===identity.id).map(x=>x.id),visitIds:dataset.visits.filter(x=>x.customerId===identity.id).map(x=>x.id)};
    }
    if(operation==='getActivityStatus'){
     if(!shape(payload,['id']))return invalid(operation);const activity=dataset.activities.find(x=>x.id===payload.id);if(!activity)return invalid(operation,'Activity',{code:'UNMATCHED_IDENTITY'});
     value={id:activity.id,approval:activity.approval,status:activity.status,taskIds:dataset.tasks.filter(x=>x.activityId===activity.id).map(x=>x.id)};
    }
    if(operation==='getSalesSummary'){if(!shape(payload,['productId','period']))return invalid(operation);if(!api.validatePeriod(payload.period,'report').valid)return invalid(operation,'SalesRecord',{code:'INVALID_REPORT_PERIOD'});const identity=api.resolveIdentity('Product',{id:payload.productId},dataset);if(identity.quality!=='EXACT')return invalid(operation,'Product',{code:identity.quality==='AMBIGUOUS'?'AMBIGUOUS_IDENTITY':'UNMATCHED_IDENTITY'});value=api.summarizeSales(dataset,payload);}
    if(operation==='importPreview'){if(!shape(payload,['files','sourceId','batchId','updates']))return invalid(operation);const plan=await api.multiImportPreview({...payload,dataset});value={plan,rows:explainImport(plan)};}
    if(operation==='restorePreview'){if(!shape(payload,['snapshot']))return invalid(operation);value=await api.restorePreview(payload.snapshot,store);}
    if(operation==='snapshot'){if(!shape(payload,['generatedAt']))return invalid(operation);value=await api.exportSnapshot(dataset,payload);}
    const sourceRecordIds=operation==='getSalesSummary'?value.calculation.recordIds:operation==='getCurrentTasks'?sourceRecords(value.tasks):operation==='getActivityStatus'?[value.id,...value.taskIds]:operation==='getCustomerSummary'?[value.customer.id,...value.activityIds,...value.taskIds,...value.visitIds]:sourceRecords(Object.values(dataset).filter(Array.isArray).flat());
    return complete(operation,u.clone(value),{revision,sourceRecordIds});
   });
  }
  return Object.freeze({command,query,why,onDiagnostic});
 }
 const api=Object.freeze({createClient});if(node)module.exports=api;else(root.ScheduleCoreV2??={}).client=api;
})(globalThis);
