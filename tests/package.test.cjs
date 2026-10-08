// SPDX-License-Identifier: Apache-2.0
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('a real offline tarball consumer imports ESM and CJS without repository internals',async()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'schedule-core-consumer-')),root=path.resolve(__dirname,'..'),npm=process.env.npm_execpath;
 assert.ok(npm,'Run this consumer test through npm');
 const run=(args,cwd=root)=>{const out=spawnSync(process.execPath,[npm,...args],{cwd,encoding:'utf8',windowsHide:true,timeout:60000});assert.equal(out.status,0,out.stderr);return out.stdout;};
 try{
  const packed=JSON.parse(run(['pack','--ignore-scripts','--json','--pack-destination',temporary]))[0];
  assert.ok(packed.files.some(x=>x.path==='index.mjs'));assert.ok(packed.files.some(x=>x.path==='types/index.d.ts'));
  assert.ok(packed.files.every(x=>!/(^|\/)(?:\.git|\.private|fixtures|tests|demo|tools)(\/|$)/.test(x.path)));
  fs.writeFileSync(path.join(temporary,'package.json'),JSON.stringify({name:'synthetic-external-consumer',private:true,type:'module'}));
  run(['install','--offline','--ignore-scripts','--no-audit','--no-fund',path.join(temporary,packed.filename)],temporary);
  const esm="import core,{createClient,createMemoryStore} from 'schedule-notes-core';import * as exported from 'schedule-notes-core'; import {runStorageCompatibilitySuite} from 'schedule-notes-core/adapter-test-suite'; if(core.schemaVersion!==2 || typeof createClient!=='function'||typeof createMemoryStore!=='function'||typeof runStorageCompatibilitySuite!=='function')throw Error('Bad ESM');if(JSON.stringify(Object.keys(core).sort())!==JSON.stringify(Object.keys(exported).filter(x=>x!=='default').sort()))throw Error('ESM surface differs from declared facade');for(const name of Object.keys(core))if(exported[name]!==core[name])throw Error('ESM binding mismatch');const c=createClient(); const q=await c.query('getCurrentTasks');if(q.result.status==='FAILED')throw Error('Headless query failed'); console.log('ESM consumer PASS')";
  fs.writeFileSync(path.join(temporary,'consumer.mjs'),esm);
  const checked=spawnSync(process.execPath,['consumer.mjs'],{cwd:temporary,encoding:'utf8',windowsHide:true});assert.equal(checked.status,0,checked.stderr);
  const cjs=spawnSync(process.execPath,['-e',"const c=require('schedule-notes-core');if(c.apiVersion!=='1.0')throw Error('Bad CJS');let blocked=false;try{require('schedule-notes-core/core/state.js')}catch(e){blocked=e.code==='ERR_PACKAGE_PATH_NOT_EXPORTED'}if(!blocked)throw Error('Internal export open')"],{cwd:temporary,encoding:'utf8',windowsHide:true});assert.equal(cjs.status,0,cjs.stderr);
 }finally{
  const resolved=path.resolve(temporary);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('schedule-core-consumer-'));fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
});
