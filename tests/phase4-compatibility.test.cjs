// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),api=require('../core/index.js'),baseline=require('../fixtures/api-contract-baseline.json'),input=require('../fixtures/api-v030-contract.json'),{evaluateStable}=require('../fixtures/api-v030-cases.cjs');
const observations=evaluateStable(api,input);
test('compatibility oracle is pinned to frozen public v0.3.0, not generated from candidate',()=>{
 assert.equal(baseline.release,'v0.3.0');assert.equal(baseline.sha,'31d6f4b7ef2101f8b377c0e02d6b05be22726f2a');assert.equal(input.sourceSHA,baseline.sha);assert.equal(baseline.synthetic,true);assert.equal(Object.keys(baseline.contracts).length,21);
});
for(const [name,entry] of Object.entries(baseline.contracts))test('frozen v0.3.0 Stable contract: '+name,async()=>{
 const actual=await observations;assert.deepEqual(actual[name],entry.expected);
 for(const facet of ['input','output','error','null','identity','period','persistence'])assert.equal(typeof entry.semantics[facet],'string',name+': '+facet);
 assert.equal(api.apiRegistry.find(x=>x.name===name)?.status,'STABLE',name);
});
test('frozen baseline covers all original 21 Stable APIs exactly',async()=>{assert.deepEqual(Object.keys(await observations).sort(),Object.keys(baseline.contracts).sort());});
const promoted=require('../fixtures/api-phase4-contracts.json'),promotedObservations=require('../fixtures/api-v04-cases.cjs').evaluatePromoted(api,input);
for(const [name,entry] of Object.entries(promoted.contracts))test('promoted supported contract: '+name,async()=>{
 assert.deepEqual((await promotedObservations)[name],entry.expected);
 for(const facet of ['input','output','error','null','identity','period','persistence'])assert.equal(typeof entry.semantics[facet],'string',name+': '+facet);
 assert.equal(api.apiRegistry.find(x=>x.name===name)?.status,'STABLE',name);
});
test('every Stable API has seven facets and a tested output oracle; promotions remain separate from v3 freeze',()=>{
 const names=[...Object.keys(baseline.contracts),...Object.keys(promoted.contracts)].sort();assert.equal(new Set(names).size,37);assert.deepEqual(api.apiRegistry.filter(x=>x.status==='STABLE').map(x=>x.name).sort(),names);assert.equal(Object.keys(baseline.contracts).length,21);assert.equal(Object.keys(promoted.contracts).length,16);
});
test('declaration exports cover the complete actual package facade without widening it to any',()=>{
 const fs=require('node:fs'),path=require('node:path'),declaration=fs.readFileSync(path.join(__dirname,'../types/index.d.ts'),'utf8'),names=[...declaration.matchAll(/^export declare const (\w+):/gm)].map(match=>match[1]).sort();assert.deepEqual(names,Object.keys(api).sort());assert.ok(!/\bany\b/.test(declaration));
});
test('the actual original ambient declarations parse without rewriting source text',()=>{
 const fs=require('node:fs'),path=require('node:path'),{stripTypeScriptTypes}=require('node:module');
 for(const name of ['index.d.ts','storage-conformance.d.ts']){const declaration=fs.readFileSync(path.join(__dirname,'../types',name),'utf8');assert.doesNotThrow(()=>stripTypeScriptTypes(declaration,{mode:'strip',sourceUrl:name}));}
});
