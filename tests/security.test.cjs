// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
test('dangerous sink scanner rejects execution, HTML and prototype mutation',()=>{
 const program="import sys;sys.path.insert(0,'tools');from dangerous import dangerous;assert dangerous(('ev'+'al(').encode());assert dangerous(('new Fun'+'ction(').encode());assert dangerous(('node.inner'+'HTML = input').encode());assert dangerous(('Object.set'+'PrototypeOf(x,y)').encode());assert not dangerous(b'node.textContent = input; JSON.parse(text)')";
 const result=spawnSync(process.env.PYTHON||'python',['-c',program],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
