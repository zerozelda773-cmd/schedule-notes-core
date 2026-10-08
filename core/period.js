// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 function validDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
 const kinds=['event','plan','observation','report'];
 function validatePeriod(p,expected){const issues=[];if(!p||typeof p!=='object')return {valid:false,issues:[{code:'INVALID_PERIOD'}]};
 if(!kinds.includes(p.kind)||expected&&p.kind!==expected)issues.push({code:'INVALID_PERIOD_KIND'});
 if(!validDate(p.from)||!validDate(p.to)||p.from>p.to)issues.push({code:'INVALID_PERIOD'});
 return {valid:issues.length===0,issues};}
 function covers(periods,p){if(!validatePeriod(p).valid)return false;const spans=periods.filter(x=>validatePeriod(x,'observation').valid).sort((a,b)=>a.from.localeCompare(b.from));let cursor=p.from;
 for(const span of spans){if(span.to<cursor)continue;if(span.from>cursor)return false;if(span.to>=p.to)return true;const d=new Date(span.to+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);cursor=d.toISOString().slice(0,10);}return false;}
 function calendarPeriod(adapter,date,kind){if(!validDate(date)||!adapter||typeof adapter.periodFor!=='function')return {valid:false,issues:[{code:'INVALID_CALENDAR_ADAPTER'}]};const p=adapter.periodFor(date,kind);return validatePeriod(p,kind).valid?{valid:true,period:p}:{valid:false,issues:[{code:'INVALID_ADAPTER_PERIOD'}]};}
 const api={validDate,validatePeriod,covers,calendarPeriod};if(typeof module==='object'&&module.exports)module.exports=api;else(root.ScheduleCoreV2??={}).period=api;
})(globalThis);
