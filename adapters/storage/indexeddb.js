// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,contract=node?require('./contract.js'):root.ScheduleCoreV2.storageContract,u=node?require('../../core/state.js'):root.ScheduleCoreV2.state;
 function createIndexedDBStore({name='schedule-notes-core-synthetic',seed,indexedDB=root.indexedDB}={}){
  if(!indexedDB)throw new Error('INDEXEDDB_UNAVAILABLE');
  const database=new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};request.onerror=()=>reject(new Error('INDEXEDDB_OPEN_FAILED'));request.onblocked=()=>reject(new Error('INDEXEDDB_OPEN_BLOCKED'));});
  const backend={load:async()=>{const db=await database;return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),request=tx.objectStore('state').get('head');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('INDEXEDDB_READ_FAILED'));});},
   save:async(value,{expectedChecksum,expectedRaw})=>{const db=await database;return new Promise(resolve=>{let outcome={status:'TRANSACTION_FAILED'};const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),request=store.get('head');request.onsuccess=()=>{if((request.result?.checksum??null)!==expectedChecksum||expectedRaw!==undefined&&u.canonical(request.result)!==expectedRaw){outcome={status:'STALE_PREVIEW'};tx.abort();return;}store.put(value,'head');outcome={status:'COMMITTED',revision:value.revision};};tx.oncomplete=()=>resolve(outcome);tx.onabort=()=>resolve(outcome.status==='STALE_PREVIEW'?outcome:{status:'TRANSACTION_FAILED'});tx.onerror=()=>{outcome={status:'TRANSACTION_FAILED'};};});},close:async()=>{(await database).close();}};return contract.createAdapter(backend,{seed});
 }
 const api={createIndexedDBStore};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).indexeddb=api;
})(globalThis);
