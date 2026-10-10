// SPDX-License-Identifier: Apache-2.0
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { spawnSync } = require('node:child_process');
test('wave1 actual offline package consumers get separate CJS/ESM/types/docs while private assets stay absent', () => {
  assert.ok(process.env.npm_execpath, 'Run through npm so the exact npm CLI is used');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'schedule-core-wave1-consumer-')), root = path.resolve(__dirname, '..');
  const run = args => { const result = spawnSync(process.execPath, args, { cwd: temp, encoding: 'utf8', windowsHide: true, timeout: 60000 }); assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout); return result.stdout; };
  try {
    const packed = JSON.parse(run([process.env.npm_execpath, 'pack', root, '--ignore-scripts', '--json']));
    const files = packed[0].files.map(x => x.path); assert.ok(files.includes('experimental-wave1.mjs')); assert.ok(files.includes('types/experimental-wave1.d.ts')); assert.ok(files.includes('docs/IMPLEMENTATION-WAVE1.md'));
    assert.ok(!files.some(x => /^(fixtures|tests|\.github|\.git|\.private|android|node_modules)\//.test(x)));
    fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ name: 'synthetic-wave1-consumer', private: true }));
    run([process.env.npm_execpath, 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', './' + packed[0].filename]);
    run(['--input-type=module', '-e', `import assert from 'node:assert/strict'; import {createRequire} from 'node:module'; import wave from 'schedule-notes-core/experimental-wave1'; import original from 'schedule-notes-core'; const require=createRequire(import.meta.url), cjs=require('schedule-notes-core/experimental-wave1'); assert.equal(wave,cjs); assert.equal(cjs.default,wave); assert.equal(Object.getOwnPropertyDescriptor(cjs,'default').enumerable,false); assert.equal(cjs.default.assessTruth({kind:'actual',quality:'KNOWN',value:0,sourceIds:['SRC_SYN_CONSUMER']}).isKnownZero,true); assert.equal(wave.apiRegistry.length,16); assert.equal(original.assessTruth,undefined); assert.equal(wave.assessTruth({kind:'actual',quality:'KNOWN',value:0,sourceIds:['SRC_SYN_CONSUMER']}).isKnownZero,true); assert.throws(()=>require('schedule-notes-core/core/wave1.js'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});`]);
  } finally {
    const resolved = path.resolve(temp); assert.equal(path.dirname(resolved), path.resolve(os.tmpdir())); assert.ok(path.basename(resolved).startsWith('schedule-core-wave1-consumer-'));
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
});
