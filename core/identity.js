// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const c=typeof module==='object'&&module.exports?require('./contracts.js'):root.ScheduleCoreV2.contracts;
 function resolveIdentity(type,query,dataset){const def=Object.hasOwn(c.entities,type)?c.entities[type]:null;if(!def)return {quality:'UNMATCHED',id:null,candidates:[],code:'UNKNOWN_ENTITY_TYPE'};
 const rows=dataset?.[def.collection]||[];if(!Array.isArray(rows))return {quality:'UNMATCHED',id:null,candidates:[],code:'INVALID_IDENTITY_COLLECTION'};const hospital=query?.hospitalId;
 if(type==='Department'&&!hospital)return {quality:'UNMATCHED',id:null,candidates:[],code:'MISSING_HOSPITAL_NAMESPACE'};
 const scope=type==='Department'?rows.filter(r=>r?.hospitalId===hospital):rows;
 if(query?.id!==undefined&&query.id!==null){const matches=scope.filter(r=>r?.id===query.id);return {quality:matches.length===1?'EXACT':matches.length>1?'AMBIGUOUS':'UNMATCHED',id:matches.length===1?matches[0].id:null,candidates:matches.map(r=>r.id),code:matches.length>1?'AMBIGUOUS_IDENTITY':matches.length?null:'UNMATCHED_IDENTITY'};}
 const matches=typeof query?.name==='string'?scope.filter(r=>r?.name===query.name):[];
 return {quality:matches.length===1?'PROBABLE':matches.length>1?'AMBIGUOUS':'UNMATCHED',id:null,candidates:matches.map(r=>r.id),code:matches.length>1?'AMBIGUOUS_IDENTITY':matches.length?'CANDIDATE_REQUIRES_EXPLICIT_ID':'UNMATCHED_IDENTITY'};}
 const api={resolveIdentity};if(typeof module==='object'&&module.exports)module.exports=api;else(root.ScheduleCoreV2??={}).identity=api;
})(globalThis);
