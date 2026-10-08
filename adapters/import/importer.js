// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,c=node?require('../../core/contracts.js'):root.ScheduleCoreV2.contracts,v=node?require('../../core/validation.js'):root.ScheduleCoreV2.validation,s=node?require('../storage/memory.js'):root.ScheduleCoreV2.storage,i=node?require('../../core/identity.js'):root.ScheduleCoreV2.identity;
 function parseCSV(text){
 const rows=[],row=[];let token='',quoted=false,afterQuote=false,fieldStart=true;
 const finishField=()=>{row.push(token);token='';afterQuote=false;fieldStart=true;};const finishRow=()=>{finishField();rows.push(row.splice(0));};
 for(let n=0;n<text.length;n++){const ch=text[n];
 if(quoted){if(ch==='"'){if(text[n+1]==='"'){token+='"';n++;}else{quoted=false;afterQuote=true;}}else token+=ch;continue;}
 if(ch==='"'){if(!fieldStart||afterQuote)return {rows:[],issues:[{code:'INVALID_CSV_QUOTE'}]};quoted=true;fieldStart=false;continue;}
 if(ch===','){finishField();continue;}
 if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[n+1]==='\n')n++;finishRow();continue;}
 if(afterQuote)return {rows:[],issues:[{code:'INVALID_CSV_AFTER_QUOTE'}]};token+=ch;fieldStart=false;}
 if(quoted)return {rows:[],issues:[{code:'UNTERMINATED_CSV_QUOTE'}]};if(token!==''||row.length||afterQuote)finishRow();
 if(!rows.length)return {rows:[],issues:[]};const headers=rows.shift();
 if(headers.length===0||new Set(headers).size!==headers.length||headers.some(h=>!h))return {rows:[],issues:[{code:'DUPLICATE_OR_EMPTY_HEADER'}]};
 const issues=[],records=[];rows.forEach((cells,n)=>{if(cells.length!==headers.length)issues.push({code:'CSV_COLUMN_COUNT',rowIndex:n+1});else records.push(Object.fromEntries(headers.map((h,k)=>[h,cells[k]])));});
 return {rows:records,issues};}
 function freezeDeep(value){if(value&&typeof value==='object'){for(const x of Object.values(value))freezeDeep(x);Object.freeze(value);}return value;}
 function factKey(row){const {source,...fact}=row;return s.canonical(fact);}
 function planPayload(preview){return {status:preview.status,stage:preview.stage,normalizations:preview.normalizations,matching:preview.matching,entityType:preview.entityType,baseRevision:preview.baseRevision,fingerprint:preview.fingerprint,sourceId:preview.sourceId,batchId:preview.batchId,policy:preview.policy,actions:preview.actions,counts:preview.counts,issues:preview.issues};}
 async function importPreview({format,text,entityType,dataset,sourceId,batchId,policy={updates:'reject',deletes:'reject'}}){
 const def=Object.hasOwn(c.entities,entityType)?c.entities[entityType]:null,baseValidation=v.validateDataset(dataset,{requireSynthetic:true});
 const preview={status:'BLOCKED',stage:'READ',entityType,baseRevision:await s.fingerprint(s.canonical(dataset)),fingerprint:typeof text==='string'?await s.fingerprint(text):null,sourceId,batchId,policy:{updates:policy&&Object.hasOwn(policy,'updates')?policy.updates:'reject',deletes:policy&&Object.hasOwn(policy,'deletes')?policy.deletes:'reject'},actions:[],counts:{valid:0,invalid:0,duplicate:0,ambiguous:0,unmatched:0,ignored:0},issues:[],normalizations:[],matching:[],planHash:null};
 if(!policy||typeof policy!=='object'||Array.isArray(policy)||Object.keys(policy).some(k=>!['updates','deletes'].includes(k))||!def||!v.idPattern.test(sourceId||'')||!v.idPattern.test(batchId||'')||typeof text!=='string'||text.length>2_000_000||!['reject','replace'].includes(preview.policy.updates)||!['reject','explicit'].includes(preview.policy.deletes)||!baseValidation.valid){preview.issues.push({code:'INVALID_IMPORT_CONTEXT',details:baseValidation.issues});return freezeDeep(preview);}
 let rows=[];preview.stage='PARSE';
 const input=text.startsWith('\ufeff')?text.slice(1):text;if(input!==text)preview.normalizations.push({code:'REMOVED_UTF8_BOM'});
 if(format==='csv'){const parsed=parseCSV(input);rows=parsed.rows;preview.issues.push(...parsed.issues);}
 else if(format==='json'){try{rows=JSON.parse(input);if(!Array.isArray(rows))preview.issues.push({code:'JSON_ARRAY_REQUIRED'});}catch{preview.issues.push({code:'INVALID_JSON'});}}
 else preview.issues.push({code:'UNSUPPORTED_FORMAT'});
 if(preview.issues.length)return freezeDeep(preview);
 if(rows.length>10000){preview.issues.push({code:'IMPORT_ROW_LIMIT'});return freezeDeep(preview);}
 const previous=dataset.importBatches.find(b=>b.sourceId===sourceId&&b.fingerprint===preview.fingerprint);
 if(previous){preview.status='REPEATED_IMPORT';preview.stage='PREVIEW';preview.counts.duplicate=rows.length;preview.counts.ignored=rows.length;preview.planHash=await s.fingerprint(s.canonical(planPayload(preview)));return freezeDeep(preview);}
 if(dataset.importBatches.some(b=>b.batchId===batchId)){preview.issues.push({code:'BATCH_ID_CONFLICT'});return freezeDeep(preview);}
 const normalized=[];preview.stage='NORMALIZE';
 rows.forEach((inputRow,n)=>{
 if(!inputRow||typeof inputRow!=='object'||Array.isArray(inputRow)){normalized.push({row:null,index:n+1,issues:[{code:'INVALID_RECORD'}]});return;}
 const row=structuredClone(inputRow),operation=Object.hasOwn(row,'operation')?row.operation:'upsert',issues=[];delete row.operation;
 if(!['upsert','delete'].includes(operation))issues.push({code:'INVALID_OPERATION'});
 if(Object.hasOwn(row,'source'))issues.push({code:'IMPORT_PROVENANCE_RESERVED'});
 if(format==='csv')for(const [field,value] of Object.entries(row)){
 const rule=def.fields[field];
 if(['number','nullableNumber','count'].includes(rule)){if(value===''||value==='null'){row[field]=null;preview.normalizations.push({rowIndex:n+1,field,code:'EXPLICIT_NULL'});}else if(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)&&Number.isFinite(Number(value))){row[field]=Number(value);preview.normalizations.push({rowIndex:n+1,field,code:'PARSED_DECIMAL'});}else issues.push({code:'INVALID_NUMERIC_TOKEN',field});}
 if(rule==='boolean'){if(value==='true'||value==='false'){row[field]=value==='true';preview.normalizations.push({rowIndex:n+1,field,code:'PARSED_BOOLEAN'});}else issues.push({code:'INVALID_BOOLEAN',field});}
 }

 const namedRefs={hospitalName:['Hospital','hospitalId'],departmentName:['Department','departmentId'],employeeName:['Employee','employeeId'],customerName:['Customer','customerId'],productName:['Product','productId']};
 for(const [nameField,[refType,idField]] of Object.entries(namedRefs)){if(!Object.hasOwn(row,nameField))continue;const named=row[nameField];delete row[nameField];
 if(!Object.hasOwn(def.fields,idField)){issues.push({code:'UNKNOWN_FIELD',field:nameField});continue;}
 const resolved=i.resolveIdentity(refType,Object.hasOwn(row,idField)?{id:row[idField],hospitalId:row.hospitalId}:{name:named,hospitalId:row.hospitalId},dataset);
 preview.matching.push({rowIndex:n+1,field:idField,...resolved});
 if(resolved.quality!=='EXACT')issues.push({code:resolved.quality==='AMBIGUOUS'?'AMBIGUOUS_IDENTITY':resolved.quality==='PROBABLE'?'PROBABLE_IDENTITY_REQUIRES_CONFIRMATION':'UNMATCHED_IDENTITY',field:idField});
 else{const actual=(dataset[c.entities[refType].collection]||[]).find(x=>x.id===row[idField]);if(actual?.name!==named)issues.push({code:'NAME_ID_CONFLICT',field:idField});}
 }
 row.source={sourceId,batchId,fingerprint:preview.fingerprint,rowIndex:n+1};preview.normalizations.push({rowIndex:n+1,field:'source',code:'ASSIGNED_IMPORT_PROVENANCE'});normalized.push({row,operation,index:n+1,issues});
 });
 preview.stage='VALIDATE';const byId=new Map();for(const item of normalized){if(item.row?.id){const list=byId.get(item.row.id)||[];list.push(item);byId.set(item.row.id,list);}}
 const conflicting=new Set([...byId].filter(([,list])=>new Set(list.map(x=>x.operation+factKey(x.row))).size>1).map(([id])=>id));
 const seen=new Set();
 for(const item of normalized){const {row,operation,index}=item;const errors=item.issues.slice();let matching='EXACT';
 if(!row)errors.push({code:'INVALID_RECORD'});
 else{
 if(conflicting.has(row.id)){errors.push({code:'DUPLICATE_RECORD'});preview.counts.duplicate++;}
 if(operation==='delete'){if(Object.keys(row).some(k=>!['id','synthetic','source'].includes(k))||!v.idPattern.test(row.id||'')||row.synthetic!==true)errors.push({code:'INVALID_DELETE_RECORD'});if(preview.policy.deletes!=='explicit')errors.push({code:'DELETE_POLICY_REQUIRED'});}
 else errors.push(...v.validateRecord(entityType,row,dataset,{requireSynthetic:true}).issues);
 if(errors.some(x=>x.code==='AMBIGUOUS_IDENTITY')){matching='AMBIGUOUS';preview.counts.ambiguous++;}
 else if(errors.some(x=>x.code.startsWith('UNKNOWN_')||['MISSING_HOSPITAL','INVALID_ID','UNMATCHED_IDENTITY','PROBABLE_IDENTITY_REQUIRES_CONFIRMATION'].includes(x.code))){matching='UNMATCHED';preview.counts.unmatched++;}
 }
 if(errors.length){preview.counts.invalid++;preview.issues.push(...errors.map(x=>({...x,rowIndex:index,matchingQuality:matching})));continue;}
 if(seen.has(row.id)){preview.counts.duplicate++;preview.counts.ignored++;continue;}seen.add(row.id);
 const existing=dataset[def.collection].find(x=>x.id===row.id);
 if(operation==='delete'){if(!existing){preview.counts.invalid++;preview.counts.unmatched++;preview.issues.push({code:'UNMATCHED_DELETE',rowIndex:index});continue;}preview.actions.push({operation:'delete',id:row.id});preview.counts.valid++;continue;}
 if(existing&&factKey(existing)===factKey(row)){preview.counts.duplicate++;preview.counts.ignored++;continue;}
 if(existing&&preview.policy.updates!=='replace'){preview.counts.invalid++;preview.issues.push({code:'UPDATE_POLICY_REQUIRED',rowIndex:index});continue;}
 preview.actions.push({operation:existing?'replace':'insert',row});preview.counts.valid++;
 }
 preview.stage='MATCH';const projected=structuredClone(dataset);const collection=projected[def.collection];
 for(const action of preview.actions){const id=action.id||action.row.id,index=collection.findIndex(x=>x.id===id);if(action.operation==='delete')collection.splice(index,1);else if(action.operation==='replace')collection[index]=action.row;else collection.push(action.row);}
 const projection=v.validateDataset(projected,{requireSynthetic:true});if(!projection.valid){preview.issues.push({code:'PROJECTED_DATASET_INVALID',details:projection.issues});preview.counts.invalid+=preview.counts.valid;preview.counts.valid=0;}
 preview.stage='PREVIEW';preview.status=preview.issues.length?'BLOCKED':'READY';preview.planHash=await s.fingerprint(s.canonical(planPayload(preview)));return freezeDeep(preview);
 }
 async function commitImport(preview,store){
 if(!preview||!['READY','REPEATED_IMPORT'].includes(preview.status)||!Array.isArray(preview.issues)||preview.issues.length)return {status:'PREVIEW_NOT_READY'};
 if(preview.planHash!==await s.fingerprint(s.canonical(planPayload(preview))))return {status:'TAMPERED_PREVIEW'};
 const current=await store.read();if(await s.fingerprint(s.canonical(current))!==preview.baseRevision)return {status:'STALE_PREVIEW'};
 if(preview.status==='REPEATED_IMPORT')return {status:'NO_CHANGE',counts:preview.counts};
 const next=structuredClone(current),def=c.entities[preview.entityType],rows=next[def.collection];
 for(const action of preview.actions){const id=action.id||action.row.id,index=rows.findIndex(x=>x.id===id);if(action.operation==='delete'){if(index<0)return {status:'STALE_PREVIEW'};rows.splice(index,1);}else if(action.operation==='replace'){if(index<0)return {status:'STALE_PREVIEW'};rows[index]=structuredClone(action.row);}else if(action.operation==='insert'){if(index>=0)return {status:'DUPLICATE_RECORD'};rows.push(structuredClone(action.row));}else return {status:'INVALID_ACTION'};}
 next.importBatches.push({batchId:preview.batchId,sourceId:preview.sourceId,fingerprint:preview.fingerprint,counts:structuredClone(preview.counts),synthetic:true});
 const checked=v.validateDataset(next,{requireSynthetic:true});if(!checked.valid)return {status:'INVALID_INPUT',issues:checked.issues};
 const result=await store.writeAtomic(next,{expectedRevision:preview.baseRevision});return {...result,counts:preview.counts};
 }
 const api={parseCSV,importPreview,commitImport};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).importer=api;
})(globalThis);
