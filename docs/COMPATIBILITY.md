# Compatibility matrix and decisions

Phase 4 reference: frozen v0.3.0, `31d6f4b7ef2101f8b377c0e02d6b05be22726f2a`. The original 21 Stable APIs retain exact static output oracles and seven-facet contracts; see [API-CONTRACT-BASELINE](API-CONTRACT-BASELINE.md). Sixteen supported storage/lifecycle/import contracts are promoted with a separate reviewed contract profile. Remaining Experimental and all Deprecated functions retain explicit registry decisions.

| Runtime | Classification | Evidence and limits |
|---|---|---|
| Node 24.19.0 | SUPPORTED for tested headless/package contracts | Actual local Node suites, ESM consumer, deterministic/property and synthetic benchmarks. Other Node majors have not been verified. |
| Chrome/Chromium 155 (closure run; original baseline 154) | SUPPORTED for tested browser contracts | Real IndexedDB, transaction abort, fresh profile, process restart and local synthetic browser checks. The browser executable is external and not version-locked by this package. Current candidate verification must record its exact version and result. |
| Android WebView compatible runtime | BEST EFFORT, contract-only | Android adapter interface is defined; no real WebView/Android runtime or private Android implementation is supplied or tested. Runtime needs modern JavaScript, structuredClone, Web Crypto and compatible storage. |
| Firefox 157 / Gecko | VERIFIED for the recorded synthetic contracts | Same-revision CAS, ordered valid commits, persistence, abort, migration, recovery, crash/restart and Experimental Wave 1 exercised using a fresh profile. The original CAS assertion lacked a shared-revision barrier; see [limitations](RELEASE-LIMITATIONS.md). This is a scoped verification, not universal browser certification. |
| WebKit / Safari | NOT VERIFIED | No corresponding engine run; no compatibility claim. |
| Older Node / Chromium | UNSUPPORTED by the verified matrix; NOT TESTED | Supported minimums have not been inferred from syntax alone. |

`SUPPORTED` refers only to the covered operations and recorded runs. It is not a guarantee against quota eviction, process/hardware failure or unknown host behavior. The compatibility matrix is separate from current CI status; a missing/unrun candidate CI cannot be called PASS.

The earlier v0.2.0 behavioral boundary remains relevant:

| Surface | Classification | Evidence |
|---|---|---|
| Schema 2, identity, periods, record/dataset validation, output, task rules | BACKWARD COMPATIBLE | Original implementations retained; all original contract/output/task tests remain. Name ≠ ID, department hospital scope, null/zero, period isolation and error states are unchanged. |
| Single-entity CSV/JSON preview and commit | BACKWARD COMPATIBLE | Original importer retained; duplicate/update/delete, stale/tampered plans and provenance tests remain. |
| Memory store | BACKWARD COMPATIBLE for documented supported schema 2 data | read/writeAtomic return statuses retained; additional interface methods and metadata added. Invalid/private/config inputs are outside the supported public contract and are refused. |
| Manual migrateDataset and separately available legacy helpers | DEPRECATED | Remain callable with original semantics; lifecycle registry, replacements and compatibility tests. Removal requires future API major review. |
| Persistent store, transactional Activity sync, migration, snapshot/recovery, multi-entity import | BACKWARD COMPATIBLE additions, EXPERIMENTAL | Separate new entry points; failure and integration tests; real IndexedDB/process restart verification. No existing call acquires guessed business facts. |
| API version 1.0 metadata and registry | BACKWARD COMPATIBLE addition | Distinct from unchanged schemaVersion 2. |

No breaking change to the original Stable API is authorized or intentionally introduced. Additional Phase 4 client, matching and backup/inspection profiles remain Experimental. Restore-preview inspection fields were added before its promotion and are now pinned by the Phase 4 profile. Internal module paths and global implementation namespaces are not supported caller contracts.

The original tests continue alongside Phase 3 and Phase 4 contract/storage/migration/import/recovery/integration, property, determinism, headless and real browser checks. Memory adapters can report EPHEMERAL compatibility; a persistent adapter needs real reopen and corruption evidence through the shared adapter suite before claiming RESTARTABLE compatibility. A report with NOT_APPLICABLE checks must retain those limits.

The first historical browser failure remains UNKNOWN. A successful current run is NOT REPRODUCED with ROOT CAUSE UNKNOWN, not a proven fix.

Restore performance debt of approximately +57.9% is retained as an inherited review input, not remeasured or hidden by a fresh timing sample. The original baseline/hardware/runtime evidence and a follow-up owner must accompany a release disclosure. See [release limitations](RELEASE-LIMITATIONS.md).
