// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const node=typeof module==='object'&&module.exports,load=(name,file)=>node?require(file):root.ScheduleCoreV2[name];
 const c=load('contracts','./contracts.js'),p=load('period','./period.js'),v=load('validation','./validation.js'),i=load('identity','./identity.js'),a=load('analysis','./analysis.js'),t=load('task','./task.js'),s=load('storage','../adapters/storage/memory.js'),imp=load('importer','../adapters/import/importer.js'),optional=load('optional','../adapters/optional/interfaces.js');
 const api=Object.freeze({schemaVersion:2,emptyDataset:c.emptyDataset,migrateDataset:c.migrateDataset,validatePeriod:p.validatePeriod,calendarPeriod:p.calendarPeriod,resolveIdentity:i.resolveIdentity,validateRecord:v.validateRecord,validateDataset:v.validateDataset,summarizeSales:a.summarizeSales,createTask:t.createTask,syncActivityTasks:t.syncActivityTasks,importPreview:imp.importPreview,commitImport:imp.commitImport,createMemoryStore:s.createMemoryStore,optional});
 if(node)module.exports=api;else root.ScheduleNotesCore=api;
})(globalThis);
