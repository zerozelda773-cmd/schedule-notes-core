// SPDX-License-Identifier: Apache-2.0
'use strict';
(function (root) {
  const node = typeof module === 'object' && module.exports;
  const state = node ? require('./state.js') : root.ScheduleCoreV2.state;
  const validation = node ? require('./validation.js') : root.ScheduleCoreV2.validation;
  function safe(value) { return state.guard(value).valid; }
  function shape(value, fields, required = fields) {
    return safe(value) && value !== null && typeof value === 'object' && !Array.isArray(value)
      && Object.keys(value).every(k => fields.includes(k))
      && required.every(k => Object.hasOwn(value, k));
  }
  function list(value, limit = 10000) {
    return Array.isArray(value) && value.length <= limit && safe(value)
      && Array.from({ length: value.length }, (_, i) => Object.hasOwn(value, i)).every(Boolean)
      && Object.keys(value).length === value.length;
  }
  const id = value => typeof value === 'string' && value.length <= 128 && validation.idPattern.test(value);
  const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const sorted = values => [...new Set(values)].sort();
  const result = value => state.frozen(value);
  const fail = code => result({ status: 'FAILED', code, changes: [] });
  function expose(fn) {
    if (fn.constructor.name === 'AsyncFunction') return async (...args) => {
      try {
        if (args.some(arg => arg !== undefined && !safe(arg))) return fail('INVALID_INPUT');
        return await fn(...args.map(arg => arg === undefined ? arg : structuredClone(arg)));
      } catch { return fail('INVALID_INPUT'); }
    };
    return (...args) => {
      try {
        if (args.some(arg => arg !== undefined && !safe(arg))) return fail('INVALID_INPUT');
        return fn(...args.map(arg => arg === undefined ? arg : structuredClone(arg)));
      } catch { return fail('INVALID_INPUT'); }
    };
  }
  const api = { state, validation, safe, shape, list, id, digest, sorted, result, fail, expose };
  if (node) module.exports = api; else root.ScheduleCoreV2.wave1Common = api;
})(globalThis);
