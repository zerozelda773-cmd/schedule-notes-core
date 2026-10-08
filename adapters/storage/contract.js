// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,u=node?require('../../core/state.js'):root.ScheduleCoreV2.state,c=node?require('../../core/contracts.js'):root.ScheduleCoreV2.contracts,snap=node?require('../../core/snapshot.js'):root.ScheduleCoreV2.snapshot;
 async function envelope(records,previous,clock){const stamp=clock();if(!u.validTimestamp(stamp)||previous&&stamp<previous.createdAt)throw new u.StateError('INVALID_STORAGE_TIMESTAMP');const value={storageVersion:1,schemaVersion:2,createdAt:previous?.createdAt||stamp,updatedAt:stamp,source:{synthetic:true},revision:await u.hash(records),records:u.clone(records)};value.checksum=await u.hash(value);return value;}
 async function inspect(value){
  const safety=u.guard(value);if(!safety.valid)return {valid:false,issues:safety.issues};
  if(!value||value.storageVersion!==1||value.schemaVersion!==2||Object.keys(value).sort().join(',')!==['storageVersion','schemaVersion','createdAt','updatedAt','source','revision','records','checksum'].sort().join(','))return {valid:false,issues:[{code:'INVALID_STORAGE_ENVELOPE'}]};
  const {checksum,...payload}=value,checked=u.checkDataset(value.records),issues=checked.issues.slice();
  if(checksum!==await u.hash(payload)||value.revision!==await u.hash(value.records))issues.push({code:'STORAGE_CHECKSUM_MISMATCH'});
  if(![value.createdAt,value.updatedAt].every(u.validTimestamp)||value.updatedAt<value.createdAt)issues.push({code:'INVALID_STORAGE_TIMESTAMP'});
  if(u.canonical(value.source)!==u.canonical({synthetic:true}))issues.push({code:'INVALID_STORAGE_PROVENANCE'});return {valid:!issues.length,issues};
 }
 function createAdapter(backend,{seed=c.emptyDataset(),clock=()=>new Date().toISOString()}={}){
  let recovery=false;const ready=(async()=>{const value=await backend.load();if(value===undefined){const checked=u.checkDataset(seed);if(!checked.valid)throw new u.StateError('INVALID_INPUT',checked.issues);await backend.save(await envelope(seed,null,clock),{expectedChecksum:null});}})();
  async function head(){await ready;const value=await backend.load(),checked=await inspect(value);if(!checked.valid){recovery=true;throw new u.StateError('RECOVERY_REQUIRED',checked.issues);}return value;}
  async function read(){return u.clone((await head()).records);}
  async function writeAtomic(next,{expectedRevision}={}){const checked=u.checkDataset(next);if(!checked.valid)return {status:'INVALID_INPUT',issues:checked.issues};let current;try{current=await head();}catch(e){return {status:e.status||'STORAGE_FAILED',issues:e.issues||[]};}if(recovery)return {status:'READ_ONLY_RECOVERY'};if(expectedRevision!==undefined&&expectedRevision!==current.revision)return {status:'STALE_PREVIEW'};if(u.canonical(next)===u.canonical(current.records))return {status:'COMMITTED',revision:current.revision};try{return await backend.save(await envelope(next,current,clock),{expectedChecksum:current.checksum});}catch(e){return {status:e.status||'STORAGE_FAILED',issues:e.issues||[]};}}
  async function transaction(mutator,{expectedRevision}={}){if(typeof mutator!=='function')return {status:'INVALID_TRANSACTION'};try{const original=await read(),draft=u.clone(original),revision=await u.hash(original);if(expectedRevision!==undefined&&expectedRevision!==revision)return {status:'STALE_PREVIEW'};const result=await mutator(draft),committed=await writeAtomic(draft,{expectedRevision:revision});return {...committed,result};}catch(e){return {status:e.status||'TRANSACTION_FAILED',issues:e.issues||[]};}}
  function collection(type){if(!Object.hasOwn(c.entities,type))throw new u.StateError('UNKNOWN_ENTITY_TYPE');return c.entities[type].collection;}
  async function get(type,id){return (await read())[collection(type)].find(x=>x.id===id)||null;}
  async function list(type){return (await read())[collection(type)];}
  async function put(type,row){return transaction(draft=>{const rows=draft[collection(type)],index=rows.findIndex(x=>x.id===row.id);if(index<0)rows.push(u.clone(row));else rows[index]=u.clone(row);});}
  async function remove(type,id){return transaction(draft=>{const rows=draft[collection(type)],index=rows.findIndex(x=>x.id===id);if(index>=0)rows.splice(index,1);});}
  async function snapshot(options){return snap.exportSnapshot(await read(),options);}
  async function restore(value){const plan=await snap.restorePreview(value,api);return snap.restoreSnapshot(plan,api);}
  async function recoveryStatus(){try{const value=await head();return {status:recovery?'READ_ONLY_RECOVERY':'HEALTHY',revision:value.revision};}catch(e){return {status:'RECOVERY_REQUIRED',issues:e.issues||[]};}}
  async function exportRecovery(){await ready;const raw=await backend.load(),checked=u.guard(raw);if(!checked.valid)return {status:'UNSAFE_RECOVERY_PAYLOAD',issues:checked.issues};return {status:'RECOVERY_EXPORT',integrity:'UNTRUSTED',raw:u.clone(raw)};}
  async function recover(value,{expectedChecksum}={}){await ready;const checked=await snap.validateSnapshot(value);if(!checked.valid)return {status:'INVALID_INPUT',issues:checked.issues};const original=await backend.load();if(expectedChecksum===undefined)return {status:'RECOVERY_CONFIRMATION_REQUIRED'};if((original?.checksum??null)!==expectedChecksum)return {status:'STALE_PREVIEW'};const result=await backend.save(await envelope(value.records,null,clock),{expectedChecksum});if(result.status==='COMMITTED')recovery=false;return result;}
  const api=Object.freeze({read,writeAtomic,get,put,delete:remove,list,transaction,snapshot,restore,recoveryStatus,exportRecovery,recover,metadata:async()=>{const {records,...metadata}=await head();return metadata;},close:async()=>{await ready;await backend.close?.();}});return api;
 }
 function memoryAdapter(seed,options={}){let current;return createAdapter({load:async()=>u.clone(current),save:async(next,{expectedChecksum})=>{if((current?.checksum??null)!==expectedChecksum)return {status:'STALE_PREVIEW'};if(options.beforeCommit){try{options.beforeCommit();}catch{return {status:'TRANSACTION_FAILED'};}}current=u.clone(next);return {status:'COMMITTED',revision:current.revision};}},{seed,...options});}
 const api={createAdapter,memoryAdapter,inspect};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).storageContract=api;
})(globalThis);
