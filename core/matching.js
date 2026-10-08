// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,c=node?require('./contracts.js'):root.ScheduleCoreV2.contracts,v=node?require('./validation.js'):root.ScheduleCoreV2.validation,u=node?require('./state.js'):root.ScheduleCoreV2.state,e=node?require('./errors.js'):root.ScheduleCoreV2.errors;
 function normalize(value){return typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en-US'):'';}
 function score(left,right){const a=normalize(left),b=normalize(right);if(!a||!b)return 0;if(a===b)return 1;const x=new Set(Array.from(a)),y=new Set(Array.from(b));return [...x].filter(z=>y.has(z)).length/new Set([...x,...y]).size;}
 function scope(type,row){return type==='Department'?row.hospitalId:null;}
 function dataOnly(value){const seen=new Set();let nodes=0;function inspect(current,depth){if(depth>32||++nodes>200000)return false;if(current===null||typeof current!=='object')return true;if(seen.has(current))return false;if(!Array.isArray(current)&&![Object.prototype,null].includes(Object.getPrototypeOf(current)))return false;seen.add(current);const descriptors=Object.getOwnPropertyDescriptors(current);for(const key of Reflect.ownKeys(descriptors)){const descriptor=descriptors[key];if(typeof key!=='string'||!Object.hasOwn(descriptor,'value')||!inspect(descriptor.value,depth+1))return false;}seen.delete(current);return true;}try{return inspect(value,0);}catch{return false;}}
 function createAliasRegistry(dataset,entries=[]){
  if(!dataOnly(dataset)||!dataOnly(entries))return {status:'FAILED',aliases:[],error:e.coreError('VALIDATION_ERROR')};
  const safety=u.checkDataset(dataset),guard=u.guard(entries);if(!safety.valid||!guard.valid||!Array.isArray(entries))return {status:'FAILED',aliases:[],error:e.coreError('VALIDATION_ERROR')};
  const aliases=[],seen=new Set();for(const entry of entries){
   const type=entry?.entityType,def=Object.hasOwn(c.entities,type)?c.entities[type]:null;
   if(!def||!entry||Object.keys(entry).some(k=>!['entityType','id','namespace','alias'].includes(k))||!v.idPattern.test(entry.id||'')||!normalize(entry.alias)||entry.alias.length>4096)return {status:'FAILED',aliases:[],error:e.coreError('VALIDATION_ERROR')};
   if(type==='Department'&&!v.idPattern.test(entry.namespace||''))return {status:'FAILED',aliases:[],error:e.coreError('IDENTITY_UNMATCHED',{entity:type})};
   if(type!=='Department'&&entry.namespace!==null)return {status:'FAILED',aliases:[],error:e.coreError('VALIDATION_ERROR',{entity:type})};
   const owners=dataset[def.collection].filter(row=>row.id===entry.id&&scope(type,row)===entry.namespace);
   if(owners.length!==1)return {status:'FAILED',aliases:[],error:e.coreError(owners.length?'IDENTITY_AMBIGUOUS':'IDENTITY_UNMATCHED',{entity:type})};
   const key=JSON.stringify([type,entry.id,entry.namespace,normalize(entry.alias)]);if(!seen.has(key)){seen.add(key);aliases.push({entityType:type,id:entry.id,namespace:entry.namespace,alias:entry.alias});}
  }
  aliases.sort((a,b)=>JSON.stringify([a.entityType,a.namespace,a.id,normalize(a.alias)]).localeCompare(JSON.stringify([b.entityType,b.namespace,b.id,normalize(b.alias)]),'en-US'));
  return u.frozen({status:'COMPLETE',aliases,error:null});
 }
 function candidates(type,query,dataset,options={}){
  const invalid=()=>u.frozen({quality:'UNMATCHED',id:null,candidates:[],error:e.coreError('VALIDATION_ERROR')});
  if(typeof type!=='string'||!dataOnly(query)||!dataOnly(dataset)||!dataOnly(options)||!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['aliases','threshold','limit'].includes(k)))return invalid();
  const {aliases=[],threshold=0.25,limit=20}=options,def=Object.hasOwn(c.entities,type)?c.entities[type]:null,guard=u.guard({query,aliases});
  if(!def||!guard.valid||!u.checkDataset(dataset).valid||!query||Object.keys(query).some(k=>!['name','namespace'].includes(k))||!normalize(query.name)||query.name.length>4096||!Number.isFinite(threshold)||threshold<0||threshold>1||!Number.isSafeInteger(limit)||limit<1||limit>100)return u.frozen({quality:'UNMATCHED',id:null,candidates:[],error:e.coreError('VALIDATION_ERROR')});
  const namespace=type==='Department'?query.namespace:null;
  if(type==='Department'&&!v.idPattern.test(namespace||''))return u.frozen({quality:'UNMATCHED',id:null,candidates:[],error:e.coreError('IDENTITY_UNMATCHED',{entity:type})});
  if(type!=='Department'&&query.namespace!==undefined&&query.namespace!==null)return u.frozen({quality:'UNMATCHED',id:null,candidates:[],error:e.coreError('VALIDATION_ERROR',{entity:type})});
  const checked=createAliasRegistry(dataset,aliases);if(checked.status!=='COMPLETE')return u.frozen({quality:'UNMATCHED',id:null,candidates:[],error:checked.error});
  const ranked=dataset[def.collection].filter(row=>scope(type,row)===namespace).map(row=>{
   const owned=checked.aliases.filter(a=>a.entityType===type&&a.id===row.id&&a.namespace===namespace),canonical=score(query.name,row.name||row.title),aliasScore=Math.max(0,...owned.map(a=>score(query.name,a.alias)));
   return {id:row.id,namespace,score:Math.max(canonical,aliasScore),basis:aliasScore>canonical?'ALIAS':'CANONICAL',quality:'PROBABLE'};
  }).filter(row=>row.score>0&&row.score>=threshold).sort((a,b)=>b.score-a.score||(a.id<b.id?-1:a.id>b.id?1:0));
  const quality=ranked.length===0?'UNMATCHED':ranked.length>1&&ranked[0].score===ranked[1].score?'AMBIGUOUS':'PROBABLE';
  return u.frozen({quality,id:null,candidates:ranked.slice(0,limit),error:quality==='UNMATCHED'?e.coreError('IDENTITY_UNMATCHED',{entity:type}):quality==='AMBIGUOUS'?e.coreError('IDENTITY_AMBIGUOUS',{entity:type}):null});
 }
 const api=Object.freeze({normalize,score,createAliasRegistry,candidates});if(node)module.exports=api;else(root.ScheduleCoreV2??={}).matching=api;
})(globalThis);
