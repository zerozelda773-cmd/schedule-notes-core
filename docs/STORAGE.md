# Storage contract

`createMemoryStore(dataset)` and `createIndexedDBStore({name, seed})` implement the same asynchronous command interface. The facade is the application entry point; Core logic never depends on a browser database layout.

| Method | Contract |
|---|---|
| read / get / list | Detached data; unknown ID returns null. |
| writeAtomic(dataset, {expectedRevision}) | Full validation and compare-and-swap; COMMITTED or STALE_PREVIEW retain the established meaning. |
| put / delete | Explicit whole-dataset mutation. Duplicate-ID put replaces that row, not a second row. Dangling references reject the write. |
| transaction(async draft => result) | Detached draft, full validation and atomic commit. Thrown callbacks, invalid data or revision conflict preserve the original. No automatic callback retries. |
| snapshot / restore | Validated full snapshot; restore requires preview, sealed revision and atomic commit. |
| metadata | Schema, timestamps, synthetic source declaration, content revision and envelope checksum. |
| recoveryStatus / exportRecovery / recover | Explicit recovery; damaged state is never silently cleared. |
| inspectRecovery | Experimental read-only recoverability assessment; it never writes a salvage subset. |
| close | Releases the backend connection. Memory has no persistent connection or restart guarantee. |

Storage envelope version 1, data schema 2, API version 1.0 and IndexedDB layout version 1 have separate roles. All persistent state is one native transaction. Validation and Web Crypto run before the transaction; synchronous get/compare/put inside the transaction avoids auto-commit across an asynchronous hash. A recovery operation also compares the original canonical raw state within this transaction. The result is reported after commit completion.

Concurrent callers receive a stale result and must obtain a fresh preview. Unknown amounts and identities are never changed for storage convenience. Transactions preserve stable IDs and explicit period roles. Credentials, deployment configuration and recognized production content are refused. Synthetic declarations are required by this public candidate, but a declaration alone cannot prove origin.

Seed applies only to absent state. Corrupt state enters read-only recovery. Memory is ephemeral. IndexedDB survives the tested browser restarts; quota, eviction, user deletion, private browsing, device loss and hardware failures still exist. This is local single-dataset storage, not a server, encrypted vault or cloud backup.

`syncActivityTasksAtomic` commits Activity and generated tasks together. COMPLETE means commit; FAILED means no confirmed write and taskCount is null. PARTIAL is reserved for future non-atomic adapters and is not returned by the current atomic adapters.

See [Adapter compatibility](ADAPTERS.md), [Snapshot](SNAPSHOT.md) and [Recovery](RECOVERY.md) for capability declarations and future SQLite/Android requirements.
