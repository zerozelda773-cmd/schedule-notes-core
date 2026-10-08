// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,u=node?require('./state.js'):root.ScheduleCoreV2.state,c=node?require('./contracts.js'):root.ScheduleCoreV2.contracts;
 const fields=['schemaVersion','apiVersion','records','provenance','generatedAt','checksum'],backupTime='2030-01-01T00:00:00.000Z';
 async function exportSnapshot(dataset,{generatedAt=new Date().toISOString()}={}){
  const checked=u.checkDataset(dataset);if(!checked.valid)throw new u.StateError('INVALID_INPUT',checked.issues);
  if(!u.validTimestamp(generatedAt))throw new u.StateError('INVALID_TIMESTAMP');
  const snapshot={schemaVersion:2,apiVersion:u.apiVersion,records:u.clone(dataset),provenance:{synthetic:true,sourceIds:[...new Set(Object.values(dataset).filter(Array.isArray).flat().map(x=>x?.source?.sourceId).filter(Boolean))].sort()},generatedAt};snapshot.checksum=await u.hash(snapshot);return u.frozen(snapshot);
 }
 function backupMetadata(snapshot,baseChecksum){return {profile:'full-backup-v1',payloadMode:'FULL',dataSchemaVersion:snapshot.schemaVersion,recordCount:u.datasetSummary(snapshot.records).recordCount,source:u.clone(snapshot.provenance),compatibility:{apiVersion:u.apiVersion,storageVersion:1,supportedSchemaVersions:[1,2]},incremental:{supported:false,containsDelta:false,baseChecksum}};}
 async function exportBackup(dataset,{generatedAt=backupTime,baseChecksum=null}={}){
  if(baseChecksum!==null&&!/^[a-f0-9]{64}$/.test(baseChecksum))throw new u.StateError('INVALID_BASE_CHECKSUM');
  const snapshot=u.clone(await exportSnapshot(dataset,{generatedAt}));delete snapshot.checksum;snapshot.metadata=backupMetadata(snapshot,baseChecksum);snapshot.checksum=await u.hash(snapshot);return u.frozen(snapshot);
 }
 async function validateSnapshot(snapshot,{allowLegacy=false}={}){
  const safety=u.guard(snapshot);if(!safety.valid)return {status:'INVALID',valid:false,issues:safety.issues};
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||fields.some(k=>!Object.hasOwn(snapshot,k))||Object.keys(snapshot).some(k=>!fields.includes(k)&&k!=='metadata'))return {status:'INVALID',valid:false,issues:[{code:'INVALID_SNAPSHOT_SHAPE'}]};
  const issues=[],{checksum,...payload}=snapshot;
  if(!/^[a-f0-9]{64}$/.test(checksum||'')||checksum!==await u.hash(payload))issues.push({code:'CHECKSUM_MISMATCH'});
  if(snapshot.apiVersion!==u.apiVersion)issues.push({code:'UNSUPPORTED_API_VERSION'});
  if(snapshot.schemaVersion!==snapshot.records?.schemaVersion)issues.push({code:'SCHEMA_MISMATCH'});
  if(snapshot.schemaVersion!==2&&!(allowLegacy&&snapshot.schemaVersion===1))issues.push({code:'UNSUPPORTED_SCHEMA_VERSION'});
  if(!u.validTimestamp(snapshot.generatedAt))issues.push({code:'INVALID_TIMESTAMP'});
  if(snapshot.schemaVersion===2){const checked=u.checkDataset(snapshot.records);issues.push(...checked.issues);if(checked.valid&&u.validTimestamp(snapshot.generatedAt)){const derived=await exportSnapshot(snapshot.records,{generatedAt:snapshot.generatedAt});if(u.canonical(derived.provenance)!==u.canonical(snapshot.provenance))issues.push({code:'PROVENANCE_MISMATCH'});}}
  else if(snapshot.provenance?.synthetic!==true||snapshot.records?.synthetic!==true)issues.push({code:'SYNTHETIC_PROVENANCE_REQUIRED'});
  if(Object.hasOwn(snapshot,'metadata')){const base=snapshot.metadata?.incremental?.baseChecksum;if(snapshot.schemaVersion!==2||base!==null&&!/^[a-f0-9]{64}$/.test(base||'')||u.canonical(snapshot.metadata)!==u.canonical(backupMetadata(snapshot,base)))issues.push({code:'INVALID_BACKUP_METADATA'});}
  return {status:issues.length?'INVALID':'VALID',valid:!issues.length,issues};
 }
 async function inspectSnapshot(snapshot){
  const checked=await validateSnapshot(snapshot,{allowLegacy:true}),safe=u.guard(snapshot).valid,summary=safe?u.datasetSummary(snapshot?.records):{recordCount:0,collections:{}};
  const codes=checked.issues.map(x=>x.code),shape=safe&&snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot),integrityStatus=shape&&/^[a-f0-9]{64}$/.test(snapshot.checksum||'')?(snapshot.checksum===await u.hash(Object.fromEntries(Object.entries(snapshot).filter(([key])=>key!=='checksum')))?'PASS':'FAIL'):'UNKNOWN';
  return u.frozen({status:checked.status,recordCount:summary.recordCount,collections:summary.collections,schema:shape&&Number.isInteger(snapshot.schemaVersion)?snapshot.schemaVersion:null,migrationRequired:shape&&snapshot.schemaVersion===1,conflicts:checked.issues.filter(x=>/CONFLICT|DUPLICATE|CROSS_HOSPITAL/.test(x.code)).map(({code,entityType,field})=>({code,...(entityType?{entityType}:{}),...(field?{field}:{})})),unsupported:codes.filter(code=>/UNSUPPORTED|UNKNOWN_(?:FIELD|DATASET_FIELD)|INVALID_BACKUP_METADATA/.test(code)),integrityStatus,issues:checked.issues.map(({code,field,entityType})=>({code,...(field?{field}:{}),...(entityType?{entityType}:{})}))});
 }
 function restoreConflicts(source,target){const conflicts=[];for(const [entityType,def] of Object.entries(c.entities)){const incoming=new Map(source[def.collection].map(row=>[row.id,row])),existing=target[def.collection];const updated=existing.filter(row=>incoming.has(row.id)&&u.canonical(incoming.get(row.id))!==u.canonical(row)).length,removed=existing.filter(row=>!incoming.has(row.id)).length;if(updated)conflicts.push({code:'EXISTING_RECORD_CHANGED',entityType,count:updated});if(removed)conflicts.push({code:'EXISTING_RECORD_REMOVED',entityType,count:removed});}return conflicts;}
 async function restorePreview(snapshot,store){
  const details=await inspectSnapshot(snapshot);if(details.status!=='VALID')return u.frozen({...details,status:'BLOCKED'});
  try{const current=await store.read(),migration=node?require('./migration.js'):root.ScheduleCoreV2.migration,planned=await migration.migrationPreview(snapshot,{targetDataset:current});if(!['READY','NO_CHANGE'].includes(planned.status))return u.frozen({...details,status:'BLOCKED',issues:planned.issues,unsupported:planned.issues.filter(x=>/UNSUPPORTED|UNKNOWN/.test(x.code)).map(x=>x.code)});
   const normalized=Object.hasOwn(snapshot,'metadata')?await exportBackup(planned.dataset,{generatedAt:snapshot.generatedAt,baseChecksum:snapshot.metadata.incremental.baseChecksum}):await exportSnapshot(planned.dataset,{generatedAt:snapshot.generatedAt}),plan={...details,status:'READY',baseRevision:await u.hash(current),snapshot:normalized,conflicts:restoreConflicts(planned.dataset,current),migration:{fromVersion:planned.fromVersion,toVersion:planned.toVersion,counts:planned.counts,warnings:planned.warnings},issues:[]};plan.planHash=await u.hash(plan);return u.frozen(plan);
  }catch(error){return u.frozen({...details,status:'BLOCKED',issues:[{code:error.status||'STORAGE_FAILED',recoveryRequired:true}]});}
 }
 async function restoreSnapshot(plan,store){if(plan?.status!=='READY')return {status:'PREVIEW_NOT_READY'};const {planHash,...payload}=plan;if(planHash!==await u.hash(payload))return {status:'TAMPERED_PREVIEW'};const checked=await validateSnapshot(plan.snapshot);if(!checked.valid)return {status:'INVALID_INPUT',issues:checked.issues};return store.writeAtomic(plan.snapshot.records,{expectedRevision:plan.baseRevision});}
 const api={exportSnapshot,exportBackup,validateSnapshot,inspectSnapshot,restorePreview,restoreSnapshot};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).snapshot=api;
})(globalThis);
