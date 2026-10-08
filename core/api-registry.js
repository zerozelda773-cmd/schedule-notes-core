// SPDX-License-Identifier: Apache-2.0
'use strict';
(function(root){
 const stable=['schemaVersion','apiVersion','emptyDataset','validatePeriod','calendarPeriod','resolveIdentity','validateRecord','validateDataset','summarizeSales','createTask','syncActivityTasks','importPreview','commitImport','createMemoryStore','optional','optional.aiProvider','optional.excelReader','optional.nativeStore','optional.calendar','store.read','store.writeAtomic'];
 const experimental=['apiRegistry','migrationRegistry','createIndexedDBStore','exportSnapshot','validateSnapshot','restorePreview','restoreSnapshot','migrationPreview','commitMigration','multiImportPreview','commitMultiImport','syncActivityTasksAtomic','store.get','store.put','store.delete','store.list','store.transaction','store.snapshot','store.restore','store.recoveryStatus','store.exportRecovery','store.recover','store.metadata','store.close'];
 const internal=['ScheduleCoreV2','core/state.js','adapters/storage/contract.js','core/contracts.js','core/validation.js','core/period.js','core/task.js','core/identity.js','core/analysis.js','core/snapshot.js','core/migration.js','core/transactions.js','adapters/storage/indexeddb.js','adapters/import/multi.js','adapters/import/importer.js','adapters/storage/memory.js','adapters/optional/interfaces.js'];
 const legacy=['validDate','activityTasks','visitTask','salesSummary','createStore'];
 const apiRegistry=Object.freeze([
  ...stable.map(name=>Object.freeze({name,status:'STABLE',since:name==='apiVersion'?'1.0':'v0.2.0',compatibility:'Documented supported schema 2 inputs and return semantics retained.'})),
  ...experimental.map(name=>Object.freeze({name,status:'EXPERIMENTAL',since:'1.0',compatibility:'Additive development API; review migration notes before adopting.'})),
  Object.freeze({name:'migrateDataset',status:'DEPRECATED',since:'v0.2.0',deprecatedIn:'1.0',replacement:'migrationPreview + commitMigration',removal:'Not before API major 2.0; remains callable with v0.2.0 semantics.'}),
  ...legacy.map(name=>Object.freeze({name:'legacy.'+name,status:'DEPRECATED',since:'v0.1.0',deprecatedIn:'1.0',replacement:({validDate:'validatePeriod',activityTasks:'syncActivityTasksAtomic',visitTask:'createTask',salesSummary:'summarizeSales',createStore:'createIndexedDBStore'})[name],removal:'Not before API major 2.0; legacy core/core.js remains callable.'})),
  ...internal.map(name=>Object.freeze({name,status:'INTERNAL',compatibility:'Implementation modules are not supported application entry points.'}))
 ]);const api={apiRegistry};if(typeof module==='object'&&module.exports)module.exports=api;else(root.ScheduleCoreV2??={}).registry=api;
})(globalThis);
