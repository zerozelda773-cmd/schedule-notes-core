// SPDX-License-Identifier: Apache-2.0
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),api=require('../core/index.js'),{generate,scenarios}=require('../generator.cjs');
const data=JSON.parse(fs.readFileSync('fixtures/synthetic.json','utf8')),boundaries=JSON.parse(fs.readFileSync('fixtures/scenarios.json','utf8'));
assert.deepEqual(data,generate());assert.deepEqual(boundaries,scenarios());assert.equal(api.validateDataset(data,{requireSynthetic:true}).valid,true);
for(const r of boundaries.records)assert.equal(r.synthetic,true);for(const m of boundaries.matching){assert.equal(m.synthetic,true);assert.equal(api.resolveIdentity(m.entityType,m.query,data).quality,m.expected);}
console.log('Synthetic provenance, deterministic generation, schema and four matching qualities PASS');
