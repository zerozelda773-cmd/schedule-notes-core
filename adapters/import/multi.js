// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,u=node?require('../../core/state.js'):root.ScheduleCoreV2.state,c=node?require('../../core/contracts.js'):root.ScheduleCoreV2.contracts,v=node?require('../../core/validation.js'):root.ScheduleCoreV2.validation,parser=node?require('./importer.js'):root.ScheduleCoreV2.importer;
 const order=['Hospital','Employee','Product','Department','Customer','ObservationPeriod','EmployeePlanRecord','SalesRecord','Activity','Task','Visit'];
 function fact(row){const {source,...record}=row;return u.canonical(record);}
 async function multiImportPreview({files,dataset,sourceId,batchId,updates=[]}){
  const issues=[],results=[],actions=[],counts={CREATE:0,UPDATE:0,UNCHANGED:0,DUPLICATE:0,CONFLICT:0,REJECT:0};
  const checked=u.checkDataset(dataset),safety=u.guard(files),policy=u.guard(updates);
  if(!checked.valid||!safety.valid||!policy.valid||!Array.isArray(files)||!files.length||files.length>100||!Array.isArray(updates)||!v.idPattern.test(sourceId||'')||!v.idPattern.test(batchId||''))return u.frozen({status:'BLOCKED',issues:[{code:'INVALID_IMPORT_CONTEXT',details:[...checked.issues,...safety.issues,...policy.issues]}]});
  const resolutionIds=new Set();for(const item of updates){const key=item?.entityType+':'+item?.id;if(!item||Object.keys(item).sort().join(',')!=='entityType,expectedFingerprint,id'||!Object.hasOwn(c.entities,item.entityType)||!v.idPattern.test(item.id||'')||!/^[a-f0-9]{64}$/.test(item.expectedFingerprint||'')||resolutionIds.has(key))return u.frozen({status:'BLOCKED',issues:[{code:'INVALID_OR_AMBIGUOUS_UPDATE_RESOLUTION'}]});resolutionIds.add(key);}
  const projected=u.clone(dataset);
  const baseRevision=await u.hash(dataset),fileFingerprints=[],entries=[];let total=0;
  for(let fileIndex=0;fileIndex<files.length;fileIndex++){
   const file=files[fileIndex];if(!file||Object.keys(file).some(k=>!['name','format','text','entityType'].includes(k))||typeof file.name!=='string'||!/^Synthetic [A-Za-z0-9 ._-]+$/.test(file.name)||!Object.hasOwn(c.entities,file.entityType)||typeof file.text!=='string'||file.text.length>2_000_000){issues.push({code:'INVALID_FILE',fileIndex});continue;}
   const fingerprint=await u.hash({entityType:file.entityType,format:file.format,text:file.text});fileFingerprints.push(fingerprint);
   let rows;
   if(file.format==='json'){try{rows=JSON.parse(file.text);}catch{issues.push({code:'INVALID_JSON',fileIndex});continue;}}
   else if(file.format==='csv'){const parsed=parser.parseCSV(file.text);if(parsed.issues.length){issues.push(...parsed.issues.map(x=>({...x,fileIndex})));continue;}rows=parsed.rows;}
   else{issues.push({code:'UNSUPPORTED_FORMAT',fileIndex});continue;}
   if(!Array.isArray(rows)||(total+=rows.length)>10000){issues.push({code:'IMPORT_ROW_LIMIT_OR_SHAPE',fileIndex});continue;}
   for(let index=0;index<rows.length;index++){
    const row=u.clone(rows[index]);let errors=[];
    if(!row||typeof row!=='object'||Array.isArray(row))errors.push({code:'INVALID_RECORD'});
    else{
     const guard=u.guard(row);errors.push(...guard.issues);if(Object.hasOwn(row,'source'))errors.push({code:'IMPORT_PROVENANCE_RESERVED'});
     if(!v.idPattern.test(row.id||''))errors.push({code:'INVALID_ID',field:'id'});
     if(file.format==='csv')for(const [key,rule] of Object.entries(c.entities[file.entityType].fields))if(Object.hasOwn(row,key)){
      const value=row[key];if(['number','nullableNumber','count'].includes(rule)){if(value===''||value==='null')row[key]=null;else if(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value))row[key]=Number(value);else errors.push({code:'INVALID_NUMERIC_TOKEN',field:key});}
      if(rule==='boolean'){if(value==='true'||value==='false')row[key]=value==='true';else errors.push({code:'INVALID_BOOLEAN',field:key});}
      if(['customerIds','planPeriod'].includes(rule)){try{row[key]=JSON.parse(value);}catch{errors.push({code:'INVALID_STRUCTURED_FIELD',field:key});}}
      if(typeof rule==='string'&&rule.startsWith('nullable')&&rule.endsWith('Id')&&['','null'].includes(value))row[key]=null;
     }
     row.source={sourceId,batchId,fingerprint,rowIndex:index+1};
    }
    entries.push({entityType:file.entityType,fileIndex,fileName:file.name,fileFingerprint:fingerprint,rowIndex:index+1,row,errors});
   }
  }
  const fingerprint=await u.hash(fileFingerprints),sameBatch=dataset.importBatches.find(x=>x.batchId===batchId);
  if(sameBatch&&(sameBatch.fingerprint!==fingerprint||sameBatch.sourceId!==sourceId))issues.push({code:'BATCH_ID_CONFLICT'});
  const repeated=dataset.importBatches.some(x=>x.sourceId===sourceId&&x.fingerprint===fingerprint);
  const groups=new Map();for(const entry of entries){const key=entry.entityType+':'+entry.row?.id;const group=groups.get(key)||[];group.push(entry);groups.set(key,group);}
  const seen=new Set();entries.sort((a,b)=>order.indexOf(a.entityType)-order.indexOf(b.entityType)||a.fileIndex-b.fileIndex||a.rowIndex-b.rowIndex);
  for(const entry of entries){const {entityType,row,fileIndex,fileName,fileFingerprint,rowIndex}=entry,key=entityType+':'+row?.id,def=c.entities[entityType],existing=dataset[def.collection].find(x=>x.id===row?.id);let outcome,reason=null;
   const conflicts=groups.get(key).filter(x=>x.row&&fact(x.row)!==fact(row||{}));
   if(entry.errors.length||!row){outcome='REJECT';reason=entry.errors;}
   else if(conflicts.length){outcome='CONFLICT';reason=[{code:'CONFLICTING_INPUT_ROWS'}];}
   else{const errors=v.validateRecord(entityType,row,projected,{requireSynthetic:true}).issues;if(errors.length){outcome='REJECT';reason=errors;}
    else if(seen.has(key)||repeated)outcome='DUPLICATE';
    else if(existing&&fact(existing)===fact(row))outcome='UNCHANGED';
    else if(existing){const resolution=updates.find(x=>x?.entityType===entityType&&x.id===row.id);if(resolution&&Object.keys(resolution).sort().join(',')==='entityType,expectedFingerprint,id'&&resolution.expectedFingerprint===await u.hash(JSON.parse(fact(existing))))outcome='UPDATE';else{outcome='CONFLICT';reason=[{code:'EXPLICIT_UPDATE_FINGERPRINT_REQUIRED'}];}}
    else outcome='CREATE';
   }
   seen.add(key);counts[outcome]++;
   const matchingQuality=reason?.some(x=>['AMBIGUOUS_IDENTITY','CONFLICTING_INPUT_ROWS'].includes(x.code))?'AMBIGUOUS':reason?.some(x=>/^(UNKNOWN_|MISSING_|INVALID_ID)/.test(x.code))?'UNMATCHED':'EXACT';
   const result={entityType,fileIndex,fileName,fileFingerprint,rowIndex,rowFingerprint:row?await u.hash(JSON.parse(fact(row))):null,outcome,matchingQuality,reason};
   if(outcome==='CONFLICT'){result.existing=existing?u.clone(existing):null;result.incoming=u.clone(row);}
   results.push(result);
   if(['CREATE','UPDATE'].includes(outcome)){const rows=projected[def.collection],index=rows.findIndex(x=>x.id===row.id);if(index<0)rows.push(u.clone(row));else rows[index]=u.clone(row);actions.push({entityType,outcome,row:u.clone(row)});}
  }
  const finalCheck=u.checkDataset(projected);if(!finalCheck.valid)issues.push({code:'PROJECTED_DATASET_INVALID',details:finalCheck.issues});
  const status=issues.length||counts.CONFLICT||counts.REJECT?'BLOCKED':repeated?'REPEATED_IMPORT':'READY';
  if(status==='READY')projected.importBatches.push({sourceId,batchId,fingerprint,counts:u.clone(counts),synthetic:true});
  const plan={status,baseRevision,sourceId,batchId,fingerprint,fileFingerprints,results,actions,counts,issues,nextDataset:['READY','REPEATED_IMPORT'].includes(status)?projected:null};plan.planHash=await u.hash(plan);return u.frozen(plan);
 }
 async function commitMultiImport(plan,store){if(!plan||!['READY','REPEATED_IMPORT'].includes(plan.status))return {status:'PREVIEW_NOT_READY'};const {planHash,...payload}=plan;if(planHash!==await u.hash(payload))return {status:'TAMPERED_PREVIEW'};if(plan.status==='REPEATED_IMPORT'){return await u.hash(await store.read())===plan.baseRevision?{status:'NO_CHANGE',counts:plan.counts}:{status:'STALE_PREVIEW'};}const checked=u.checkDataset(plan.nextDataset);if(!checked.valid)return {status:'INVALID_INPUT',issues:checked.issues};return {...await store.writeAtomic(plan.nextDataset,{expectedRevision:plan.baseRevision}),counts:plan.counts};}
 const api={multiImportPreview,commitMultiImport};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).multiImport=api;
})(globalThis);
