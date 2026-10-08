// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {checkSyntax}=require('../scripts/check-types.cjs'),fs=require('node:fs');
test('dangerous sink scanner rejects execution, HTML and prototype mutation',()=>{
 const program="import sys;sys.path.insert(0,'tools');from dangerous import dangerous;assert dangerous(('ev'+'al(').encode());assert dangerous(('new Fun'+'ction(').encode());assert dangerous(('node.inner'+'HTML = input').encode());assert dangerous(('Object.set'+'PrototypeOf(x,y)').encode());assert not dangerous(b'node.textContent = input; JSON.parse(text)')";
 const result=spawnSync(process.env.PYTHON||'python',['-c',program],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
test('explicit TypeScript module parser accepts both actual declaration entry points',()=>{
 for(const file of ['types/index.d.ts','types/storage-conformance.d.ts'])assert.equal(checkSyntax(fs.readFileSync(file,'utf8')).status,'PASS');
});
test('declaration syntax checker rejects malformed TypeScript instead of silently skipping it',()=>{
 assert.equal(checkSyntax('export interface Broken { value: ; }').status,'FAIL');
});
test('declaration syntax checker explicitly does not claim semantic type validation',()=>{
 const result=checkSyntax('export type Unresolved = MissingSemanticType;');assert.equal(result.status,'PASS');assert.equal(result.semanticTypeCheck,false);
});
