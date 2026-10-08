# Public adapter boundary

A Core client depends on the storage interface, not the storage layout. Adapters do not decide identity, period roles, output completeness or business meaning. Public contracts remain schema 2 and synthetic-only in this candidate. A persistent adapter must preserve those facts across successful writes, reopen, migration, import and explicit restore.

Data boundaries accept plain JSON values, not executable host objects. Guards inspect own property descriptors and reject getters/setters before reading their values. JavaScript Proxy reflection traps cannot be isolated by this library: reflected failures are classified safely, but arbitrary Proxy side effects are outside the supported input contract. Deserialize untrusted input to plain JSON rather than passing a Proxy or host object.

| Adapter | Availability | Durability and recovery scope |
|---|---|---|
| Memory | Implemented | Ephemeral. Closing or constructing another store does not provide persistence. |
| Browser IndexedDB | Implemented | Single local dataset, native atomic transaction and compare-and-swap. Reopen and actual browser restart are checked separately. Quota, eviction and device loss still require external backup. |
| SQLite | Interface planning only | A future implementation must satisfy the same conformance cases. No SQLite dependency or runtime is included. |
| Android | Interface planning only | A future host may supply an adapter around the public contract. No private Android source, native bridge, signing resource or product runtime is copied. |

The shared backend protocol is `load()`, `save(next, {expectedChecksum, expectedRaw?})` and optional `close()`. Absence means undefined; a corrupt existing value is never absence. A save performs read/compare/write in one native transaction and reports COMMITTED only after commit. The optional recovery expectedRaw value is a canonical comparison of the entire damaged head, used inside the same transaction. It prevents a concurrent change from passing because two damaged values happen to carry the same bad checksum. Generic backends that ignore this comparison do not satisfy the recovery contract.

A future SQLite implementation needs one transaction around compare/read/write, rollback on validation or commit failure, no exposed partial state, and an acknowledgement consistent with commit completion. A future Android host must keep host permissions, storage location and backup consent outside Core. Both must provide typed failures, external backup hooks and restart/corruption tests before being described as supported. There is no new production dependency or private-runtime boundary in this version.

## Reusable compatibility suite

`adapters/storage/conformance.js` exports `runStorageCompatibilitySuite({name, createHarness, dataset, legacyDataset?, persistence})`. Fixtures must pass the public synthetic contract. Each case receives a fresh synthetic harness from `createHarness(seed)`.

- A harness provides store and optional cleanup.
- Persistence must explicitly be EPHEMERAL or RESTARTABLE. A restartable harness must provide reopen, raw and corrupt hooks for isolated test state.
- The report separates PASS, FAIL and NOT_APPLICABLE. A memory adapter never receives a fabricated persistence PASS.
- The cases cover detached data and missing-ID null, metadata/schema/identity/period/null preservation, duplicate upsert and explicit delete, transaction rollback, invalid partial writes, concurrent compare-and-swap, stale revisions, snapshot/restore, stale preview, explicit legacy migration, reopen and corruption inspection without reset.
- Hooks are test-only. Never pass production or private state to a conformance harness.

The Node retained-file backend is a synthetic test fixture demonstrating the same suite against retained bytes. It is not a supported file adapter or a production durability claim. Reopening an adapter is different from terminating a process; the browser suite separately exercises actual process termination and restart.

## Optional AI suggestions

AI is optional and has no direct backend-write permission. A future AI adapter may propose a public command payload or an import preview. Core validates the proposal, identity, schema, source and expected revision before an explicit commit command. Suggestions are untrusted; they do not turn ambiguous identity into an exact match, infer unknown amounts, silently approve activity or reset storage. No AI provider credential or private endpoint is part of this interface.
