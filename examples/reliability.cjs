// SPDX-License-Identifier: Apache-2.0
'use strict';
const api=require('../core/index.js'),{schema1}=require('../fixtures/synthetic/reliability.cjs');
async function main(){const store=api.createMemoryStore(api.emptyDataset()),plan=await api.migrationPreview(schema1(),{targetDataset:await store.read()}),migration=await api.commitMigration(plan,store);if(migration.status!=='COMMITTED')throw Error(migration.status);const snapshot=await store.snapshot({generatedAt:'2030-01-01T00:00:00.000Z'}),restored=api.createMemoryStore(api.emptyDataset());if((await restored.restore(snapshot)).status!=='COMMITTED')throw Error('Restore failed');console.log(JSON.stringify({apiVersion:api.apiVersion,schemaVersion:api.schemaVersion,migration:migration.status,restoredSales:(await restored.list('SalesRecord')).length}));}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});module.exports={main};
