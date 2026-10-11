// SPDX-License-Identifier: Apache-2.0
'use strict';
const { emptyDataset } = require('../../core/contracts.js');
const source = () => ({ sourceId: 'SRC_SYN_WAVE' });
const base = id => ({ id, synthetic: true, source: source() });
function dataset() {
  const data = emptyDataset();
  data.hospitals = [1, 2].map(i => ({ ...base('H_SYN_WAVE' + i), name: 'Synthetic Twin Hospital' }));
  data.departments = [1, 2].map(i => ({ ...base('D_SYN_WAVE' + i), name: 'Synthetic Twin Department', hospitalId: 'H_SYN_WAVE' + i }));
  data.employees = [{ ...base('E_SYN_WAVE'), name: 'Synthetic Employee' }];
  data.customers = [1, 2].map(i => ({ ...base('C_SYN_WAVE' + i), name: 'Synthetic Customer ' + i, hospitalId: 'H_SYN_WAVE' + i, departmentId: 'D_SYN_WAVE' + i }));
  data.products = [{ ...base('P_SYN_WAVE'), name: 'Synthetic Product' }];
  data.sales = [1, 2].map(i => ({ ...base('S_SYN_WAVE' + i), hospitalId: 'H_SYN_WAVE' + i, productId: 'P_SYN_WAVE', employeeId: 'E_SYN_WAVE', eventDate: '2032-02-10', amount: i * 10, netQuantity: i, kind: 'sale' }));
  data.activities = [{ ...base('A_SYN_WAVE'), title: 'Synthetic Activity', hospitalId: 'H_SYN_WAVE1', customerIds: ['C_SYN_WAVE1'], eventDate: '2032-02-10', endDate: '2032-02-11', approval: 'draft', status: 'planned', expenseAmount: null }];
  data.tasks = [{ ...base('T_SYN_WAVE'), title: 'Synthetic Manual Task', dueDate: '2032-02-10', status: 'pending', kind: 'manual', activityId: null, customerId: null, productId: null }];
  data.observationPeriods = [{ ...base('O_SYN_WAVE'), kind: 'observation', from: '2032-02-01', to: '2032-02-29' }];
  return data;
}
const scope = () => ({ hospitalId: 'H_SYN_WAVE1', productId: 'P_SYN_WAVE', period: { kind: 'report', from: '2032-02-01', to: '2032-02-29' } });
const fact = (quality = 'KNOWN', value = 0) => ({ kind: 'actual', quality, value: quality === 'KNOWN' ? value : null, sourceIds: quality === 'KNOWN' ? ['SRC_SYN_WAVE'] : [] });
function buckets() {
  return [['01', '31', 'KNOWN', 0], ['02', '29', 'UNKNOWN', null], ['03', '31', 'KNOWN', 30], ['04', '30', 'KNOWN', 40]].map(([month, last, quality, value]) => ({ id: 'M_SYN_' + month, period: { kind: 'observation', from: '2032-' + month + '-01', to: '2032-' + month + '-' + last }, eligible: true, truth: fact(quality, value) }));
}
const projection = () => ({ id: 'F_SYN_WAVE', synthetic: true, sourceId: 'SRC_SYN_WAVE', hospital: { quality: 'EXACT', id: 'H_SYN_WAVE1' }, product: { quality: 'EXACT', id: 'P_SYN_WAVE' }, employee: { quality: 'UNMATCHED', id: null }, eventDate: '2032-02-10', amount: 7, kind: 'sale' });
const withdraw = () => ({ formatVersion: 1, recommendations: [{ id: 'R_SYN_WAVE', title: 'Synthetic Recommendation', synthetic: true, sourceId: 'SRC_SYN_WAVE' }], associations: [{ id: 'LINK_SYN_WAVE', recommendationId: 'R_SYN_WAVE', taskId: 'T_SYN_WAVE', status: 'ACTIVE', synthetic: true, sourceId: 'SRC_SYN_WAVE' }] });
const archive = () => ({ formatVersion: 1, archived: [] });
module.exports = { dataset, scope, fact, buckets, projection, withdraw, archive };
