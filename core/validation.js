// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,c=node?require('./contracts.js'):root.ScheduleCoreV2.contracts,p=node?require('./period.js'):root.ScheduleCoreV2.period,i=node?require('./identity.js'):root.ScheduleCoreV2.identity;
 const idPattern=/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;
 const refTypes={hospitalId:'Hospital',departmentId:'Department',employeeId:'Employee',customerId:'Customer',productId:'Product',activityId:'Activity'};
 function validateRecord(type,row,dataset,{requireSynthetic=false,checkDuplicate=false}={}){
 const def=Object.hasOwn(c.entities,type)?c.entities[type]:null,issues=[];const add=(code,field)=>issues.push({code,field});
 if(!def)return {valid:false,issues:[{code:'UNKNOWN_ENTITY_TYPE'}]};
 if(!row||typeof row!=='object'||Array.isArray(row))return {valid:false,issues:[{code:'INVALID_RECORD'}]};
 for(const key of Object.keys(row))if(!Object.hasOwn(def.fields,key))add('UNKNOWN_FIELD',key);
 for(const [field,rule] of Object.entries(def.fields)){
 const value=row[field];if(!Object.hasOwn(row,field)){add('MISSING_REQUIRED_FIELD',field);continue;}
 if(field==='synthetic'&&requireSynthetic&&value!==true)add('SYNTHETIC_PROVENANCE_REQUIRED',field);
 if(Array.isArray(rule)){if(!rule.includes(value))add('INVALID_ENUM',field);continue;}
 if(rule==='source'){if(!value||typeof value!=='object'||!idPattern.test(value.sourceId||''))add('MISSING_SOURCE',field);else{for(const key of Object.keys(value))if(!['sourceId','batchId','fingerprint','rowIndex'].includes(key))add('UNKNOWN_SOURCE_FIELD',field);if(value.batchId!==undefined&&!idPattern.test(value.batchId))add('INVALID_BATCH_ID',field);if(value.fingerprint!==undefined&&!/^[a-f0-9]{64}$/.test(value.fingerprint))add('INVALID_FINGERPRINT',field);if(value.rowIndex!==undefined&&(!Number.isInteger(value.rowIndex)||value.rowIndex<1))add('INVALID_ROW_INDEX',field);}continue;}
 if(rule==='id'&&!idPattern.test(value||''))add('INVALID_ID',field);
 if(rule==='boolean'&&typeof value!=='boolean')add('INVALID_BOOLEAN',field);
 if(rule==='text'&&(typeof value!=='string'||value.length===0))add('INVALID_TEXT',field);
 if(rule==='date'&&!p.validDate(value))add('INVALID_DATE',field);
 if(['number','count','nullableNumber'].includes(rule)&&!(rule==='nullableNumber'&&value===null)){
 if(typeof value!=='number'||!Number.isFinite(value))add('INVALID_NUMERIC_TYPE',field);
 else if(rule==='count'&&(!Number.isInteger(value)||value<0))add('INVALID_COUNT',field);}
 if(rule==='planPeriod'&&!p.validatePeriod(value,'plan').valid)add('INVALID_PLAN_PERIOD',field);
 if(rule==='customerIds'){if(!Array.isArray(value))add('INVALID_ARRAY',field);else{if(new Set(value).size!==value.length)add('DUPLICATE_IDENTITY',field);for(const id of value){const r=i.resolveIdentity('Customer',{id},dataset);if(r.quality!=='EXACT')add(r.quality==='AMBIGUOUS'?'AMBIGUOUS_IDENTITY':'UNKNOWN_CUSTOMER',field);}}}
 let refRule=rule;if(rule.startsWith('nullable')&&rule.endsWith('Id')){if(value===null)continue;refRule=rule[8].toLowerCase()+rule.slice(9);}
 if(refTypes[refRule]){if(!idPattern.test(value||''))add(refRule==='hospitalId'?'MISSING_HOSPITAL':'INVALID_ID',field);
 else if(!dataset)add('MISSING_DATASET_CONTEXT',field);
 else{const r=i.resolveIdentity(refTypes[refRule],{id:value,hospitalId:row.hospitalId},dataset);if(r.quality!=='EXACT')add(r.quality==='AMBIGUOUS'?'AMBIGUOUS_IDENTITY':'UNKNOWN_'+refTypes[refRule].toUpperCase(),field);}}
 }
 if(type==='SalesRecord'){if(row.kind==='sale'&&(row.netQuantity<0||row.amount!==null&&row.amount<0))add('INVALID_NEGATIVE_SEMANTICS','kind');if(row.kind==='return'&&(row.netQuantity>0||row.amount!==null&&row.amount>0))add('INVALID_RETURN_SEMANTICS','kind');}
 if(type==='Activity'){if(p.validDate(row.eventDate)&&p.validDate(row.endDate)&&row.endDate<row.eventDate)add('INVALID_PERIOD','endDate');if(typeof row.expenseAmount==='number'&&row.expenseAmount<0)add('INVALID_NEGATIVE_SEMANTICS','expenseAmount');for(const id of Array.isArray(row.customerIds)?row.customerIds:[]){const customer=(dataset?.customers||[]).find(r=>r.id===id);if(customer&&customer.hospitalId!==row.hospitalId)add('CROSS_HOSPITAL_RELATION','customerIds');}}
 if(type==='ObservationPeriod'&&!p.validatePeriod(row,'observation').valid)add('INVALID_PERIOD','from');
 if(checkDuplicate&&(dataset?.[def.collection]||[]).some(r=>r.id===row.id))add('DUPLICATE_RECORD','id');
 return {valid:issues.length===0,issues};
 }
 function validateDataset(dataset,{requireSynthetic=false}={}){
 const issues=[];if(dataset?.schemaVersion!==2)return {valid:false,issues:[{code:'UNSUPPORTED_SCHEMA_VERSION'}]};
 if(typeof dataset.synthetic!=='boolean')issues.push({code:'INVALID_SYNTHETIC_FLAG',field:'synthetic'});
 if(requireSynthetic&&dataset.synthetic!==true)issues.push({code:'SYNTHETIC_PROVENANCE_REQUIRED',field:'synthetic'});
 for(const [type,def] of Object.entries(c.entities)){const rows=dataset[def.collection];if(!Array.isArray(rows)){issues.push({code:'MISSING_COLLECTION',field:def.collection});continue;}const ids=new Set();
 for(const row of rows){if(ids.has(row?.id))issues.push({code:'DUPLICATE_IDENTITY',field:def.collection,id:row?.id});ids.add(row?.id);for(const error of validateRecord(type,row,dataset,{requireSynthetic}).issues)issues.push({...error,entityType:type,id:row?.id});}}

 const allowed=['schemaVersion','synthetic','importBatches',...Object.values(c.entities).map(x=>x.collection)];
 for(const key of Object.keys(dataset))if(!allowed.includes(key))issues.push({code:'UNKNOWN_DATASET_FIELD',field:key});
 if(!Array.isArray(dataset.importBatches))issues.push({code:'MISSING_IMPORT_BATCHES'});
 else{const ids=new Set();for(const batch of dataset.importBatches){
 if(!batch||typeof batch!=='object'||!idPattern.test(batch.batchId||'')||!idPattern.test(batch.sourceId||'')||!/^[a-f0-9]{64}$/.test(batch.fingerprint||'')||batch.synthetic!==true){issues.push({code:'INVALID_IMPORT_BATCH'});continue;}
 if(ids.has(batch.batchId))issues.push({code:'DUPLICATE_BATCH_ID'});ids.add(batch.batchId);
 if(Object.keys(batch).some(k=>!['batchId','sourceId','fingerprint','counts','synthetic'].includes(k)))issues.push({code:'UNKNOWN_BATCH_FIELD'});
 if(!batch.counts||Object.values(batch.counts).some(x=>!Number.isInteger(x)||x<0))issues.push({code:'INVALID_IMPORT_COUNTS'});
 }}
 return {valid:issues.length===0,issues};}
 const api={validateRecord,validateDataset,idPattern};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).validation=api;
})(globalThis);
