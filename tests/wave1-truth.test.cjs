// SPDX-License-Identifier: Apache-2.0
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const api = require('../core/wave1.js'), old = require('../core/index.js'), f = require('../fixtures/synthetic/wave1.cjs');
const policy = () => ({ calendar: 'GREGORIAN_MONTH', closedThrough: '2032-03-31' });
test('wave1 known zero needs actual evidence and is distinct from all missing qualities', () => {
  assert.deepEqual(api.assessTruth(f.fact()), { value: 0, truthStatus: 'KNOWN', sourceIds: ['SRC_SYN_WAVE'], isKnownZero: true });
  for (const quality of ['UNKNOWN', 'NO_DATA', 'INCOMPLETE', 'UNMATCHED', 'AMBIGUOUS']) {
    const result = api.assessTruth(f.fact(quality)); assert.equal(result.value, null); assert.equal(result.truthStatus, quality); assert.equal(result.isKnownZero, false);
  }
});
for (const [name, change] of [
  ['budget', x => x.kind = 'budget'], ['no evidence', x => x.sourceIds = []], ['duplicate evidence', x => x.sourceIds.push(x.sourceIds[0])],
  ['nonfinite', x => x.value = Infinity], ['unknown numeric', x => x.quality = 'UNKNOWN'], ['unknown extra field', x => x.override = true]
]) test('wave1 truth rejects ' + name, () => { const fact = f.fact(); change(fact); assert.equal(api.assessTruth(fact).status, 'FAILED'); });
test('wave1 latest eligible months use caller policy; unknown and open month excluded', () => {
  const result = api.selectPeriods(f.buckets(), { ...policy(), mode: 'LATEST_ELIGIBLE', limit: 2 });
  assert.deepEqual(result.selectedIds, ['M_SYN_03', 'M_SYN_01']); assert.equal(result.coverageAssessed, false); assert.equal(result.inferredZero, false);
  assert.deepEqual(result.excluded, [{ id: 'M_SYN_02', reason: 'UNKNOWN' }, { id: 'M_SYN_04', reason: 'NOT_CALENDAR_CLOSED' }]);
});
test('wave1 known zero enters denominator; missing month never becomes zero', () => {
  const result = api.aggregatePeriods(f.buckets(), { ...policy(), bucketIds: ['M_SYN_01', 'M_SYN_02', 'M_SYN_03'] });
  assert.equal(result.value, 15); assert.equal(result.denominator, 2); assert.equal(result.truthStatus, 'INCOMPLETE'); assert.equal(result.method, 'EXPLICIT_KNOWN_MONTH_MEAN');
  assert.deepEqual(result.effectiveIds, ['M_SYN_03', 'M_SYN_01']); assert.equal(result.coverageAssessed, false);
});
test('wave1 unknown-only and empty effective periods both return null with reasons', () => {
  const unknown = api.aggregatePeriods(f.buckets(), { ...policy(), bucketIds: ['M_SYN_02'] });
  assert.equal(unknown.value, null); assert.equal(unknown.denominator, 0); assert.equal(unknown.truthStatus, 'UNKNOWN');
  const empty = api.aggregatePeriods([], { ...policy(), bucketIds: [] }); assert.equal(empty.value, null); assert.equal(empty.truthStatus, 'NO_DATA');
});
test('wave1 full eligible zero is a known mean, not coverage proof', () => {
  const result = api.aggregatePeriods(f.buckets(), { ...policy(), bucketIds: ['M_SYN_01'] }); assert.equal(result.value, 0); assert.equal(result.truthStatus, 'KNOWN'); assert.equal(result.coverageAssessed, false);
});
for (const [name, change] of [
  ['implicit calendar', x => delete x.calendar], ['implicit close', x => delete x.closedThrough], ['implicit limit', x => delete x.limit],
  ['zero limit', x => x.limit = 0], ['mixed selection', x => x.bucketIds = []], ['coverage override', x => x.coverage = 'COMPLETE'], ['invalid close date', x => x.closedThrough = '2032-02-30']
]) test('wave1 selection rejects ' + name, () => { const options = { ...policy(), mode: 'LATEST_ELIGIBLE', limit: 1 }; change(options); assert.equal(api.selectPeriods(f.buckets(), options).status, 'FAILED'); });
for (const [name, change] of [
  ['duplicate month', x => x.push(structuredClone(x[0]))], ['overlap', x => x[1].period = structuredClone(x[0].period)], ['partial month', x => x[0].period.from = '2032-01-02'],
  ['wrong leap boundary', x => x[1].period.to = '2032-02-28'], ['invalid eligibility', x => x[0].eligible = 'yes'], ['sparse list', x => delete x[0]]
]) test('wave1 buckets reject ' + name, () => { const buckets = f.buckets(); change(buckets); assert.equal(api.selectPeriods(buckets, { ...policy(), mode: 'LATEST_ELIGIBLE', limit: 2 }).status, 'FAILED'); });
test('wave1 explicit month IDs reject absent and repeated IDs instead of silently guessing', () => {
  for (const ids of [['M_SYN_MISSING'], ['M_SYN_01', 'M_SYN_01']]) assert.equal(api.aggregatePeriods(f.buckets(), { ...policy(), bucketIds: ids }).status, 'FAILED');
});
test('wave1 eligibility can explicitly exclude otherwise known month', () => {
  const buckets = f.buckets(); buckets[2].eligible = false;
  const result = api.selectPeriods(buckets, { ...policy(), mode: 'LATEST_ELIGIBLE', limit: 3 }); assert.deepEqual(result.selectedIds, ['M_SYN_01']); assert.ok(result.excluded.some(row => row.reason === 'EXPLICITLY_INELIGIBLE'));
});
test('wave1 rejects aggregation overflow', () => {
  const buckets = f.buckets(); buckets[0].truth.value = Number.MAX_VALUE; buckets[2].truth.value = Number.MAX_VALUE;
  assert.equal(api.aggregatePeriods(buckets, { ...policy(), bucketIds: ['M_SYN_01', 'M_SYN_03'] }).code, 'CALCULATION_OVERFLOW');
});
test('wave1 hospital aggregation separates same-name hospitals by stable ID and keeps strict semantics', () => {
  const data = f.dataset(), before = structuredClone(data), result = api.summarizeHospitalSales(data, f.scope());
  assert.equal(result.value, 10); assert.equal(result.truthStatus, 'COMPLETE'); assert.deepEqual(result.calculation.recordIds, ['S_SYN_WAVE1']); assert.deepEqual(result.excludedRecordIds, ['S_SYN_WAVE2']); assert.deepEqual(data, before);
  data.hospitals[0].name = 'Synthetic Renamed'; assert.equal(api.summarizeHospitalSales(data, f.scope()).value, 10);
});
test('wave1 hospital aggregation does not substitute plans or missing amounts for actual', () => {
  const data = f.dataset(); data.sales[0].amount = null; assert.equal(api.summarizeHospitalSales(data, f.scope()).value, null);
  data.sales = []; assert.equal(api.summarizeHospitalSales(data, f.scope()).truthStatus, 'NO_DATA');
});
test('wave1 hospital strict scope rejects unknown IDs, implicit periods and relaxed employee IDs', () => {
  const data = f.dataset(); assert.equal(api.summarizeHospitalSales(data, { ...f.scope(), hospitalId: 'H_SYN_MISSING' }).status, 'FAILED');
  const scope = f.scope(); delete scope.period; assert.equal(api.summarizeHospitalSales(data, scope).status, 'FAILED');
  delete data.sales[0].employeeId; assert.equal(old.validateDataset(data).valid, false); assert.equal(api.summarizeHospitalSales(data, f.scope()).status, 'FAILED');
});
for (const quality of ['UNMATCHED', 'AMBIGUOUS', 'PROBABLE']) test('wave1 projection retains exact hospital/product with ' + quality + ' employee separately from strict schema', () => {
  const fact = f.projection(); fact.employee.quality = quality;
  const result = api.summarizeHospitalProjection([fact], f.scope(), f.dataset()); assert.equal(result.knownValue, 7); assert.equal(result.value, null); assert.deepEqual(result.retainedRecordIds, [fact.id]); assert.equal(result.diagnostics[0].employeeQuality, quality); assert.equal(result.writableToSchema2, false);
});
test('wave1 projection excludes ambiguous hospital rather than name-joining or claiming no data', () => {
  const fact = f.projection(); fact.hospital = { quality: 'AMBIGUOUS', id: null };
  const result = api.summarizeHospitalProjection([fact], f.scope(), f.dataset()); assert.equal(result.knownValue, null); assert.equal(result.truthStatus, 'UNMATCHED'); assert.equal(result.excluded[0].reason, 'UNATTRIBUTED_IDENTITY');
});
test('wave1 projection preserves known zero and unknown amount without coverage promotion', () => {
  const fact = f.projection(); fact.amount = 0; let result = api.summarizeHospitalProjection([fact], f.scope(), f.dataset()); assert.equal(result.knownValue, 0); assert.equal(result.value, null);
  fact.amount = null; result = api.summarizeHospitalProjection([fact], f.scope(), f.dataset()); assert.equal(result.knownValue, null); assert.equal(result.amountTruth, 'INCOMPLETE'); assert.equal(result.coverage, 'NOT_ASSESSED');
});
test('wave1 projection handles returns, ID scope and report period deterministically', () => {
  const a = f.projection(), b = { ...f.projection(), id: 'F_SYN_RETURN', amount: -2, kind: 'return' };
  const expected = api.summarizeHospitalProjection([a, b], f.scope(), f.dataset()); assert.equal(expected.knownValue, 5);
  assert.deepEqual(api.summarizeHospitalProjection([b, a], f.scope(), f.dataset()), expected);
  a.hospital.id = 'H_SYN_WAVE2'; b.eventDate = '2032-03-01'; const result = api.summarizeHospitalProjection([a, b], f.scope(), f.dataset()); assert.equal(result.knownValue, null); assert.equal(result.excluded.length, 2);
});
for (const [name, change] of [['false provenance', x => x.synthetic = false], ['duplicate exact identity mismatch', x => x.hospital.id = 'H_SYN_MISSING'], ['nonexact ID', x => x.employee.id = 'E_SYN_WAVE'], ['sale negative', x => x.amount = -3], ['implicit identity', x => delete x.employee]]) test('wave1 projection rejects ' + name, () => { const fact = f.projection(); change(fact); assert.equal(api.summarizeHospitalProjection([fact], f.scope(), f.dataset()).status, 'FAILED'); });
