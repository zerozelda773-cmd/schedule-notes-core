// SPDX-License-Identifier: Apache-2.0
'use strict';
const {performance}=require('node:perf_hooks'),api=require('../core/index.js'),state=require('../core/state.js'),{generate}=require('../generator.cjs');
// Trend evidence only. No elapsed-time correctness threshold; all cases use fixed synthetic facts.
async function measured(operation,run){const start=performance.now(),value=await run();return {operation,durationMs:Number((performance.now()-start).toFixed(3)),value};}
function dataset(size){const data=generate(),source={sourceId:'SRC_SYN_BENCHMARK'};data.sales=Array.from({length:size},(_,i)=>({...data.sales[0],id:'S_SYN_BENCH_'+String(i+1).padStart(6,'0'),amount:i%7,netQuantity:i%3,source}));data.observationPeriods=data.observationPeriods.map(row=>({...row,source}));return data;}
async function benchmark(sizes=[10,100,1000],facade=api){
 const result={synthetic:true,method:'Single-process sequential trend observations; no wall-clock correctness gate.',runtime:process.version,sizes:[],correctness:true};
 for(const size of sizes){const data=dataset(size),store=facade.createMemoryStore(data),timestamp='2030-01-01T00:00:00.000Z',rows=data.sales.map(({source,...fact})=>fact),empty={...data,sales:[]},operations=[];
  const check=(label,condition)=>{if(!condition)throw new Error('BENCHMARK_CORRECTNESS_'+label);};
  let x=await measured('import',()=>facade.importPreview({format:'json',text:JSON.stringify(rows),entityType:'SalesRecord',dataset:empty,sourceId:'SRC_SYN_BENCHMARK',batchId:'BATCH_SYN_BENCHMARK'}));check('IMPORT',x.value.status==='READY'&&x.value.counts.valid===size);operations.push({operation:x.operation,durationMs:x.durationMs});
  x=await measured('identity',()=>{let found=0;for(let i=0;i<size;i++)found+=facade.resolveIdentity('Hospital',{id:'H_SYN_001'},data).quality==='EXACT';return found;});check('IDENTITY',x.value===size);operations.push({operation:x.operation,durationMs:x.durationMs});
  x=await measured('migration',()=>facade.migrationPreview(data,{targetDataset:empty}));check('MIGRATION',x.value.status==='NO_CHANGE'&&x.value.dataset.sales.length===size);operations.push({operation:x.operation,durationMs:x.durationMs});
  x=await measured('snapshot',()=>facade.exportSnapshot(data,{generatedAt:timestamp}));const snapshot=x.value;check('SNAPSHOT',(await facade.validateSnapshot(snapshot)).valid);operations.push({operation:x.operation,durationMs:x.durationMs});
  x=await measured('restore',async()=>{const target=facade.createMemoryStore(empty),plan=await facade.restorePreview(snapshot,target),committed=await facade.restoreSnapshot(plan,target);return {committed,records:await target.read()};});check('RESTORE',x.value.committed.status==='COMMITTED'&&await state.hash(x.value.records)===await state.hash(data));operations.push({operation:x.operation,durationMs:x.durationMs});
  x=await measured('analysis',()=>facade.summarizeSales(data,{productId:'P_SYN_001',period:{kind:'report',from:'2030-10-01',to:'2030-10-01'}}));check('ANALYSIS',x.value.truthStatus==='COMPLETE'&&x.value.value===rows.reduce((n,r)=>n+r.amount,0));operations.push({operation:x.operation,durationMs:x.durationMs});
  await store.close();result.sizes.push({records:size,operations});
 }return result;
}
if(require.main===module)benchmark().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={benchmark};
