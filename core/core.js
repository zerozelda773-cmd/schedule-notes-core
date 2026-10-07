/* Copyright 2026 Schedule Notes Core contributors. SPDX-License-Identifier: Apache-2.0 */
'use strict';
(function(root) {
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value;
  }
  function activityTasks(activity, existing = []) {
    if (!activity.id || !validDate(activity.activityDate)) throw new Error('Invalid activity identity or date');
    const owned = existing.filter(t => t.activityId === activity.id);
    const rest = existing.filter(t => t.activityId !== activity.id);
    if (activity.approvalStatus === '草稿') return existing.slice();
    if (activity.approvalStatus === '已取消') return rest.concat(owned.map(t => ({...t,status:'cancelled'})));
    if (activity.approvalStatus !== '已通过') return existing.slice();
    const phases = ['prepare','execute','review'];
    const tasks = phases.map(phase => {
      const prior = owned.find(t => t.phase === phase);
      return prior || {id:`${activity.id}_${phase}`,activityId:activity.id,phase,title:`${phase}: ${activity.type}`,dueDate:activity.activityDate,status:'pending'};
    });
    return rest.concat(tasks);
  }
  function visitTask(customerId, productId, dueDate, existing = []) {
    if (!customerId || !productId || !validDate(dueDate)) throw new Error('Invalid visit');
    const found = existing.find(t => t.customerId === customerId && t.productId === productId && !['done','cancelled'].includes(t.status));
    return found || {id:`visit_${customerId}_${productId}_${dueDate}`,customerId,productId,dueDate,status:'pending',title:'Synthetic customer visit'};
  }
  function salesSummary(rows, {productId,from,to}) {
    if (!validDate(from) || !validDate(to) || from > to) throw new Error('Invalid period');
    const selected = rows.filter(r => r.productId === productId && validDate(r.date) && r.date >= from && r.date <= to);
    const missing = selected.some(r => typeof r.salesAmount !== 'number' || !Number.isFinite(r.salesAmount));
    return {source:'synthetic fixture',productId,from,to,recordCount:selected.length,
      salesAmount:!selected.length || missing ? null : selected.reduce((n,r)=>n+r.salesAmount,0),
      truth:!selected.length ? 'NO_DATA' : missing ? 'INCOMPLETE' : 'COMPLETE',
      unmatchedCount:selected.filter(r=>r.hospitalId===null).length};
  }
  function createStore(storage, key='schedule-notes-core-v1') {
    return {load() { const raw=storage.getItem(key);return raw===null ? null : JSON.parse(raw); },
      save(value) { const encoded=JSON.stringify(value);storage.setItem(key,encoded);
        if(storage.getItem(key)!==encoded) throw new Error('Persistence readback mismatch');return value; }};
  }
  const api={validDate,activityTasks,visitTask,salesSummary,createStore};
  if(typeof module==='object' && module.exports) module.exports=api;else root.ScheduleCore=api;
})(typeof globalThis==='object'?globalThis:this);
