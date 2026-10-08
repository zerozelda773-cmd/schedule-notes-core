// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const common={id:'id',synthetic:'boolean',source:'source'};
 const entities={
 Hospital:{collection:'hospitals',fields:{name:'text'}},
 Department:{collection:'departments',fields:{name:'text',hospitalId:'hospitalId'}},
 Employee:{collection:'employees',fields:{name:'text'}},
 Customer:{collection:'customers',fields:{name:'text',hospitalId:'hospitalId',departmentId:'departmentId'}},
 Product:{collection:'products',fields:{name:'text'}},
 SalesRecord:{collection:'sales',fields:{hospitalId:'hospitalId',productId:'productId',employeeId:'employeeId',eventDate:'date',netQuantity:'number',amount:'nullableNumber',kind:['sale','return']}},
 EmployeePlanRecord:{collection:'employeePlans',fields:{employeeId:'employeeId',hospitalId:'hospitalId',productId:'productId',planPeriod:'planPeriod',plannedVisits:'count',plannedActivities:'count'}},
 Activity:{collection:'activities',fields:{title:'text',hospitalId:'hospitalId',customerIds:'customerIds',eventDate:'date',endDate:'date',approval:['draft','approved','cancelled'],status:['planned','completed','cancelled'],expenseAmount:'nullableNumber'}},
 Task:{collection:'tasks',fields:{title:'text',dueDate:'date',status:['pending','done','cancelled'],kind:['manual','prepare','execute','review','visit'],activityId:'nullableActivityId',customerId:'nullableCustomerId',productId:'nullableProductId'}},
 Visit:{collection:'visits',fields:{customerId:'customerId',employeeId:'employeeId',productId:'productId',eventDate:'date',status:['planned','completed','cancelled']}},
 ObservationPeriod:{collection:'observationPeriods',fields:{kind:['observation'],from:'date',to:'date'}}
 };
 for(const def of Object.values(entities)){def.fields={...common,...def.fields};Object.freeze(def.fields);Object.freeze(def);}Object.freeze(entities);
 function emptyDataset(){return {schemaVersion:2,synthetic:true,...Object.fromEntries(Object.values(entities).map(d=>[d.collection,[]])),importBatches:[]};}
 function migrateDataset(data,target=2){if(data?.schemaVersion===2&&target===2)return {status:'NO_CHANGE',dataset:data};
 return {status:'MIGRATION_REQUIRED_MANUAL',dataset:null,limitations:['Version 1 period/source fields cannot be inferred into version 2. No automatic fact conversion.']};}
 const api={schemaVersion:2,entities,emptyDataset,migrateDataset};if(typeof module==='object'&&module.exports)module.exports=api;else(root.ScheduleCoreV2??={}).contracts=api;
})(globalThis);
