// SPDX-License-Identifier: Apache-2.0
'use strict';
(function (root) {
  const node = typeof module === 'object' && module.exports;
  const h = node ? require('./wave1-common.js') : root.ScheduleCoreV2.wave1Common;
  const period = node ? require('./period.js') : root.ScheduleCoreV2.period;
  const analysis = node ? require('./analysis.js') : root.ScheduleCoreV2.analysis;
  const identity = node ? require('./identity.js') : root.ScheduleCoreV2.identity;
  const qualities = ['KNOWN', 'UNKNOWN', 'NO_DATA', 'INCOMPLETE', 'UNMATCHED', 'AMBIGUOUS'];
  function truth(fact) {
    if (!h.shape(fact, ['kind', 'value', 'quality', 'sourceIds']) || fact.kind !== 'actual'
      || !qualities.includes(fact.quality) || !h.list(fact.sourceIds)
      || !fact.sourceIds.every(h.id) || new Set(fact.sourceIds).size !== fact.sourceIds.length) return null;
    if (fact.quality === 'KNOWN') {
      if (typeof fact.value !== 'number' || !Number.isFinite(fact.value) || !fact.sourceIds.length) return null;
    } else if (fact.value !== null) return null;
    return h.result({ value: fact.value, truthStatus: fact.quality, sourceIds: h.sorted(fact.sourceIds),
      isKnownZero: fact.quality === 'KNOWN' && fact.value === 0 });
  }
  function assessTruth(fact) { return truth(fact) || h.fail('INVALID_ACTUAL_TRUTH'); }
  function inspectBuckets(buckets, options) {
    if (!h.list(buckets) || !h.safe(options) || options.calendar !== 'GREGORIAN_MONTH'
      || !period.validDate(options.closedThrough)) return null;
    const ids = new Set(), spans = [];
    for (const bucket of buckets) {
      if (!h.shape(bucket, ['id', 'period', 'eligible', 'truth']) || !h.id(bucket.id)
        || ids.has(bucket.id) || typeof bucket.eligible !== 'boolean'
        || !h.shape(bucket.period, ['kind', 'from', 'to'])
        || !period.validatePeriod(bucket.period, 'observation').valid || !truth(bucket.truth)) return null;
      const { from, to } = bucket.period;
      const last = new Date(from + 'T00:00:00Z');
      last.setUTCMonth(last.getUTCMonth() + 1, 0);
      if (!from.endsWith('-01') || to !== last.toISOString().slice(0, 10)) return null;
      ids.add(bucket.id); spans.push(bucket);
    }
    spans.sort((a, b) => a.period.from.localeCompare(b.period.from));
    if (spans.some((b, i) => i > 0 && b.period.from <= spans[i - 1].period.to)) return null;
    return spans;
  }
  function excludedReason(bucket, closedThrough) {
    if (bucket.period.to > closedThrough) return 'NOT_CALENDAR_CLOSED';
    if (!bucket.eligible) return 'EXPLICITLY_INELIGIBLE';
    return bucket.truth.quality === 'KNOWN' ? null : bucket.truth.quality;
  }
  function selectPeriods(buckets, options) {
    if (!h.shape(options, ['calendar', 'closedThrough', 'mode', 'limit', 'bucketIds'], ['calendar', 'closedThrough', 'mode'])) return h.fail('EXPLICIT_PERIOD_POLICY_REQUIRED');
    const spans = inspectBuckets(buckets, options);
    if (!spans) return h.fail('INVALID_PERIOD_BUCKETS');
    if (options.mode === 'LATEST_ELIGIBLE') {
      if (Object.hasOwn(options, 'bucketIds') || !Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 10000) return h.fail('EXPLICIT_PERIOD_POLICY_REQUIRED');
    } else if (options.mode === 'EXPLICIT') {
      if (Object.hasOwn(options, 'limit') || !h.list(options.bucketIds) || !options.bucketIds.every(h.id)
        || new Set(options.bucketIds).size !== options.bucketIds.length
        || options.bucketIds.some(id => !spans.some(b => b.id === id))) return h.fail('INVALID_EXPLICIT_BUCKET_IDS');
    } else return h.fail('EXPLICIT_PERIOD_POLICY_REQUIRED');
    const excluded = [], eligible = [];
    for (const b of spans) {
      if (options.mode === 'EXPLICIT' && !options.bucketIds.includes(b.id)) continue;
      const reason = excludedReason(b, options.closedThrough);
      if (reason) excluded.push({ id: b.id, reason }); else eligible.push(b);
    }
    eligible.sort((a, b) => b.period.from.localeCompare(a.period.from));
    const selected = options.mode === 'LATEST_ELIGIBLE' ? eligible.slice(0, options.limit) : eligible;
    return h.result({ status: 'COMPLETE', selectedIds: selected.map(b => b.id), eligibleIds: eligible.map(b => b.id),
      excluded, policy: structuredClone(options), coverageAssessed: false, inferredZero: false });
  }
  function aggregatePeriods(buckets, options) {
    if (!h.shape(options, ['calendar', 'closedThrough', 'bucketIds'])) return h.fail('EXPLICIT_PERIOD_POLICY_REQUIRED');
    const selected = selectPeriods(buckets, { ...options, mode: 'EXPLICIT' });
    if (selected.status === 'FAILED') return selected;
    const effective = selected.selectedIds.map(id => buckets.find(b => b.id === id));
    const sum = effective.reduce((n, b) => n + b.truth.value, 0);
    if (!Number.isFinite(sum)) return h.fail('CALCULATION_OVERFLOW');
    return h.result({ status: 'COMPLETE', value: effective.length ? sum / effective.length : null,
      truthStatus: !effective.length ? (options.bucketIds.length ? 'UNKNOWN' : 'NO_DATA')
        : selected.excluded.length ? 'INCOMPLETE' : 'KNOWN', denominator: effective.length,
      selectedIds: h.sorted(options.bucketIds), effectiveIds: selected.selectedIds, excluded: selected.excluded,
      sourceIds: h.sorted(effective.flatMap(b => b.truth.sourceIds)), method: 'EXPLICIT_KNOWN_MONTH_MEAN',
      coverageAssessed: false, limitations: ['NOT_A_STRICT_PERIOD_TOTAL', 'ELIGIBILITY_IS_CALLER_DECLARED'] });
  }
  function validScope(scope) {
    return h.shape(scope, ['hospitalId', 'productId', 'period']) && h.id(scope.hospitalId) && h.id(scope.productId)
      && h.shape(scope.period, ['kind', 'from', 'to']) && period.validatePeriod(scope.period, 'report').valid;
  }
  function exactScope(dataset, scope) {
    return ['Hospital', 'Product'].every(type => identity.resolveIdentity(type, { id: scope[type === 'Hospital' ? 'hospitalId' : 'productId'] }, dataset).quality === 'EXACT');
  }
  function summarizeHospitalSales(dataset, scope) {
    if (!h.state.checkDataset(dataset).valid || !validScope(scope)) return h.fail('INVALID_SCHEMA_OR_SCOPE');
    if (!exactScope(dataset, scope)) return h.fail('IDENTITY_UNMATCHED');
    const rows = dataset.sales.filter(row => row.hospitalId === scope.hospitalId);
    const summary = analysis.summarizeSales({ ...dataset, sales: rows }, { productId: scope.productId, period: scope.period });
    return h.result({ ...summary, entity: { type: 'HospitalProduct', hospitalId: scope.hospitalId, productId: scope.productId },
      scope: structuredClone(scope), excludedRecordIds: h.sorted(dataset.sales.filter(row => row.hospitalId !== scope.hospitalId).map(row => row.id)) });
  }
  function summarizeHospitalProjection(facts, scope, dataset) {
    if (!h.state.checkDataset(dataset).valid || !validScope(scope) || !h.list(facts)) return h.fail('INVALID_PROJECTION_OR_SCOPE');
    if (!exactScope(dataset, scope)) return h.fail('IDENTITY_UNMATCHED');
    const seen = new Set(), retained = [], excluded = [], diagnostics = [];
    for (const row of facts) {
      if (!h.shape(row, ['id', 'synthetic', 'sourceId', 'hospital', 'product', 'employee', 'eventDate', 'amount', 'kind'])
        || !h.id(row.id) || seen.has(row.id) || row.synthetic !== true || !h.id(row.sourceId)
        || !period.validDate(row.eventDate) || !['sale', 'return'].includes(row.kind)
        || !(row.amount === null || typeof row.amount === 'number' && Number.isFinite(row.amount))
        || row.amount !== null && (row.kind === 'sale' ? row.amount < 0 : row.amount > 0)) return h.fail('INVALID_PROJECTION_FACT');
      seen.add(row.id);
      for (const [key, type] of [['hospital', 'Hospital'], ['product', 'Product'], ['employee', 'Employee']]) {
        const ref = row[key];
        if (!h.shape(ref, ['quality', 'id']) || !['EXACT', 'PROBABLE', 'UNMATCHED', 'AMBIGUOUS'].includes(ref.quality)
          || (ref.quality === 'EXACT' ? !h.id(ref.id) || identity.resolveIdentity(type, { id: ref.id }, dataset).quality !== 'EXACT' : ref.id !== null)) return h.fail('INVALID_PROJECTION_IDENTITY');
      }
      if (row.hospital.quality !== 'EXACT' || row.product.quality !== 'EXACT') {
        excluded.push({ id: row.id, reason: 'UNATTRIBUTED_IDENTITY' });
        diagnostics.push({ id: row.id, hospitalQuality: row.hospital.quality, productQuality: row.product.quality });
      } else if (row.hospital.id !== scope.hospitalId || row.product.id !== scope.productId) excluded.push({ id: row.id, reason: 'OUTSIDE_ID_SCOPE' });
      else if (row.eventDate < scope.period.from || row.eventDate > scope.period.to) excluded.push({ id: row.id, reason: 'OUTSIDE_REPORT_PERIOD' });
      else {
        retained.push(row);
        if (row.employee.quality !== 'EXACT') diagnostics.push({ id: row.id, employeeQuality: row.employee.quality });
      }
    }
    retained.sort((a, b) => a.id.localeCompare(b.id));
    excluded.sort((a, b) => a.id.localeCompare(b.id)); diagnostics.sort((a, b) => a.id.localeCompare(b.id));
    const known = retained.filter(row => row.amount !== null), knownValue = known.reduce((n, row) => n + row.amount, 0);
    if (!Number.isFinite(knownValue)) return h.fail('CALCULATION_OVERFLOW');
    return h.result({ status: 'COMPLETE', value: null, knownValue: known.length ? knownValue : null,
      amountTruth: !retained.length ? 'NO_DATA' : known.length === retained.length ? 'KNOWN' : 'INCOMPLETE',
      truthStatus: retained.length ? 'INCOMPLETE' : excluded.some(row => row.reason === 'UNATTRIBUTED_IDENTITY') ? 'UNMATCHED' : 'NO_DATA', retainedRecordIds: retained.map(row => row.id), excluded,
      unknownAmountIds: retained.filter(row => row.amount === null).map(row => row.id), diagnostics,
      sourceIds: h.sorted(retained.map(row => row.sourceId)), scope: structuredClone(scope),
      coverage: 'NOT_ASSESSED', writableToSchema2: false, limitations: ['READ_ONLY_PROJECTION', 'COVERAGE_NOT_ASSESSED'] });
  }
  const api = Object.fromEntries(Object.entries({ assessTruth, selectPeriods, aggregatePeriods, summarizeHospitalSales, summarizeHospitalProjection }).map(([k, fn]) => [k, h.expose(fn)]));
  if (node) module.exports = api; else root.ScheduleCoreV2.wave1Truth = api;
})(globalThis);
