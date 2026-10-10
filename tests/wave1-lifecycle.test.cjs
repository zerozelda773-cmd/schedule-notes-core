// SPDX-License-Identifier: Apache-2.0
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const api = require('../core/wave1.js'), state = require('../core/state.js'), old = require('../core/index.js'), f = require('../fixtures/synthetic/wave1.cjs');
const terminalRequest = async (data, operation = 'CANCEL', entityType = 'Task') => ({ entityType, id: entityType === 'Task' ? 'T_SYN_WAVE' : 'A_SYN_WAVE', operation, expectedRevision: await state.hash(data) });
const withdrawRequest = async (data, external) => ({ recommendationId: 'R_SYN_WAVE', expectedRevision: await state.hash(data), expectedStateRevision: await state.hash(external) });
const archiveRequest = async (data, external) => ({ entityType: 'Customer', id: 'C_SYN_WAVE1', expectedRevision: await state.hash(data), expectedStateRevision: await state.hash(external) });
function simulate(data, plan) { const next = structuredClone(data); for (const change of plan.changes) { const collection = change.entityType === 'Task' ? 'tasks' : 'activities'; next[collection][next[collection].findIndex(x => x.id === change.id)] = structuredClone(change.after); } return next; }
test('wave1 Task edit/cancel plans are immutable, input-preserving and revision-bound', async () => {
  const data = f.dataset(), before = structuredClone(data), input = { ...await terminalRequest(data, 'EDIT'), changes: { title: 'Synthetic Edited' } };
  const edited = await api.planTerminal(data, input); assert.equal(edited.status, 'PLANNED'); assert.equal(edited.changes[0].after.title, 'Synthetic Edited'); assert.equal(edited.writes, false); assert.ok(Object.isFrozen(edited.changes[0].after)); assert.deepEqual(data, before);
  const cancelled = await api.planTerminal(data, await terminalRequest(data)); assert.equal(cancelled.changes[0].after.status, 'cancelled'); assert.equal((await api.validateCommandPlan(data, cancelled)).status, 'VALID'); assert.equal(await state.hash(simulate(data, cancelled)), cancelled.nextRevision);
});
for (const status of ['done', 'cancelled']) test('wave1 terminal Task ' + status + ' cannot edit or reopen', async () => {
  const data = f.dataset(); data.tasks[0].status = status;
  assert.equal((await api.planTerminal(data, { ...await terminalRequest(data, 'EDIT'), changes: { title: 'Synthetic Revised' } })).code, 'TERMINAL_STATE_PROTECTED');
  assert.equal((await api.planTerminal(data, { ...await terminalRequest(data, 'EDIT'), changes: { status: 'pending' } })).status, 'FAILED');
  assert.equal((await api.planTerminal(data, await terminalRequest(data, status === 'done' ? 'COMPLETE' : 'CANCEL'))).status, 'NO_CHANGE');
  assert.equal((await api.planTerminal(data, await terminalRequest(data, status === 'done' ? 'CANCEL' : 'COMPLETE'))).code, 'TERMINAL_STATE_PROTECTED');
});
test('wave1 pending Task completion preserves all other business fields', async () => {
  const data = f.dataset(), plan = await api.planTerminal(data, await terminalRequest(data, 'COMPLETE')); assert.deepEqual(plan.changes[0].after, { ...data.tasks[0], status: 'done' });
});
test('wave1 Activity complete requires approval; cancel does not cascade linked manual Tasks', async () => {
  const data = f.dataset(); data.tasks[0].activityId = 'A_SYN_WAVE';
  assert.equal((await api.planTerminal(data, await terminalRequest(data, 'COMPLETE', 'Activity'))).code, 'APPROVAL_REQUIRED');
  const cancel = await api.planTerminal(data, await terminalRequest(data, 'CANCEL', 'Activity')); assert.equal(cancel.changes.length, 1); assert.equal(cancel.changes[0].after.approval, 'cancelled'); assert.equal(cancel.cascades, false); assert.equal(simulate(data, cancel).tasks[0].status, 'pending');
  data.activities[0].approval = 'approved'; assert.equal((await api.planTerminal(data, await terminalRequest(data, 'COMPLETE', 'Activity'))).changes[0].after.status, 'completed');
});
test('wave1 completed/cancelled Activity history is protected only in new scope', async () => {
  for (const [status, approval] of [['completed', 'approved'], ['cancelled', 'cancelled']]) { const data = f.dataset(); Object.assign(data.activities[0], { status, approval }); assert.equal((await api.planTerminal(data, { ...await terminalRequest(data, 'EDIT', 'Activity'), changes: { title: 'Synthetic Changed' } })).code, 'TERMINAL_STATE_PROTECTED'); }
});
for (const [name, change] of [['stale revision', x => x.expectedRevision = '0'.repeat(64)], ['missing target', x => x.id = 'T_SYN_MISSING'], ['unapproved reopen', x => x.operation = 'REOPEN'], ['unexpected payload', x => x.changes = {}], ['unsupported object', x => x.entityType = 'Customer']]) test('wave1 terminal command rejects ' + name, async () => { const data = f.dataset(), input = await terminalRequest(data); change(input); assert.equal((await api.planTerminal(data, input)).status, 'FAILED'); });
test('wave1 edits cannot alter source, identity, lifecycle or references', async () => {
  const data = f.dataset(); for (const changes of [{ id: 'T_SYN_CHANGED' }, { status: 'done' }, { customerId: 'C_SYN_WAVE1' }, { source: { sourceId: 'SRC_SYN_OTHER' } }, { dueDate: 'invalid' }]) assert.equal((await api.planTerminal(data, { ...await terminalRequest(data, 'EDIT'), changes })).status, 'FAILED');
});
test('wave1 plan validator rejects tampered after state and stale current data', async () => {
  const data = f.dataset(), plan = await api.planTerminal(data, await terminalRequest(data)), tampered = structuredClone(plan); tampered.changes[0].after.title = 'Synthetic Tampered'; assert.equal((await api.validateCommandPlan(data, tampered)).code, 'TAMPERED_PLAN');
  data.tasks[0].title = 'Synthetic Concurrent'; assert.equal((await api.validateCommandPlan(data, plan)).status, 'FAILED');
});
test('wave1 async terminal plan captures a consistent snapshot of mutable inputs', async () => {
  const data = f.dataset(), request = await terminalRequest(data), pending = api.planTerminal(data, request); data.tasks[0].title = 'Synthetic Concurrent'; request.operation = 'COMPLETE'; const plan = await pending;
  assert.equal(plan.changes[0].before.title, 'Synthetic Manual Task'); assert.equal(plan.changes[0].after.status, 'cancelled');
});
test('wave1 withdrawal preserves recommendation/audit and removes Task from active query', async () => {
  const data = f.dataset(), external = f.withdraw(), before = structuredClone(external), plan = await api.planWithdraw(data, external, await withdrawRequest(data, external));
  assert.equal(plan.status, 'PLANNED'); assert.equal(plan.nextState.associations[0].status, 'WITHDRAWN'); assert.deepEqual(plan.nextState.recommendations, external.recommendations); assert.equal(plan.nextState.associations[0].id, external.associations[0].id); assert.equal(plan.persistence, 'HELD'); assert.deepEqual(external, before);
  assert.equal((await api.validateCommandPlan(data, plan, external)).status, 'VALID'); const next = simulate(data, plan); const result = await old.createClient({ dataset: next }).query('getCurrentTasks'); assert.equal(result.result.value.tasks.length, 0);
  assert.equal(api.validateWithdrawState(next, plan.nextState).status, 'VALID'); assert.equal((await api.planWithdraw(next, plan.nextState, await withdrawRequest(next, plan.nextState))).status, 'NO_CHANGE');
});
test('wave1 withdraw allows reaccept with a new Task while preserving old withdrawn association', async () => {
  const data = f.dataset(), external = f.withdraw(), plan = await api.planWithdraw(data, external, await withdrawRequest(data, external)), next = simulate(data, plan), associations = structuredClone(plan.nextState);
  next.tasks.push({ ...f.dataset().tasks[0], id: 'T_SYN_SECOND' }); associations.associations.push({ ...external.associations[0], id: 'LINK_SYN_SECOND', taskId: 'T_SYN_SECOND' }); assert.equal(api.validateWithdrawState(next, associations).status, 'VALID'); assert.equal(associations.associations[0].status, 'WITHDRAWN');
  const second = await api.planWithdraw(next, associations, await withdrawRequest(next, associations)); assert.equal(second.changes[0].id, 'T_SYN_SECOND'); assert.equal(second.nextState.associations.length, 2);
});
for (const [name, change] of [
  ['duplicate active association', (d, s) => { d.tasks.push({ ...d.tasks[0], id: 'T_SYN_SECOND' }); s.associations.push({ ...s.associations[0], id: 'LINK_SYN_SECOND', taskId: 'T_SYN_SECOND' }); }],
  ['done Task', d => d.tasks[0].status = 'done'], ['missing Task', (d, s) => s.associations[0].taskId = 'T_SYN_MISSING'], ['wrong source', (d, s) => s.associations[0].sourceId = 'SRC_SYN_OTHER'],
  ['missing recommendation', (d, s) => s.recommendations = []], ['same Task reused', (d, s) => s.associations.push({ ...s.associations[0], id: 'LINK_SYN_SECOND' })]
]) test('wave1 withdraw rejects ' + name, async () => { const data = f.dataset(), external = f.withdraw(); change(data, external); assert.equal(api.validateWithdrawState(data, external).status, 'FAILED'); assert.equal((await api.planWithdraw(data, external, await withdrawRequest(data, external))).status, 'FAILED'); });
test('wave1 withdraw request binds both fact and external-state revision', async () => {
  const data = f.dataset(), external = f.withdraw(), request = await withdrawRequest(data, external); external.recommendations[0].title = 'Synthetic Changed'; assert.equal((await api.planWithdraw(data, external, request)).code, 'STALE_REVISION');
});
test('wave1 withdraw rejects association metadata leakage into schema2', async () => {
  const data = f.dataset(); data.tasks[0].recommendationId = 'R_SYN_WAVE'; assert.equal(api.validateWithdrawState(data, f.withdraw()).status, 'FAILED');
});
test('wave1 archive Customer view preserves stable identity, references and fact revision', async () => {
  const data = f.dataset(), external = f.archive(), before = structuredClone(data), plan = await api.planArchive(data, external, await archiveRequest(data, external));
  assert.equal(plan.status, 'PLANNED'); assert.deepEqual(plan.activeCustomerIds, ['C_SYN_WAVE2']); assert.equal(plan.nextRevision, plan.expectedRevision); assert.deepEqual(plan.changes, []); assert.deepEqual(data, before); assert.equal(data.activities[0].customerIds[0], 'C_SYN_WAVE1'); assert.equal((await api.validateCommandPlan(data, plan, external)).status, 'VALID');
  assert.equal((await api.planArchive(data, plan.nextState, await archiveRequest(data, plan.nextState))).status, 'NO_CHANGE');
});
for (const [name, change] of [['broadened object', x => x.entityType = 'Hospital'], ['missing customer', x => x.id = 'C_SYN_MISSING'], ['stale external revision', x => x.expectedStateRevision = '0'.repeat(64)], ['unarchive operation', x => x.operation = 'UNARCHIVE']]) test('wave1 archive rejects ' + name, async () => { const data = f.dataset(), external = f.archive(), request = await archiveRequest(data, external); change(request); assert.equal((await api.planArchive(data, external, request)).status, 'FAILED'); });
test('wave1 archive validator rejects duplicated and unknown state entries', () => {
  const data = f.dataset(); for (const archived of [[{ entityType: 'Customer', id: 'C_SYN_MISSING' }], [{ entityType: 'Customer', id: 'C_SYN_WAVE1' }, { entityType: 'Customer', id: 'C_SYN_WAVE1' }]]) assert.equal(api.validateArchiveState(data, { formatVersion: 1, archived }).status, 'FAILED');
});
test('wave1 delete is only a bounded precheck, never external-reference proof or execution', () => {
  const data = f.dataset(), request = { entityType: 'Task', id: 'T_SYN_WAVE', eligibility: 'DECLARED_TEMPORARY' }; const result = api.deletePrecheck(data, request); assert.equal(result.status, 'ELIGIBLE_PRECHECK'); assert.ok(result.limitations.includes('NOT_DELETE_AUTHORIZATION')); assert.equal(result.writes, false);
  data.tasks[0].customerId = 'C_SYN_WAVE1'; assert.equal(api.deletePrecheck(data, request).status, 'FAILED'); request.entityType = 'Customer'; assert.equal(api.deletePrecheck(data, request).status, 'FAILED');
});
test('wave1 draft Activity delete precheck fails once referenced or formal', () => {
  const data = f.dataset(), request = { entityType: 'Activity', id: 'A_SYN_WAVE', eligibility: 'DECLARED_TEMPORARY' }; assert.equal(api.deletePrecheck(data, request).status, 'ELIGIBLE_PRECHECK');
  data.tasks[0].activityId = 'A_SYN_WAVE'; assert.equal(api.deletePrecheck(data, request).status, 'FAILED'); data.tasks[0].activityId = null; data.activities[0].approval = 'approved'; assert.equal(api.deletePrecheck(data, request).status, 'FAILED');
});
