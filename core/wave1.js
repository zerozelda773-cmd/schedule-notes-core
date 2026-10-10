// SPDX-License-Identifier: Apache-2.0
'use strict';
(function (root) {
  const node = typeof module === 'object' && module.exports;
  const truth = node ? require('./wave1-truth.js') : root.ScheduleCoreV2.wave1Truth;
  const identity = node ? require('./wave1-identity.js') : root.ScheduleCoreV2.wave1Identity;
  const lifecycle = node ? require('./wave1-lifecycle.js') : root.ScheduleCoreV2.wave1Lifecycle;
  const functions = { ...truth, ...identity, ...lifecycle };
  const apiRegistry = Object.freeze(Object.keys(functions).sort().map(name => Object.freeze({ name, stability: 'EXPERIMENTAL', scope: 'PURE_NO_WRITE' })));
  const api = { ...functions, apiRegistry };
  // CJS namespace declarations include a default binding; keep it as interop metadata.
  if (node) Object.defineProperty(api, 'default', { value: api, enumerable: false });
  Object.freeze(api);
  if (node) module.exports = api; else root.ScheduleNotesWave1 = api;
})(globalThis);
