// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,v=node?require('./validation.js'):root.ScheduleCoreV2.validation,s=node?require('../adapters/storage/memory.js'):root.ScheduleCoreV2.storage,c=node?require('./contracts.js'):root.ScheduleCoreV2.contracts;
 const apiVersion='1.0';
 class StateError extends Error{constructor(status,issues=[]){super(status);this.name='StateError';this.status=status;this.issues=issues;}}
 function guard(value){const issues=[],seen=new Set();let nodes=0;function walk(x,path,depth=0){
  if(depth>32||++nodes>200000){if(!issues.some(x=>x.code==='INPUT_COMPLEXITY_LIMIT'))issues.push({code:'INPUT_COMPLEXITY_LIMIT'});return;}
  if(typeof x==='string'&&(/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(x)||/\b(?:gh[pousr]_|github_pat_|sb_secret_)[A-Za-z0-9_-]{20,}/.test(x)||/https?:\/\/[^\s]*(?:supabase\.co|vercel\.app)/.test(x)))issues.push({code:'FORBIDDEN_CONTENT',path});
  if(x===null||typeof x==='boolean'||typeof x==='string')return;
  if(typeof x==='number'){if(!Number.isFinite(x))issues.push({code:'NON_JSON_NUMBER',path});return;}
  if(typeof x!=='object'){issues.push({code:'NON_JSON_VALUE',path});return;}
  if(seen.has(x)){issues.push({code:'CYCLIC_INPUT',path});return;}seen.add(x);
  if(!Array.isArray(x)&&![Object.prototype,null].includes(Object.getPrototypeOf(x)))issues.push({code:'NON_PLAIN_OBJECT',path});
  const descriptors=Object.getOwnPropertyDescriptors(x),keys=Reflect.ownKeys(descriptors);
  if(keys.some(key=>typeof key!=='string'||!Object.hasOwn(descriptors[key],'value'))){issues.push({code:'NON_JSON_VALUE',path});seen.delete(x);return;}
  for(const key of keys){if(Array.isArray(x)&&key==='length')continue;const item=descriptors[key].value;
   if(/(?:password|passwd|secret|credential|token|api.?key|private.?key|signing|production.?endpoint|deployment.?config)/i.test(key)||['__proto__','constructor','prototype'].includes(key))issues.push({code:'FORBIDDEN_FIELD',path:path+'.'+key});
   walk(item,path+'.'+key,depth+1);
  }seen.delete(x);
 }try{walk(value,'$');}catch{issues.push({code:'NON_JSON_VALUE',path:'$'});}return {valid:!issues.length,issues};}
 function checkDataset(dataset){const safety=guard(dataset);if(!safety.valid)return safety;try{return v.validateDataset(dataset,{requireSynthetic:true});}catch{return {valid:false,issues:[{code:'INVALID_DATASET_SHAPE'}]};}}
 function datasetSummary(dataset){const checked=checkDataset(dataset),collections={};let recordCount=0,individuallyValidRecords=0;const safe=guard(dataset).valid;if(safe&&dataset&&typeof dataset==='object')for(const [type,def] of Object.entries(c.entities)){const rows=dataset[def.collection];if(!Array.isArray(rows))continue;collections[def.collection]=rows.length;recordCount+=rows.length;if(dataset.schemaVersion===2)for(const row of rows)try{if(v.validateRecord(type,row,dataset,{requireSynthetic:true}).valid)individuallyValidRecords++;}catch{}}return {valid:checked.valid,recordCount,collections,individuallyValidRecords,issues:checked.issues.map(({code,field,entityType})=>({code,...(field?{field}:{}),...(entityType?{entityType}:{})}))};}
 const clone=x=>structuredClone(x),hash=x=>s.fingerprint(s.canonical(x));
 function frozen(x){if(x&&typeof x==='object'){for(const item of Object.values(x))frozen(item);Object.freeze(x);}return x;}
 function validTimestamp(value){return typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;}
 const api={apiVersion,StateError,guard,checkDataset,datasetSummary,clone,hash,canonical:s.canonical,frozen,validTimestamp};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).state=api;
})(globalThis);
