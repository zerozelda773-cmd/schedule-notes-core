// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
 async function fingerprint(text){const bytes=new TextEncoder().encode(text),digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function createMemoryStore(dataset){let current=structuredClone(dataset);return {async read(){return structuredClone(current);},async writeAtomic(next,{expectedRevision}){const before=canonical(current),revision=await fingerprint(before);if(before!==canonical(current)||revision!==expectedRevision)return {status:'STALE_PREVIEW'};current=structuredClone(next);return {status:'COMMITTED'};}};}
 const api={canonical,fingerprint,createMemoryStore};if(typeof module==='object'&&module.exports)module.exports=api;else(root.ScheduleCoreV2??={}).storage=api;
})(globalThis);
