// SPDX-License-Identifier: Apache-2.0
import type { Dataset, JSONValue, StorageAdapter } from './index.js';
export interface StorageTestHarness { store: StorageAdapter; reopen?: () => StorageAdapter | Promise<StorageAdapter>; corrupt?: () => void | Promise<void>; raw?: () => JSONValue | Promise<JSONValue>; cleanup?: () => void | Promise<void> }
export interface StorageCompatibilityReport { readonly status: 'PASS' | 'FAIL'; readonly name: string; readonly persistence: 'EPHEMERAL' | 'RESTARTABLE'; readonly cases: readonly { case: string; status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE'; issues?: readonly { code: string }[] }[]; readonly passCount: number; readonly notApplicableCount: number; readonly failCount: number }
/** A test helper, not a production adapter. RESTARTABLE requires real reopen/corrupt/raw probes. */
export function runStorageCompatibilitySuite(options: { name?: string; createHarness(seed: Dataset): StorageTestHarness | Promise<StorageTestHarness>; dataset: Dataset; legacyDataset?: unknown; persistence: 'EPHEMERAL' | 'RESTARTABLE' }): Promise<Readonly<StorageCompatibilityReport>>;
