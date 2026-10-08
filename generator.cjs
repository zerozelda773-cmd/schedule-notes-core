// Copyright 2026 Schedule Notes Core contributors. SPDX-License-Identifier: Apache-2.0
'use strict';
const fs=require('node:fs'),path=require('node:path'),{emptyDataset}=require('./core/contracts.js');
function generate(){
 const data=emptyDataset(),source={sourceId:'SRC_SYN_001'},wrap=row=>({...row,source:{...source},synthetic:true});
 data.hospitals=[1,2].map(n=>wrap({id:'H_SYN_00'+n,name:'Synthetic Hospital '+n}));
 data.departments=[1,2].map(n=>wrap({id:'D_SYN_00'+n,name:'Synthetic Shared Department',hospitalId:'H_SYN_00'+n}));
 data.employees=[1,2].map(n=>wrap({id:'E_SYN_00'+n,name:'Synthetic Employee '+n}));
 data.customers=[1,2].map(n=>wrap({id:'C_SYN_00'+n,name:'Synthetic Same Name',hospitalId:'H_SYN_00'+n,departmentId:'D_SYN_00'+n}));
 data.products=[1,2].map(n=>wrap({id:'P_SYN_00'+n,name:'Synthetic Product '+n}));
 data.sales=[
 {id:'S_SYN_001',hospitalId:'H_SYN_001',employeeId:'E_SYN_001',productId:'P_SYN_001',eventDate:'2030-10-01',netQuantity:10,amount:30,kind:'sale'},
 {id:'S_SYN_002',hospitalId:'H_SYN_002',employeeId:'E_SYN_002',productId:'P_SYN_002',eventDate:'2030-10-02',netQuantity:0,amount:0,kind:'sale'},
 {id:'S_SYN_003',hospitalId:'H_SYN_001',employeeId:'E_SYN_001',productId:'P_SYN_001',eventDate:'2030-10-03',netQuantity:-2,amount:-6,kind:'return'},
 {id:'S_SYN_004',hospitalId:'H_SYN_001',employeeId:'E_SYN_001',productId:'P_SYN_001',eventDate:'2030-10-04',netQuantity:3,amount:null,kind:'sale'}
 ].map(wrap);
 data.employeePlans=[1,2].map(n=>wrap({id:'PLAN_SYN_00'+n,employeeId:'E_SYN_00'+n,hospitalId:'H_SYN_00'+n,productId:'P_SYN_00'+n,planPeriod:{kind:'plan',from:'2030-10-01',to:'2030-10-31'},plannedVisits:2,plannedActivities:1}));
 data.activities=[
 {id:'A_SYN_001',title:'Synthetic Approved',approval:'approved',status:'planned'},
 {id:'A_SYN_002',title:'Synthetic Draft',approval:'draft',status:'planned'},
 {id:'A_SYN_003',title:'Synthetic Cancelled',approval:'cancelled',status:'cancelled'},
 {id:'A_SYN_004',title:'Synthetic Completed',approval:'approved',status:'completed'}
 ].map(x=>wrap({...x,hospitalId:'H_SYN_001',customerIds:['C_SYN_001'],eventDate:'2030-10-05',endDate:'2030-10-05',expenseAmount:11}));
 data.tasks=[wrap({id:'T_SYN_001',title:'Synthetic manual task',kind:'manual',status:'pending',dueDate:'2030-10-06',activityId:null,customerId:null,productId:null})];
 data.visits=[wrap({id:'V_SYN_001',customerId:'C_SYN_001',employeeId:'E_SYN_001',productId:'P_SYN_001',eventDate:'2030-10-07',status:'completed'})];
 data.observationPeriods=[wrap({id:'OBS_SYN_001',kind:'observation',from:'2030-10-01',to:'2030-10-07'}),wrap({id:'OBS_SYN_002',kind:'observation',from:'2030-10-15',to:'2030-10-31'})];
 return data;
}
function scenarios(){
 const base=generate().sales[0];const wrap=(id,patch)=>({...base,id,...patch,synthetic:true});
 return {schemaVersion:2,synthetic:true,provenance:'Original fixed scenario. No private inputs or fitted distributions.',
 records:[
 wrap('S_SYN_MISSING_HOSPITAL',{hospitalId:null}),
 wrap('S_SYN_UNKNOWN_PRODUCT',{productId:'P_SYN_UNKNOWN'}),
 wrap('S_SYN_INVALID_DATE',{eventDate:'2030-02-30'}),
 wrap('S_SYN_PERIOD_GAP',{eventDate:'2030-10-10'}),
 wrap('S_SYN_NULL',{amount:null}),
 wrap('S_SYN_ZERO',{amount:0,netQuantity:0}),
 wrap('S_SYN_NEGATIVE',{amount:-9,netQuantity:-3,kind:'return'}),
 wrap('S_SYN_DUPLICATE',{}),wrap('S_SYN_DUPLICATE',{})
 ],
 matching:[
 {synthetic:true,entityType:'Customer',query:{id:'C_SYN_001'},expected:'EXACT'},
 {synthetic:true,entityType:'Employee',query:{name:'Synthetic Employee 1'},expected:'PROBABLE'},
 {synthetic:true,entityType:'Customer',query:{name:'Synthetic Same Name'},expected:'AMBIGUOUS'},
 {synthetic:true,entityType:'Customer',query:{id:'C_SYN_UNKNOWN'},expected:'UNMATCHED'},
 {synthetic:true,entityType:'Department',query:{name:'Synthetic Shared Department',hospitalId:'H_SYN_002'},expected:'PROBABLE'}
 ]};
}
if(require.main===module){const out=path.join(__dirname,'fixtures');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'synthetic.json'),JSON.stringify(generate(),null,2)+'\n');fs.writeFileSync(path.join(out,'scenarios.json'),JSON.stringify(scenarios(),null,2)+'\n');console.log('Synthetic schema 2 dataset and boundary scenarios generated from zero');}
module.exports={generate,scenarios};
