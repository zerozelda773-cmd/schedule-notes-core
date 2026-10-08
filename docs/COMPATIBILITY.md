# Compatibility decision log

Baseline: v0.2.0, f0a2256f118b57ed77f95e050437036131dfa8d2. The tag remains frozen. This development tree contains additive Phase 3 work and an internal candidate marker, not a new release.

| Surface | Classification | Evidence |
|---|---|---|
| Schema 2, identity, periods, record/dataset validation, output, task rules | BACKWARD COMPATIBLE | Original implementations retained; all original contract/output/task tests remain. Name ≠ ID, department hospital scope, null/zero, period isolation and error states are unchanged. |
| Single-entity CSV/JSON preview and commit | BACKWARD COMPATIBLE | Original importer retained; duplicate/update/delete, stale/tampered plans and provenance tests remain. |
| Memory store | BACKWARD COMPATIBLE for documented supported schema 2 data | read/writeAtomic return statuses retained; additional interface methods and metadata added. Invalid/private/config inputs are outside the supported public contract and are refused. |
| Manual migrateDataset and separately available legacy helpers | DEPRECATED | Remain callable with original semantics; lifecycle registry, replacements and compatibility tests. Removal requires future API major review. |
| Persistent store, transactional Activity sync, migration, snapshot/recovery, multi-entity import | BACKWARD COMPATIBLE additions, EXPERIMENTAL | Separate new entry points; failure and integration tests; real IndexedDB/process restart verification. No existing call acquires guessed business facts. |
| API version 1.0 metadata and registry | BACKWARD COMPATIBLE addition | Distinct from unchanged schemaVersion 2. |

No BREAKING STABLE API change is authorized or intentionally introduced. New behavior is exposed through new experimental APIs. Internal module paths and global implementation namespaces are not supported caller contracts; the thin demo only uses the public facade and returned adapter interface.

The original 60-test baseline suite continues alongside separated Phase 3 unit, contract, storage, migration, import, recovery, integration and real browser checks. Passing tests establish the covered behavior and do not promise unlimited compatibility for unknown inputs or every future runtime.
