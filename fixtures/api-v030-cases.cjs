// SPDX-License-Identifier: Apache-2.0
'use strict';
// This evaluator cannot write or regenerate a baseline. Expected outputs are frozen JSON.
async function evaluateStable(api,input){
 const data=structuredClone(input.dataset),period=input.period,task=input.task,sales=input.sales;
 const runImport=()=>api.importPreview({format:'json',text:JSON.stringify([sales]),entityType:'SalesRecord',dataset:data,sourceId:'SRC_SYN_BASELINE',batchId:'BATCH_SYN_BASELINE'});
 const outcome={schemaVersion:{value:api.schemaVersion},apiVersion:{value:api.apiVersion},emptyDataset:{value:api.emptyDataset()},
 validatePeriod:{valid:api.validatePeriod(period,'report'),invalid:api.validatePeriod({kind:'plan',from:'2030-02-30',to:'2030-01-01'},'report'),null:api.validatePeriod(null)},
 calendarPeriod:{valid:api.calendarPeriod({periodFor:()=>period},'2030-10-01','report'),missing:api.calendarPeriod(null,'2030-10-01','report'),invalid:api.calendarPeriod({periodFor:()=>({kind:'plan',from:'2030-10-01',to:'2030-10-02'})},'2030-10-01','report')},
 resolveIdentity:{exact:api.resolveIdentity('Hospital',{id:'H_SYN_001'},data),probable:api.resolveIdentity('Employee',{name:'Synthetic Employee 1'},data),ambiguous:api.resolveIdentity('Customer',{name:'Synthetic Same Name'},data),unmatched:api.resolveIdentity('Hospital',{id:'H_SYN_UNKNOWN'},data),scoped:api.resolveIdentity('Department',{name:'Synthetic Shared Department',hospitalId:'H_SYN_002'},data),crossScope:api.resolveIdentity('Department',{id:'D_SYN_001',hospitalId:'H_SYN_002'},data),missingScope:api.resolveIdentity('Department',{id:'D_SYN_001'},data),unknownType:api.resolveIdentity('Unknown',{id:'H_SYN_001'},data)},
 validateRecord:{valid:api.validateRecord('Task',task,data),null:api.validateRecord('Task',null,data),invalid:api.validateRecord('SalesRecord',{...data.sales[0],amount:'0'},data)},
 validateDataset:{valid:api.validateDataset(data,{requireSynthetic:true}),future:api.validateDataset({...data,schemaVersion:999}),null:api.validateDataset(null)},
 summarizeSales:{unknown:api.summarizeSales(data,{productId:'P_SYN_001',period}),zero:api.summarizeSales(data,{productId:'P_SYN_002',period}),invalidPeriod:api.summarizeSales(data,{productId:'P_SYN_001',period:{...period,kind:'plan'}})},
 createTask:{valid:api.createTask(task,data),duplicate:api.createTask(data.tasks[0],data),null:api.createTask(null,data)},
 syncActivityTasks:{approved:api.syncActivityTasks(data.activities[0],data.tasks,data),draft:api.syncActivityTasks(data.activities[1],data.tasks,data),cancelled:api.syncActivityTasks(data.activities[2],data.tasks,data),invalid:api.syncActivityTasks({...data.activities[0],eventDate:'2030-02-30'},data.tasks,data)},
 optional:{keys:Object.keys(api.optional).sort()}};
 for(const [name,methods] of Object.entries({aiProvider:['analyze','suggest'],excelReader:['readRows'],nativeStore:['read','writeAtomic'],calendar:['periodFor']})){
  const adapter=Object.fromEntries(methods.map(m=>[m,()=>null]));outcome['optional.'+name]={valid:api.optional[name](adapter),missing:api.optional[name](null),partial:api.optional[name]({})};
 }
 outcome.importPreview={ready:await runImport(),invalidJson:await api.importPreview({format:'json',text:'{',entityType:'SalesRecord',dataset:data,sourceId:'SRC_SYN_BASELINE',batchId:'BATCH_SYN_BASELINE'})};
 const store=api.createMemoryStore(data),plan=await runImport();
 outcome.commitImport={committed:await api.commitImport(plan,store),stale:await api.commitImport(plan,store),blocked:await api.commitImport({status:'BLOCKED'},store),readback:await store.read()};
 const a=api.createMemoryStore(data),b=api.createMemoryStore(data),copy=await a.read();copy.tasks[0].title='Synthetic Changed Outside Store';
 outcome.createMemoryStore={readbackIsolation:await a.read(),independentStore:await b.read()};
 outcome['store.read']={read:await a.read(),nullPreserved:(await a.read()).sales[3].amount};
 const next=structuredClone(data);next.tasks[0].title='Synthetic Stable Write';
 outcome['store.writeAtomic']={committed:await a.writeAtomic(next),same:await a.writeAtomic(next),stale:await a.writeAtomic(data,{expectedRevision:'0'.repeat(64)}),invalid:await a.writeAtomic({...data,schemaVersion:999}),readback:await a.read()};
 return outcome;
}
module.exports={evaluateStable};
