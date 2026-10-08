// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,u=node?require('./state.js'):root.ScheduleCoreV2.state;
 const fields=['schemaVersion','apiVersion','records','provenance','generatedAt','checksum'];
 async function exportSnapshot(dataset,{generatedAt=new Date().toISOString()}={}){
  const checked=u.checkDataset(dataset);if(!checked.valid)throw new u.StateError('INVALID_INPUT',checked.issues);
  if(!u.validTimestamp(generatedAt))throw new u.StateError('INVALID_TIMESTAMP');
  const snapshot={schemaVersion:2,apiVersion:u.apiVersion,records:u.clone(dataset),provenance:{synthetic:true,sourceIds:[...new Set(Object.values(dataset).filter(Array.isArray).flat().map(x=>x?.source?.sourceId).filter(Boolean))].sort()},generatedAt};snapshot.checksum=await u.hash(snapshot);return u.frozen(snapshot);
 }
 async function validateSnapshot(snapshot,{allowLegacy=false}={}){
  const safety=u.guard(snapshot);if(!safety.valid)return {status:'INVALID',valid:false,issues:safety.issues};
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||fields.some(k=>!Object.hasOwn(snapshot,k))||Object.keys(snapshot).some(k=>!fields.includes(k)))return {status:'INVALID',valid:false,issues:[{code:'INVALID_SNAPSHOT_SHAPE'}]};
  const issues=[],{checksum,...payload}=snapshot;
  if(!/^[a-f0-9]{64}$/.test(checksum||'')||checksum!==await u.hash(payload))issues.push({code:'CHECKSUM_MISMATCH'});
  if(snapshot.apiVersion!==u.apiVersion)issues.push({code:'UNSUPPORTED_API_VERSION'});
  if(snapshot.schemaVersion!==snapshot.records?.schemaVersion)issues.push({code:'SCHEMA_MISMATCH'});
  if(snapshot.schemaVersion!==2&&!(allowLegacy&&snapshot.schemaVersion===1))issues.push({code:'UNSUPPORTED_SCHEMA_VERSION'});
  if(!u.validTimestamp(snapshot.generatedAt))issues.push({code:'INVALID_TIMESTAMP'});
  if(snapshot.schemaVersion===2){const checked=u.checkDataset(snapshot.records);issues.push(...checked.issues);if(checked.valid&&u.validTimestamp(snapshot.generatedAt)){const derived=await exportSnapshot(snapshot.records,{generatedAt:snapshot.generatedAt});if(u.canonical(derived.provenance)!==u.canonical(snapshot.provenance))issues.push({code:'PROVENANCE_MISMATCH'});}}
  else if(snapshot.provenance?.synthetic!==true||snapshot.records?.synthetic!==true)issues.push({code:'SYNTHETIC_PROVENANCE_REQUIRED'});
  return {status:issues.length?'INVALID':'VALID',valid:!issues.length,issues};
 }
 async function restorePreview(snapshot,store){const checked=await validateSnapshot(snapshot,{allowLegacy:true});if(!checked.valid)return u.frozen({status:'BLOCKED',issues:checked.issues});try{const current=await store.read(),migration=node?require('./migration.js'):root.ScheduleCoreV2.migration,planned=await migration.migrationPreview(snapshot,{targetDataset:current});if(!['READY','NO_CHANGE'].includes(planned.status))return u.frozen({status:'BLOCKED',issues:planned.issues});const normalized=await exportSnapshot(planned.dataset,{generatedAt:snapshot.generatedAt}),plan={status:'READY',baseRevision:await u.hash(current),snapshot:normalized,migration:{fromVersion:planned.fromVersion,toVersion:planned.toVersion,counts:planned.counts,warnings:planned.warnings},issues:[]};plan.planHash=await u.hash(plan);return u.frozen(plan);}catch(error){return u.frozen({status:'BLOCKED',issues:[{code:error.status||'STORAGE_FAILED',recoveryRequired:true}]});}}
 async function restoreSnapshot(plan,store){if(plan?.status!=='READY')return {status:'PREVIEW_NOT_READY'};const {planHash,...payload}=plan;if(planHash!==await u.hash(payload))return {status:'TAMPERED_PREVIEW'};const checked=await validateSnapshot(plan.snapshot);if(!checked.valid)return {status:'INVALID_INPUT',issues:checked.issues};return store.writeAtomic(plan.snapshot.records,{expectedRevision:plan.baseRevision});}
 const api={exportSnapshot,validateSnapshot,restorePreview,restoreSnapshot};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).snapshot=api;
})(globalThis);
