// SPDX-License-Identifier: Apache-2.0
'use strict';
(function (root) {
  const node = typeof module === 'object' && module.exports;
  const h = node ? require('./wave1-common.js') : root.ScheduleCoreV2.wave1Common;
  const matching = node ? require('./matching.js') : root.ScheduleCoreV2.matching;
  const identity = node ? require('./identity.js') : root.ScheduleCoreV2.identity;
  const contracts = node ? require('./contracts.js') : root.ScheduleCoreV2.contracts;
  function validNamespace(type, namespace) { return type === 'Department' ? h.id(namespace) : namespace === null; }
  async function candidateEvidence(dataset, request) {
    if (!h.shape(request, ['entityType', 'query', 'options']) || !h.state.checkDataset(dataset).valid
      || !Object.hasOwn(contracts.entities, request.entityType)) return h.fail('INVALID_MATCHING_REQUEST');
    const candidates = matching.candidates(request.entityType, request.query, dataset, request.options);
    if (candidates.error?.code === 'VALIDATION_ERROR') return h.fail('INVALID_MATCHING_REQUEST');
    const revision = await h.state.hash(dataset);
    const body = { entityType: request.entityType, query: structuredClone(request.query), options: structuredClone(request.options), revision, candidates };
    return h.result({ status: 'COMPLETE', ...body, fingerprint: await h.state.hash(body), authenticationVerified: false });
  }
  async function confirmIdentity(dataset, intent) {
    if (!h.shape(intent, ['entityType', 'selectedId', 'namespace', 'selection', 'expectedRevision', 'evidence'])
      || !h.state.checkDataset(dataset).valid || intent.selection !== 'EXPLICIT'
      || !h.id(intent.selectedId) || !validNamespace(intent.entityType, intent.namespace)
      || !h.digest(intent.expectedRevision)) return h.fail('EXPLICIT_SELECTION_REQUIRED');
    const revision = await h.state.hash(dataset);
    if (intent.expectedRevision !== revision) return h.fail('STALE_REVISION');
    const evidence = intent.evidence;
    if (!h.shape(evidence, ['status', 'entityType', 'query', 'options', 'revision', 'candidates', 'fingerprint', 'authenticationVerified'])
      || evidence.status !== 'COMPLETE' || evidence.entityType !== intent.entityType || evidence.authenticationVerified !== false) return h.fail('INVALID_CANDIDATE_EVIDENCE');
    if (evidence.revision !== revision) return h.fail('STALE_REVISION');
    const fresh = await candidateEvidence(dataset, { entityType: evidence.entityType, query: evidence.query, options: evidence.options });
    if (fresh.status !== 'COMPLETE' || h.state.canonical(fresh) !== h.state.canonical(evidence)) return h.fail('TAMPERED_CANDIDATE_EVIDENCE');
    if (intent.entityType === 'Department' && evidence.query.namespace !== intent.namespace) return h.fail('IDENTITY_SCOPE_MISMATCH');
    const found = identity.resolveIdentity(intent.entityType, { id: intent.selectedId, hospitalId: intent.namespace }, dataset);
    if (found.quality !== 'EXACT') return h.fail(found.quality === 'AMBIGUOUS' ? 'IDENTITY_AMBIGUOUS' : 'IDENTITY_UNMATCHED');
    if (!evidence.candidates.candidates.some(row => row.id === intent.selectedId)) return h.fail('SELECTED_ID_NOT_IN_EVIDENCE');
    return h.result({ status: 'CONFIRMED', entityType: intent.entityType, id: intent.selectedId, namespace: intent.namespace,
      revision, evidenceFingerprint: evidence.fingerprint, candidateQuality: evidence.candidates.quality,
      identityQuality: 'EXACT_LOOKUP', selection: 'DECLARED_EXPLICIT_SELECTION', authenticationVerified: false, persisted: false });
  }
  async function validateAliases(dataset, entries) {
    if (!h.state.checkDataset(dataset).valid || !h.list(entries)) return h.fail('INVALID_ALIAS_REGISTRY');
    const revision = await h.state.hash(dataset), aliases = [], seen = new Set(), owners = new Map();
    for (const entry of entries) {
      if (!h.shape(entry, ['entityType', 'id', 'namespace', 'alias', 'evidence'])
        || !validNamespace(entry.entityType, entry.namespace)
        || !h.shape(entry.evidence, ['selection', 'sourceId', 'expectedRevision'])
        || entry.evidence.selection !== 'EXPLICIT' || !h.id(entry.evidence.sourceId)) return h.fail('INVALID_ALIAS_EVIDENCE');
      if (entry.evidence.expectedRevision !== revision) return h.fail('STALE_REVISION');
      const checked = matching.createAliasRegistry(dataset, [{ entityType: entry.entityType, id: entry.id, namespace: entry.namespace, alias: entry.alias }]);
      if (checked.status !== 'COMPLETE') return h.fail('INVALID_ALIAS_OWNER_OR_SCOPE');
      const key = JSON.stringify([entry.entityType, entry.namespace, matching.normalize(entry.alias)]);
      const fingerprint = await h.state.hash({ label: matching.normalize(entry.alias) });
      if (!owners.has(key)) owners.set(key, { entityType: entry.entityType, namespace: entry.namespace, labelFingerprint: fingerprint, ids: new Set() });
      owners.get(key).ids.add(entry.id);
      const entryKey = h.state.canonical(entry);
      if (!seen.has(entryKey)) { aliases.push(structuredClone(entry)); seen.add(entryKey); }
    }
    aliases.sort((a, b) => h.state.canonical(a).localeCompare(h.state.canonical(b), 'en-US'));
    const conflicts = [...owners.values()].filter(x => x.ids.size > 1).map(({ ids, ...rest }) => ({ ...rest, ownerIds: h.sorted([...ids]) }))
      .sort((a, b) => h.state.canonical(a).localeCompare(h.state.canonical(b), 'en-US'));
    return h.result({ status: conflicts.length ? 'AMBIGUOUS' : 'VALID', aliases, conflicts, revision,
      fingerprint: await h.state.hash(aliases), authenticationVerified: false, durableWriteThrough: 'HELD' });
  }
  function migrationGuard(dataset) {
    if (!h.safe(dataset)) return h.fail('UNSAFE_MIGRATION_INPUT');
    if (dataset?.schemaVersion !== 2) return h.fail('EXPLICIT_EXISTING_MIGRATION_REQUIRED');
    if (!h.state.checkDataset(dataset).valid) return h.fail('SCHEMA_2_EXTENSION_REJECTED');
    return h.result({ status: 'NO_MIGRATION', schemaVersion: 2, modifiesDataset: false,
      aliasMetadata: 'NOT_PRESENT', newMetadataPersistence: 'HELD' });
  }
  const api = Object.fromEntries(Object.entries({ candidateEvidence, confirmIdentity, validateAliases, migrationGuard }).map(([k, fn]) => [k, h.expose(fn)]));
  if (node) module.exports = api; else root.ScheduleCoreV2.wave1Identity = api;
})(globalThis);
