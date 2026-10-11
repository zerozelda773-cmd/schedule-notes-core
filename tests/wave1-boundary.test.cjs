// SPDX-License-Identifier: Apache-2.0
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const api = require('../core/wave1.js'), old = require('../core/index.js'), f = require('../fixtures/synthetic/wave1.cjs'), root = path.resolve(__dirname, '..');
test('wave1 frozen baseline bytes remain except the explicitly reviewed CAS test correction', () => {
  const guard = require('../fixtures/wave1-frozen-hashes.json'); let checked = 0;
  // The original baseline hash is retained. Only this invalid scheduling assertion is corrected;
  // no runtime, schema, Stable oracle or other protected baseline file changes.
  const correction = {file:'tests/browser.cjs',baseline:'dc274dbb79e49acb7d2887b04b7c1881ab5257af0373f54dd477eae28bc2e2cc',current:'b464ad296b70bf7c541523af2e18028b21ce43f37351eb2a7193b96a36741665'};
  for (const [file, expected] of Object.entries(guard.hashes)) {
    if(file===correction.file)assert.equal(expected,correction.baseline);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),file===correction.file?correction.current:expected,file);checked++;
  }
  assert.ok(checked > 60); assert.equal(guard.publicBaseline, 'c44be137f99aed295bdde0ed4f5e3fbd90aa9b66');
});
test('wave1 root retains 37 stable, 22 experimental and 6 deprecated entries without new root names', () => {
  assert.equal(old.apiRegistry.filter(x => x.status === 'STABLE').length, 37); assert.equal(old.apiRegistry.filter(x => x.status === 'EXPERIMENTAL').length, 22); assert.equal(old.apiRegistry.filter(x => x.status === 'DEPRECATED').length, 6);
  for (const entry of api.apiRegistry) { assert.equal(entry.stability, 'EXPERIMENTAL'); assert.equal(entry.scope, 'PURE_NO_WRITE'); assert.equal(typeof api[entry.name], 'function'); assert.equal(Object.hasOwn(old, entry.name), false); }
  assert.equal(api.apiRegistry.length, 16); assert.equal(Object.hasOwn(api, 'createStore'), false); assert.equal(Object.hasOwn(api, 'commit'), false);
});
test('wave1 browser ESM, CommonJS, registry and declaration exports agree', async () => {
  const esm = await import('../experimental-wave1.mjs'), declaration = fs.readFileSync(path.join(root, 'types/experimental-wave1.d.ts'), 'utf8');
  const names = [...declaration.matchAll(/export declare function (\w+)/g)].map(x => x[1]).sort();
  assert.deepEqual(names, api.apiRegistry.map(x => x.name)); assert.deepEqual(Object.keys(esm).filter(x => !['default', 'apiRegistry'].includes(x)).sort(), names);
  for (const name of names) assert.equal(esm[name], api[name]); assert.equal(esm.default, api); assert.ok(Object.isFrozen(api)); assert.ok(Object.isFrozen(api.apiRegistry));
});
for (const name of ['assessTruth', 'selectPeriods', 'aggregatePeriods', 'summarizeHospitalSales', 'summarizeHospitalProjection', 'candidateEvidence', 'confirmIdentity', 'validateAliases', 'migrationGuard', 'planTerminal', 'validateWithdrawState', 'planWithdraw', 'validateArchiveState', 'planArchive', 'validateCommandPlan', 'deletePrecheck']) test('wave1 ' + name + ' rejects accessors without invoking code', async () => {
  let reads = 0; const hostile = Object.defineProperty({}, 'synthetic', { enumerable: true, get() { reads++; return true; } });
  assert.equal((await api[name](hostile, hostile, hostile)).status, 'FAILED'); assert.equal(reads, 0);
});
for (const [name, value] of [['prototype pollution', JSON.parse('{"__proto__":{"id":"H_SYN_WAVE1"}}')], ['cycle', (() => { const x = {}; x.loop = x; return x; })()], ['nonfinite', { value: NaN }], ['symbol', { [Symbol('Synthetic')]: true }], ['oversized depth', (() => { let x = {}; for (let i = 0; i < 40; i++) x = { nested: x }; return x; })()]]) test('wave1 structured input rejects ' + name, async () => { assert.equal(api.assessTruth(value).status, 'FAILED'); assert.equal((await api.planTerminal(value, {})).status, 'FAILED'); assert.equal(Object.prototype.id, undefined); });
test('wave1 boundary rejects forbidden credentials without echoing input', async () => {
  const example = ['example', 'not', 'a', 'real', 'credential'].join('-'), hostile = { apiKey: example };
  const result = await api.validateAliases(f.dataset(), [hostile]); assert.equal(result.status, 'FAILED'); assert.ok(!JSON.stringify(result).includes(example));
});
test('wave1 schema and package version are unchanged and require no runtime dependencies', () => {
  const pkg = require('../package.json'), lock = require('../package-lock.json'); assert.equal(pkg.version, '0.4.0-candidate.1'); assert.equal(pkg.private, true); assert.equal(lock.version, pkg.version); assert.deepEqual(Object.keys(lock.packages), ['']); assert.equal(pkg.dependencies, undefined); assert.equal(pkg.devDependencies, undefined); assert.equal(old.schemaVersion, 2);
});
test('wave1 independently invented fixture contains only synthetic identities and labels', () => {
  const data = f.dataset(); assert.equal(old.validateDataset(data, { requireSynthetic: true }).valid, true);
  for (const rows of Object.values(data).filter(Array.isArray)) for (const row of rows) {
    assert.equal(row.synthetic, true); assert.match(row.id, /^[A-Z][A-Z0-9]*_SYN_[A-Z0-9_]+$/);
    for (const [field, value] of Object.entries(row)) {
      if ((field === 'name' || field === 'title') && typeof value === 'string') assert.ok(value.startsWith('Synthetic '));
      if (field.endsWith('Id') && value !== null) assert.match(value, /^[A-Z][A-Z0-9]*_SYN_[A-Z0-9_]+$/);
    }
    assert.match(row.source.sourceId, /^SRC_SYN_/);
  }
});
