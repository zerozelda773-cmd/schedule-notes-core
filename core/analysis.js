// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,p=node?require('./period.js'):root.ScheduleCoreV2.period,v=node?require('./validation.js'):root.ScheduleCoreV2.validation,i=node?require('./identity.js'):root.ScheduleCoreV2.identity;
 function summarizeSales(dataset,{productId,period}={}){
 const result={value:null,truthStatus:'INVALID_INPUT',source:{type:'SalesRecord',sourceIds:[]},period:period||null,entity:{type:'Product',id:productId||null},matchingQuality:'UNMATCHED',completeness:{records:0,knownAmounts:0,coverage:'UNKNOWN'},calculation:{method:'Sum finite net amounts in eventDate range for exact Product ID',field:'amount',recordIds:[]},limitations:[]};
 if(dataset?.schemaVersion!==2||!Array.isArray(dataset.sales)||!Array.isArray(dataset.products)||!Array.isArray(dataset.observationPeriods)||!p.validatePeriod(period,'report').valid){result.limitations.push('INVALID_SCHEMA_OR_REPORT_PERIOD');return result;}
 const identity=i.resolveIdentity('Product',{id:productId},dataset);result.matchingQuality=identity.quality;
 if(identity.quality!=='EXACT'){result.truthStatus=identity.quality==='AMBIGUOUS'?'AMBIGUOUS':'UNMATCHED';result.limitations.push('PRODUCT_NOT_EXACT');return result;}
 const rows=(dataset.sales||[]).filter(r=>r.productId===productId&&(!p.validDate(r.eventDate)||r.eventDate>=period.from&&r.eventDate<=period.to));
 result.source.sourceIds=[...new Set(rows.map(r=>r.source?.sourceId).filter(Boolean))].sort();result.completeness.records=rows.length;
 if(!rows.length){result.truthStatus='NO_DATA';result.limitations.push('NO_RECORDS_IN_PERIOD');return result;}
 const issues=rows.flatMap(r=>v.validateRecord('SalesRecord',r,dataset).issues),duplicate=new Set(rows.map(r=>r.id)).size!==rows.length;
 const observations=(dataset.observationPeriods||[]).filter(o=>result.source.sourceIds.includes(o.source?.sourceId)&&v.validateRecord('ObservationPeriod',o,dataset).valid);
 const covered=result.source.sourceIds.length>0&&result.source.sourceIds.every(id=>p.covers(observations.filter(o=>o.source.sourceId===id),period));result.completeness.coverage=covered?'COMPLETE':'GAP_OR_UNKNOWN';
 result.completeness.knownAmounts=rows.filter(r=>typeof r.amount==='number'&&Number.isFinite(r.amount)).length;
 result.calculation.recordIds=rows.map(r=>r.id);
 if(duplicate)result.limitations.push('DUPLICATE_RECORD');
 result.limitations.push(...new Set(issues.map(x=>x.code)));
 if(!covered)result.limitations.push('OBSERVATION_PERIOD_GAP');
 if(result.completeness.knownAmounts!==rows.length)result.limitations.push('MISSING_AMOUNT');
 if(issues.some(x=>x.code==='AMBIGUOUS_IDENTITY'))result.matchingQuality='AMBIGUOUS';
 else if(issues.some(x=>x.code.startsWith('UNKNOWN_')||x.code==='MISSING_HOSPITAL'))result.matchingQuality='UNMATCHED';
 if(result.limitations.length){result.truthStatus=result.matchingQuality==='AMBIGUOUS'?'AMBIGUOUS':result.matchingQuality==='UNMATCHED'?'UNMATCHED':'INCOMPLETE';return result;}
 const sum=rows.reduce((n,r)=>n+r.amount,0);if(!Number.isFinite(sum)){result.truthStatus='INCOMPLETE';result.limitations.push('CALCULATION_OVERFLOW');return result;}
 result.value=sum;result.truthStatus='COMPLETE';return result;
 }
 const api={summarizeSales};if(node)module.exports=api;else(root.ScheduleCoreV2??={}).analysis=api;
})(globalThis);
