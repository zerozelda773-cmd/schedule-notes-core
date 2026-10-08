// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),u=require('../core/state.js');
test('canonical checksums ignore object key order but preserve null, zero and array order',async()=>{assert.equal(await u.hash({a:1,b:null}),await u.hash({b:null,a:1}));assert.notEqual(await u.hash(null),await u.hash(0));assert.notEqual(await u.hash([1,2]),await u.hash([2,1]));});
test('guard rejects credential fields at every depth without retaining their values',()=>{const value={nested:[{apiKey:'fake'}]},checked=u.guard(value);assert.equal(checked.valid,false);assert.equal(JSON.stringify(checked).includes('fake'),false);});
test('guard rejects cycles, undefined, NaN and class instances',()=>{const cycle={};cycle.x=cycle;for(const x of [cycle,{x:undefined},{x:NaN},{x:new Date()}])assert.equal(u.guard(x).valid,false);});
test('deep frozen public plans cannot be changed',()=>{const value=u.frozen({rows:[{x:1}]});assert.throws(()=>{value.rows[0].x=2;},TypeError);});
test('excessively nested input fails closed without a recursive stack overflow',()=>{let x={};for(let n=0;n<100;n++)x={nested:x};assert.equal(u.guard(x).issues[0].code,'INPUT_COMPLEXITY_LIMIT');});
