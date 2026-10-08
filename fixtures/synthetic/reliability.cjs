// SPDX-License-Identifier: Apache-2.0
'use strict';
const {generate}=require('../../generator.cjs');
function schema1(){const data=generate();data.schemaVersion=1;for(const rows of Object.values(data).filter(Array.isArray))for(const row of rows)delete row.source;for(const row of data.sales){row.date=row.eventDate;delete row.eventDate;}for(const row of data.employeePlans){row.month='2030-10';delete row.planPeriod;}return data;}
function multiFiles(){const data=generate(),withoutSource=row=>{const {source,...record}=row;return record;};return Object.entries({SalesRecord:data.sales,Customer:data.customers,Department:data.departments,Hospital:data.hospitals,Product:data.products,Employee:data.employees,Activity:data.activities}).map(([entityType,rows])=>({name:'Synthetic '+entityType+'.json',format:'json',entityType,text:JSON.stringify(rows.map(withoutSource))}));}
function broken(kind){const data=generate();if(kind==='unknown-enum')data.tasks[0].status='unexpected';else if(kind==='future-schema')data.schemaVersion=3;else if(kind==='missing-field')delete data.sales[0].amount;else if(kind==='broken-reference')data.customers[0].hospitalId='H_SYN_MISSING';else if(kind==='unknown-field')data.sales[0].extra=0;else if(kind==='corrupt')data.sales[0].amount='broken';else throw Error('UNKNOWN_SCENARIO');return data;}
module.exports={schema1,multiFiles,broken};
