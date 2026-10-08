# Validation groups

| Command | Scope |
|---|---|
| `npm run test:unit` | Platform helpers, original legacy behaviors and scanner rejection. |
| `npm run test:contract` | Schema, identity, periods, validation, API lifecycle and output envelopes. |
| `npm run test:storage` | Memory/interface transactions, CAS, validation and metadata. |
| `npm run test:migration` | Source validation, backup, deterministic mappings, atomic commit, idempotency. |
| `npm run test:import` | Frozen single-entity and new multi-entity reliability. |
| `npm run test:recovery` | Snapshots, corruption, stale/tampered restores, explicit recovery. |
| `npm run test:integration` | Activity/Task transactions and end-to-end migration/import/output. |
| `npm run test:browser` | Real Chrome/Chromium IndexedDB, native abort, process kill/restart, demo. |
| `npm test` | All Node groups together; browser remains an independent command. |

Phase 4 adds four separately executable Node files:

| Test | Scope |
|---|---|
| `tests/phase4-compatibility.test.cjs` | Frozen 21-API v0.3.0 output oracle, 16 promoted complete-output contracts, exact Stable lifecycle coverage and seven semantic facets. |
| `tests/property.test.cjs` | Fixed-seed null/zero/non-finite/date/enum/future-schema/Unicode/long-text/duplicate/alias/hospital-scope/prototype boundaries. |
| `tests/determinism.test.cjs` | Stable derived IDs, migration data/classification, import classifications, explicit-time snapshot/restore, full backup profile, alias ordering and analysis hashes. |
| `tests/headless.test.cjs` | Real ESM consumer without DOM or demo; command states, read-only queries, import/restore preview and commit, explanations and privacy-safe diagnostics. |

Run these with Node's built-in test runner or their package scripts; no fuzz/build dependency is added. The seeded property suite is bounded coverage, not exhaustive fuzzing. It uses only from-zero synthetic facts.

Snapshot determinism compares the same explicit `generatedAt`. The old `exportSnapshot` default remains a real clock timestamp and is not claimed deterministic across different invocations. The new full-backup profile has a deterministic default. Migration duration and hashes covering duration describe an invocation; migration data, counts, source hash and backup checksum are compared separately.

`scripts/benchmark.cjs` records import, identity, migration, snapshot, restore and analysis at 10/100/1000 synthetic sales records. Its exported `benchmark(sizes, facade)` can compare the frozen public v0.3.0 facade and candidate under the same runtime. Every timed case also asserts correctness. Timings are trend evidence without fragile wall-clock PASS/FAIL thresholds; retain both baseline and candidate observations rather than claiming regression safety from a single sample.

Browser requires an installed Chrome/Chromium (`CHROME_BIN` can select it). The zero-dependency runner uses Node's native WebSocket and the browser debugging protocol against a fresh temporary synthetic profile. It does not attach to the user's browser, reuse cookies, log in or access production services. The local HTTP origin remains stable while separate browser processes restart. Browser profile cleanup is confined to its verified temporary directory. No browser executable/package is installed or redistributed by the project.

Native conformance database cleanup records `blocked`, `completed` and `timedOut`. A `blocked` notification is not treated as deletion success or failure: only `onsuccess` passes, while request errors or the five-second deadline fail. This follows the asynchronous connection-close and deletion steps in the [IndexedDB specification](https://w3c.github.io/IndexedDB/#closing-connection). Two native regression checks deliberately hold a connection: releasing it after `blocked` must finish deletion, and keeping it open must reach the strict failure deadline. Only databases created in the isolated synthetic test profile are deleted.

CI runs every group separately, original synthetic generation/provenance, manifest/secret/license checks, a closed build, example and clean diff. `scripts/provenance.cjs` checks generated files against their from-zero generators. These checks prove the tested local/CI scope, not real-world source authenticity or immunity to every future storage failure.
