// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
test('static scanner rejects constructed credentials and non-synthetic identity',()=>{
  const code="import sys;sys.path.insert(0,'tools');from check import scan,fixture_errors;assert scan(('gh'+'p_'+'x'*36).encode());assert not scan(b'Synthetic fixture');assert fixture_errors({'synthetic':True,'hospitalId':'REAL-ID'});assert not fixture_errors({'synthetic':True,'hospitalId':'H_SYN_001'})";
  const r=spawnSync(process.env.PYTHON||'python',['-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
