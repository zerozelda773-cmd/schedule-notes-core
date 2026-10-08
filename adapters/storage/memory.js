// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
 async function fingerprint(text){const bytes=new TextEncoder().encode(text),digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function createMemoryStore(dataset){const contract=typeof module==='object'&&module.exports?require('./contract.js'):root.ScheduleCoreV2.storageContract;return contract.memoryAdapter(dataset);}
 const api={canonical,fingerprint,createMemoryStore};if(typeof module==='object'&&module.exports)module.exports=api;else(root.ScheduleCoreV2??={}).storage=api;
})(globalThis);
