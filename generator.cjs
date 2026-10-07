// Copyright 2026 Schedule Notes Core contributors. SPDX-License-Identifier: Apache-2.0
'use strict';
const fs = require('node:fs');
const path = require('node:path');
// Original fixed synthetic scenario, no private-source imports, names, IDs or fitted values.
function generate() {
  const hospitals = [1, 2].map(n => ({ hospitalId: `H_SYN_00${n}`, hospitalName: `虚构医院0${n}`, synthetic: true }));
  const departments = [1, 2].map(n => ({ departmentId: `D_SYN_00${n}`, departmentName: `虚构科室0${n}`, hospitalId: `H_SYN_00${n}`, synthetic: true }));
  const employees = [1, 2].map(n => ({ employeeId: `E_SYN_00${n}`, employeeName: `虚构人员0${n}`, synthetic: true }));
  const customers = [1, 2].map(n => ({ customerId: `C_SYN_00${n}`, customerName: '虚构同名客户', hospitalId: `H_SYN_00${n}`, departmentId: `D_SYN_00${n}`, synthetic: true }));
  const products = [1, 2].map(n => ({ productId: `P_SYN_00${n}`, productName: `虚构产品0${n}`, synthetic: true }));
  const sales = [
    { id: 'S_SYN_001', hospitalId: 'H_SYN_001', employeeId: 'E_SYN_001', productId: 'P_SYN_001', date: '2030-10-01', netBoxes: 7, salesAmount: 21 },
    { id: 'S_SYN_002', hospitalId: 'H_SYN_002', employeeId: 'E_SYN_002', productId: 'P_SYN_002', date: '2030-10-02', netBoxes: 0, salesAmount: 0 },
    { id: 'S_SYN_003', hospitalId: 'H_SYN_001', employeeId: 'E_SYN_001', productId: 'P_SYN_001', date: '2030-10-03', netBoxes: -2, salesAmount: -6 },
    { id: 'S_SYN_004', hospitalId: null, employeeId: 'E_SYN_002', productId: 'P_SYN_001', date: '2030-10-04', netBoxes: 3, salesAmount: null, matchStatus: 'UNMATCHED' }
  ].map(x => ({ ...x, synthetic: true }));
  const employeePlans = [1, 2].map(n => ({ id: `PLAN_SYN_00${n}`, employeeId: `E_SYN_00${n}`, hospitalId: `H_SYN_00${n}`, productId: `P_SYN_00${n}`, month: '2030-10', planVisits: 4, planActivities: 3, synthetic: true }));
  const activity = { id: 'A_SYN_001', type: '合成演示活动', activityDate: '2030-10-05', endDate: '2030-10-05', startTime: '10:00', endTime: '11:00', approvalStatus: '已通过', status: '待执行', hospitalId: 'H_SYN_001', hospitalName: '虚构医院01', departmentId: 'D_SYN_001', departmentName: '虚构科室01', applicantId: 'E_SYN_001', applicantName: '虚构人员01', customerIds: ['C_SYN_001'], productId: 'P_SYN_001', expenseAmount: 13, synthetic: true };
  return { schemaVersion: 1, synthetic: true, generatorVersion: '1', seed: 'fixed-original-scenario-v1', sourcePolicy: 'Generated from zero; no private data input or fitted business values', hospitals, departments, employees, customers, products, sales, employeePlans, activities: [activity, { ...activity, id: 'A_SYN_002', approvalStatus: '草稿' }, { ...activity, id: 'A_SYN_003', approvalStatus: '已取消' }], manualTasks: [{ id: 'T_SYN_001', title: '合成手动任务', sourceType: 'manual', status: 'pending', dueDate: '2030-10-06', synthetic: true }] };
}
if (require.main === module) {
  const out = path.join(__dirname, 'fixtures', 'synthetic.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(generate(), null, 2) + '\n');
  console.log('Synthetic fixture generated without private inputs');
}
module.exports = { generate };
