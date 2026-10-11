// SPDX-License-Identifier: Apache-2.0
'use strict';
module.exports=async function casProbe(){
 const api=globalThis.ScheduleNotesCore,seed=await(await fetch('/fixtures/synthetic.json')).json(),results=[];
 const demand=(v,m)=>{if(!v)throw Error(m);};
 for(const mode of ['original-uncontrolled','delayed-second-initialization','same-revision-barrier']){
  const name='Synthetic CAS closure '+mode,a=api.createIndexedDBStore({name,seed});await a.read();
  let releaseFirst;const firstDone=new Promise(r=>{releaseFirst=r;});let b;
  if(mode==='delayed-second-initialization'){
   const original=indexedDB.open.bind(indexedDB);
   indexedDB.open=(...args)=>{const request=original(...args);return new Proxy(request,{get(t,k){const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;},set(t,k,v){if(k==='onsuccess')t[k]=e=>{firstDone.then(()=>v.call(t,e));};else t[k]=v;return true;}});};
   try{b=api.createIndexedDBStore({name,seed});}finally{indexedDB.open=original;}
  }else b=api.createIndexedDBStore({name,seed});
  let arrivals=0,release;const barrier=new Promise(r=>{release=r;}),trace=[];
  const mutate=side=>async d=>{trace.push({side,snapshot:JSON.stringify(d),amounts:d.sales.map(s=>s.amount)});d.sales[side].amount=side===0?14:18;if(mode==='same-revision-barrier'){if(++arrivals===2)release();await barrier;}};
  const first=a.transaction(mutate(0)).then(out=>{releaseFirst();return out;});
  const out=await Promise.all([first,b.transaction(mutate(1))]),after=await a.read();
  const same=trace[0].snapshot===trace[1].snapshot,oldAssertion=out.filter(x=>x.status==='COMMITTED').length===1&&out.filter(x=>x.status==='STALE_PREVIEW').length===1;
  if(mode==='delayed-second-initialization'){demand(!same,'Ordered reads unexpectedly identical');demand(out.every(x=>x.status==='COMMITTED'),'Ordered valid writes rejected');demand(after.sales[0].amount===14&&after.sales[1].amount===18,'Lost ordered update');demand(!oldAssertion,'Old assertion did not reproduce');}
  if(mode==='same-revision-barrier'){demand(same,'Barrier did not establish same revision');demand(oldAssertion,'Same revision CAS correctness failed');const winner=out[0].status==='COMMITTED'?0:1;demand(winner===0?after.sales[0].amount===14&&after.sales[1].amount===seed.sales[1].amount:after.sales[1].amount===18&&after.sales[0].amount===seed.sales[0].amount,'Loser partially persisted');}
  results.push({mode,status:'PASS',sameSnapshot:same,oldAssertion:oldAssertion?'PASS':'FAIL',outcomes:out.map(x=>x.status),trace:trace.map(({snapshot,...x})=>x),finalAmounts:after.sales.map(x=>x.amount)});await a.close();await b.close();
 }
 return results;
};
