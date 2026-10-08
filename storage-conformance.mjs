// SPDX-License-Identifier: Apache-2.0
import './index.mjs';
import * as conformance from './adapters/storage/conformance.js';
export const runStorageCompatibilitySuite = (conformance.default || globalThis.ScheduleCoreV2.storageConformance).runStorageCompatibilitySuite;
