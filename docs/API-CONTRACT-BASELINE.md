# API contract oracles

The compatibility reference is the frozen public v0.3.0 commit `31d6f4b7ef2101f8b377c0e02d6b05be22726f2a`. The original 21 Stable APIs have a static, complete output oracle in `fixtures/api-contract-baseline.json`, with input in `fixtures/api-v030-contract.json`. The input and expected output were read once from a clean, exact public release clone. Candidate tests cannot rewrite these files or accept a changed result automatically.

Each of those 21 entries records input, output, error, null, identity, period and persistence semantics, including a reason wherever a facet is not applicable. It also names its individual contract test. A failing snapshot needs explicit compatibility review; regenerating expected values from changed implementation is not an acceptable fix.

Phase 4 promotes 16 previously Experimental supported contracts. Their initial reviewed output oracle and all seven facets are recorded separately in `fixtures/api-phase4-contracts.json`. This profile includes the added restore-preview inspection shape. It does not alter the original 21-API release reference. `tests/phase4-compatibility.test.cjs` checks complete observed output against both static oracles and requires exact coverage of every Stable lifecycle entry.

The evaluators `fixtures/api-v030-cases.cjs` and `fixtures/api-v04-cases.cjs` perform operations only; they contain no file write, snapshot update or baseline-generation feature. Runtime-generated storage metadata timestamps are validated as ISO timestamps and envelope checksums as 64 hexadecimal digits before comparison tokens are substituted. Dataset revisions, snapshot checksums and all other output remain exact. A JavaScript `undefined` result is explicitly represented as `{ "$type": "undefined" }`, so its structure is not silently dropped by JSON serialization.

| Promoted interface | Output and negative-path regression evidence |
|---|---|
| `exportSnapshot`, `validateSnapshot` | Complete checksum/provenance envelope and corrupted-checksum rejection; recovery and determinism suites |
| `restorePreview`, `restoreSnapshot` | Read-only preview details, commit, stale refusal, blocked refusal and exact readback; recovery suite |
| `multiImportPreview`, `commitMultiImport` | Exact row outcomes/counts/provenance, commit, stale/blocked refusal and readback; multi-import suite |
| `syncActivityTasksAtomic` | Activity/Task atomic result; integration and transaction tests |
| `store.get`, `store.list` | Detached record/array and missing-record null; adapter conformance |
| `store.put`, `store.delete` | Duplicate-safe upsert and explicit deletion readback; adapter conformance |
| `store.transaction` | Commit result, invalid callback, thrown rollback and unchanged retained facts; adapter conformance |
| `store.snapshot`, `store.restore` | Snapshot/restore output and exact dataset readback; adapter conformance |
| `store.metadata`, `store.close` | Metadata structure and dynamic-value validation; explicit undefined close result; adapter conformance |

Experimental APIs retain bounded contracts and tests but are not promoted by this document. Deprecated original helpers remain callable; removing them needs future API-major review. The registry, not an undocumented internal object layout, defines the lifecycle surface.
