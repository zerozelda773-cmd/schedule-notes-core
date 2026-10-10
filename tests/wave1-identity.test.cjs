// SPDX-License-Identifier: Apache-2.0
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const api = require('../core/wave1.js'), state = require('../core/state.js'), f = require('../fixtures/synthetic/wave1.cjs');
const request = () => ({ entityType: 'Hospital', query: { name: 'Synthetic Twin Hospital' }, options: {} });
async function intent(data) { const evidence = structuredClone(await api.candidateEvidence(data, request())); return { entityType: 'Hospital', selectedId: 'H_SYN_WAVE1', namespace: null, selection: 'EXPLICIT', expectedRevision: await state.hash(data), evidence }; }
async function alias(data, id = 'H_SYN_WAVE1', label = 'Synthetic Alias') { return { entityType: 'Hospital', id, namespace: null, alias: label, evidence: { selection: 'EXPLICIT', sourceId: 'SRC_SYN_WAVE', expectedRevision: await state.hash(data) } }; }
test('wave1 candidate evidence never promotes probable candidate and preserves ambiguity under limit', async () => {
  const data = f.dataset(), result = await api.candidateEvidence(data, { ...request(), options: { limit: 1 } });
  assert.equal(result.candidates.quality, 'AMBIGUOUS'); assert.equal(result.candidates.id, null); assert.equal(result.candidates.candidates.length, 1); assert.equal(result.candidates.candidates[0].quality, 'PROBABLE'); assert.equal(result.authenticationVerified, false);
});
test('wave1 identity confirmation separates explicit exact ID lookup from candidate quality', async () => {
  const data = f.dataset(), before = structuredClone(data), result = await api.confirmIdentity(data, await intent(data));
  assert.equal(result.status, 'CONFIRMED'); assert.equal(result.identityQuality, 'EXACT_LOOKUP'); assert.equal(result.candidateQuality, 'AMBIGUOUS'); assert.equal(result.persisted, false); assert.equal(result.authenticationVerified, false); assert.deepEqual(data, before);
});
for (const [name, change] of [['implicit selection', x => x.selection = 'AUTOMATIC'], ['stale revision', x => x.expectedRevision = '0'.repeat(64)], ['absent ID', x => x.selectedId = 'H_SYN_MISSING'], ['foreign namespace', x => x.namespace = 'H_SYN_WAVE2'], ['added intent field', x => x.override = true], ['claimed authentication', x => x.evidence.authenticationVerified = true], ['changed score', x => x.evidence.candidates.candidates[0].score = 0], ['changed fingerprint', x => x.evidence.fingerprint = '0'.repeat(64)]]) test('wave1 confirmation rejects ' + name, async () => { const data = f.dataset(), input = await intent(data); change(input); assert.equal((await api.confirmIdentity(data, input)).status, 'FAILED'); });
test('wave1 evidence selected ID must be visible in current evidence', async () => {
  const data = f.dataset(), input = await intent(data); input.evidence = await api.candidateEvidence(data, { ...request(), options: { limit: 1 } }); input.selectedId = 'H_SYN_WAVE2'; assert.equal((await api.confirmIdentity(data, input)).code, 'SELECTED_ID_NOT_IN_EVIDENCE');
});
test('wave1 old evidence is stale after any dataset revision change', async () => {
  const data = f.dataset(), input = await intent(data); data.hospitals[0].name = 'Synthetic Changed'; input.expectedRevision = await state.hash(data); assert.equal((await api.confirmIdentity(data, input)).code, 'STALE_REVISION');
});
test('wave1 department confirmation requires its exact hospital namespace', async () => {
  const data = f.dataset(), evidence = await api.candidateEvidence(data, { entityType: 'Department', query: { name: 'Synthetic Twin Department', namespace: 'H_SYN_WAVE1' }, options: {} });
  const input = { entityType: 'Department', selectedId: 'D_SYN_WAVE1', namespace: 'H_SYN_WAVE1', selection: 'EXPLICIT', expectedRevision: await state.hash(data), evidence };
  assert.equal((await api.confirmIdentity(data, input)).status, 'CONFIRMED'); input.namespace = 'H_SYN_WAVE2'; assert.equal((await api.confirmIdentity(data, input)).code, 'IDENTITY_SCOPE_MISMATCH');
});
for (const [name, change] of [['unsupported type', x => x.entityType = 'Unknown'], ['unknown query field', x => x.query.id = 'H_SYN_WAVE1'], ['out-of-range threshold', x => x.options.threshold = 2], ['unbounded presentation', x => x.options.limit = 101]]) test('wave1 candidate request rejects ' + name, async () => { const input = request(); change(input); assert.equal((await api.candidateEvidence(f.dataset(), input)).status, 'FAILED'); });
test('wave1 candidate evidence snapshots inputs before async hashing', async () => {
  const data = f.dataset(), before = structuredClone(data), input = request(), pending = api.candidateEvidence(data, input); data.hospitals[0].name = 'Synthetic Concurrent Change'; input.query.name = 'Synthetic Other';
  const result = await pending; assert.equal(result.revision, await state.hash(before)); assert.equal(result.query.name, 'Synthetic Twin Hospital');
});
test('wave1 alias validation preserves stable owners and flags conflicting normalized labels', async () => {
  const data = f.dataset(), a = await alias(data), b = await alias(data, 'H_SYN_WAVE2', '  SYNTHETIC ALIAS '), before = structuredClone(data);
  const result = await api.validateAliases(data, [a, b]); assert.equal(result.status, 'AMBIGUOUS'); assert.equal(result.aliases.length, 2); assert.deepEqual(result.conflicts[0].ownerIds, ['H_SYN_WAVE1', 'H_SYN_WAVE2']); assert.equal(result.durableWriteThrough, 'HELD'); assert.deepEqual(data, before);
  assert.deepEqual(await api.validateAliases(data, [b, a]), result);
});
test('wave1 identical alias evidence deduplicates without creating identity', async () => {
  const data = f.dataset(), a = await alias(data), result = await api.validateAliases(data, [a, structuredClone(a)]); assert.equal(result.status, 'VALID'); assert.equal(result.aliases.length, 1); assert.equal(data.hospitals.length, 2);
});
test('wave1 scoped department aliases remain separate despite identical text', async () => {
  const data = f.dataset(), evidence = { selection: 'EXPLICIT', sourceId: 'SRC_SYN_WAVE', expectedRevision: await state.hash(data) };
  const entries = [1, 2].map(i => ({ entityType: 'Department', id: 'D_SYN_WAVE' + i, namespace: 'H_SYN_WAVE' + i, alias: 'Synthetic Alias', evidence }));
  assert.equal((await api.validateAliases(data, entries)).status, 'VALID'); entries[0].namespace = 'H_SYN_WAVE2'; assert.equal((await api.validateAliases(data, entries)).status, 'FAILED');
});
for (const [name, change] of [['absent owner', x => x.id = 'H_SYN_MISSING'], ['empty alias', x => x.alias = ' '], ['implicit evidence', x => delete x.evidence], ['stale evidence', x => x.evidence.expectedRevision = '0'.repeat(64)], ['nonexplicit evidence', x => x.evidence.selection = 'AUTOMATIC'], ['new metadata', x => x.persisted = true]]) test('wave1 aliases reject ' + name, async () => { const data = f.dataset(), input = await alias(data); change(input); assert.equal((await api.validateAliases(data, [input])).status, 'FAILED'); });
test('wave1 aliases can participate in probable candidates without auto exact', async () => {
  const data = f.dataset(), a = await alias(data), result = await api.candidateEvidence(data, { entityType: 'Hospital', query: { name: a.alias }, options: { aliases: [{ entityType: a.entityType, id: a.id, namespace: a.namespace, alias: a.alias }], threshold: 1 } });
  assert.equal(result.candidates.quality, 'PROBABLE'); assert.equal(result.candidates.id, null);
});
test('wave1 migration guard preserves schema2 and refuses metadata insertion', () => {
  const data = f.dataset(), before = structuredClone(data); assert.equal(api.migrationGuard(data).status, 'NO_MIGRATION'); assert.deepEqual(data, before);
  for (const field of ['aliases', 'withdrawals', 'archiveMetadata']) { const next = structuredClone(data); next[field] = []; assert.equal(api.migrationGuard(next).code, 'SCHEMA_2_EXTENSION_REJECTED'); }
});
test('wave1 migration guard never guesses future or legacy migrations', () => {
  for (const schemaVersion of [1, 3]) { const data = f.dataset(); data.schemaVersion = schemaVersion; assert.equal(api.migrationGuard(data).code, 'EXPLICIT_EXISTING_MIGRATION_REQUIRED'); }
});
