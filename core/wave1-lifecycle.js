// SPDX-License-Identifier: Apache-2.0
'use strict';
(function (root) {
  const node = typeof module === 'object' && module.exports;
  const h = node ? require('./wave1-common.js') : root.ScheduleCoreV2.wave1Common;
  const terminal = (type, row) => type === 'Task' ? row.status !== 'pending'
    : row.status !== 'planned' || row.approval === 'cancelled';
  async function current(dataset, revision) {
    return h.digest(revision) && h.state.checkDataset(dataset).valid && await h.state.hash(dataset) === revision;
  }
  async function planTerminal(dataset, request) {
    if (!h.shape(request, ['entityType', 'id', 'operation', 'expectedRevision', 'changes'], ['entityType', 'id', 'operation', 'expectedRevision'])
      || !['Task', 'Activity'].includes(request.entityType) || !h.id(request.id)
      || !['CANCEL', 'COMPLETE', 'EDIT'].includes(request.operation)) return h.fail('INVALID_COMMAND');
    if (!await current(dataset, request.expectedRevision)) return h.fail('INVALID_OR_STALE_DATASET');
    const collection = request.entityType === 'Task' ? 'tasks' : 'activities';
    const before = dataset[collection].find(row => row.id === request.id);
    if (!before) return h.fail('TARGET_UNMATCHED');
    if (request.operation !== 'EDIT' && Object.hasOwn(request, 'changes')) return h.fail('UNEXPECTED_CHANGES');
    const desired = request.operation === 'CANCEL' ? 'cancelled' : request.entityType === 'Task' ? 'done' : 'completed';
    if (terminal(request.entityType, before)) {
      if (request.operation !== 'EDIT' && before.status === desired) return h.result({ status: 'NO_CHANGE', expectedRevision: request.expectedRevision, changes: [], writes: false });
      return h.fail('TERMINAL_STATE_PROTECTED');
    }
    const after = structuredClone(before);
    if (request.operation === 'EDIT') {
      const fields = request.entityType === 'Task' ? ['title', 'dueDate'] : ['title', 'eventDate', 'endDate', 'expenseAmount'];
      if (!h.shape(request.changes, fields, []) || !Object.keys(request.changes).length) return h.fail('INVALID_EDIT_FIELDS');
      Object.assign(after, request.changes);
    } else {
      if (request.entityType === 'Activity' && request.operation === 'COMPLETE' && before.approval !== 'approved') return h.fail('APPROVAL_REQUIRED');
      after.status = desired;
      if (request.entityType === 'Activity' && request.operation === 'CANCEL') after.approval = 'cancelled';
    }
    const next = structuredClone(dataset);
    next[collection][dataset[collection].indexOf(before)] = after;
    if (!h.state.checkDataset(next).valid) return h.fail('INVALID_AFTER_STATE');
    if (h.state.canonical(before) === h.state.canonical(after)) return h.result({ status: 'NO_CHANGE', expectedRevision: request.expectedRevision, changes: [], writes: false });
    return h.result({ status: 'PLANNED', kind: 'TERMINAL', request: structuredClone(request), expectedRevision: request.expectedRevision,
      nextRevision: await h.state.hash(next), changes: [{ entityType: request.entityType, id: before.id, before: structuredClone(before), after }],
      scope: 'OPT_IN_PLAN_ONLY', cascades: false, writes: false, persistence: 'HELD' });
  }
  function withdrawState(dataset, state) {
    if (!h.state.checkDataset(dataset).valid || !h.shape(state, ['formatVersion', 'recommendations', 'associations']) || state.formatVersion !== 1
      || !h.list(state.recommendations) || !h.list(state.associations)) return false;
    const ids = new Set(), recommendations = new Set(), active = new Set(), taskOwners = new Set();
    for (const row of state.recommendations) {
      if (!h.shape(row, ['id', 'title', 'synthetic', 'sourceId']) || !h.id(row.id) || ids.has(row.id) || row.synthetic !== true
        || typeof row.title !== 'string' || !row.title.trim() || !h.id(row.sourceId)) return false;
      ids.add(row.id); recommendations.add(row.id);
    }
    for (const row of state.associations) {
      if (!h.shape(row, ['id', 'recommendationId', 'taskId', 'status', 'synthetic', 'sourceId']) || !h.id(row.id) || ids.has(row.id)
        || row.synthetic !== true || !h.id(row.sourceId) || !recommendations.has(row.recommendationId)
        || !['ACTIVE', 'WITHDRAWN'].includes(row.status) || taskOwners.has(row.taskId)) return false;
      const task = dataset.tasks.find(task => task.id === row.taskId);
      if (!task || task.source.sourceId !== row.sourceId || (row.status === 'ACTIVE' ? task.status !== 'pending' : task.status !== 'cancelled')) return false;
      if (row.status === 'ACTIVE' && active.has(row.recommendationId)) return false;
      if (row.status === 'ACTIVE') active.add(row.recommendationId);
      ids.add(row.id); taskOwners.add(row.taskId);
    }
    return true;
  }
  function validateWithdrawState(dataset, state) {
    return withdrawState(dataset, state) ? h.result({ status: 'VALID', durableWriteThrough: 'HELD', authenticationVerified: false }) : h.fail('INVALID_WITHDRAW_STATE');
  }
  async function planWithdraw(dataset, state, request) {
    if (!h.shape(request, ['recommendationId', 'expectedRevision', 'expectedStateRevision']) || !h.id(request.recommendationId)
      || !withdrawState(dataset, state)) return h.fail('INVALID_WITHDRAW_STATE');
    if (!await current(dataset, request.expectedRevision) || !h.digest(request.expectedStateRevision)
      || await h.state.hash(state) !== request.expectedStateRevision) return h.fail('STALE_REVISION');
    const active = state.associations.find(row => row.recommendationId === request.recommendationId && row.status === 'ACTIVE');
    if (!active) return state.associations.some(row => row.recommendationId === request.recommendationId)
      ? h.result({ status: 'NO_CHANGE', changes: [], writes: false }) : h.fail('ACTIVE_ASSOCIATION_UNMATCHED');
    const before = dataset.tasks.find(row => row.id === active.taskId), after = { ...structuredClone(before), status: 'cancelled' };
    const nextDataset = structuredClone(dataset), nextState = structuredClone(state);
    nextDataset.tasks[nextDataset.tasks.findIndex(row => row.id === before.id)] = after;
    nextState.associations.find(row => row.id === active.id).status = 'WITHDRAWN';
    if (!withdrawState(nextDataset, nextState)) return h.fail('INVALID_AFTER_STATE');
    return h.result({ status: 'PLANNED', kind: 'WITHDRAW', request: structuredClone(request), expectedRevision: request.expectedRevision,
      expectedStateRevision: request.expectedStateRevision, nextRevision: await h.state.hash(nextDataset), nextStateRevision: await h.state.hash(nextState),
      changes: [{ entityType: 'Task', id: before.id, before: structuredClone(before), after }], nextState,
      recommendationPreserved: true, auditPreserved: true, writes: false, persistence: 'HELD', scope: 'EXPLICIT_ASSOCIATION_ONLY' });
  }
  function archiveState(dataset, state) {
    if (!h.state.checkDataset(dataset).valid || !h.shape(state, ['formatVersion', 'archived']) || state.formatVersion !== 1 || !h.list(state.archived)) return false;
    const ids = new Set();
    for (const row of state.archived) {
      if (!h.shape(row, ['entityType', 'id']) || row.entityType !== 'Customer' || !dataset.customers.some(x => x.id === row.id) || ids.has(row.id)) return false;
      ids.add(row.id);
    }
    return true;
  }
  function validateArchiveState(dataset, state) {
    return archiveState(dataset, state) ? h.result({ status: 'VALID', objectScope: 'Customer', durableWriteThrough: 'HELD' }) : h.fail('INVALID_ARCHIVE_STATE');
  }
  async function planArchive(dataset, state, request) {
    if (!h.shape(request, ['entityType', 'id', 'expectedRevision', 'expectedStateRevision']) || request.entityType !== 'Customer'
      || !archiveState(dataset, state)) return h.fail('INVALID_ARCHIVE_SCOPE');
    if (!await current(dataset, request.expectedRevision) || !h.digest(request.expectedStateRevision)
      || await h.state.hash(state) !== request.expectedStateRevision) return h.fail('STALE_REVISION');
    if (!dataset.customers.some(row => row.id === request.id)) return h.fail('TARGET_UNMATCHED');
    if (state.archived.some(row => row.id === request.id)) return h.result({ status: 'NO_CHANGE', changes: [], writes: false });
    const nextState = structuredClone(state);
    nextState.archived.push({ entityType: 'Customer', id: request.id });
    nextState.archived.sort((a, b) => a.id.localeCompare(b.id, 'en-US'));
    const archived = new Set(nextState.archived.map(row => row.id));
    return h.result({ status: 'PLANNED', kind: 'ARCHIVE', request: structuredClone(request), expectedRevision: request.expectedRevision,
      expectedStateRevision: request.expectedStateRevision, nextRevision: request.expectedRevision, nextStateRevision: await h.state.hash(nextState),
      changes: [], nextState, activeCustomerIds: h.sorted(dataset.customers.filter(row => !archived.has(row.id)).map(row => row.id)),
      stableIdsPreserved: true, referencesPreserved: true, writes: false, persistence: 'HELD', scope: 'CUSTOMER_VIEW_ONLY' });
  }
  async function validateCommandPlan(dataset, plan, state = null) {
    if (!h.safe(plan) || plan?.status !== 'PLANNED') return h.fail('INVALID_PLAN');
    const fresh = plan.kind === 'TERMINAL' ? await planTerminal(dataset, plan.request)
      : plan.kind === 'WITHDRAW' ? await planWithdraw(dataset, state, plan.request)
      : plan.kind === 'ARCHIVE' ? await planArchive(dataset, state, plan.request) : null;
    if (!fresh || fresh.status !== 'PLANNED') return h.fail(fresh?.code || 'INVALID_PLAN');
    if (h.state.canonical(fresh) !== h.state.canonical(plan)) return h.fail('TAMPERED_PLAN');
    return h.result({ status: 'VALID', writes: false, scope: 'OPT_IN_PLAN_ONLY', persistence: 'HELD' });
  }
  function deletePrecheck(dataset, request) {
    if (!h.state.checkDataset(dataset).valid || !h.shape(request, ['entityType', 'id', 'eligibility']) || request.eligibility !== 'DECLARED_TEMPORARY') return h.fail('FORMAL_OBJECT_PROTECTED');
    if (request.entityType === 'Task') {
      const row = dataset.tasks.find(x => x.id === request.id);
      if (!row || row.kind !== 'manual' || row.status !== 'pending' || row.activityId !== null || row.customerId !== null || row.productId !== null) return h.fail('FORMAL_OBJECT_PROTECTED');
    } else if (request.entityType === 'Activity') {
      const row = dataset.activities.find(x => x.id === request.id);
      if (!row || row.approval !== 'draft' || row.status !== 'planned' || dataset.tasks.some(x => x.activityId === row.id)) return h.fail('FORMAL_OBJECT_PROTECTED');
    } else return h.fail('FORMAL_OBJECT_PROTECTED');
    return h.result({ status: 'ELIGIBLE_PRECHECK', eligibility: 'CALLER_DECLARED_NOT_AUTHENTICATED', associationScope: 'SCHEMA_2_ONLY',
      limitations: ['EXTERNAL_REFERENCES_NOT_ASSESSED', 'NOT_DELETE_AUTHORIZATION'], writes: false });
  }
  const api = Object.fromEntries(Object.entries({ planTerminal, validateWithdrawState, planWithdraw, validateArchiveState, planArchive, validateCommandPlan, deletePrecheck }).map(([k, fn]) => [k, h.expose(fn)]));
  if (node) module.exports = api; else root.ScheduleCoreV2.wave1Lifecycle = api;
})(globalThis);
