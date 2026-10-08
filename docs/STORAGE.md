# Storage contract

`createMemoryStore(dataset)` and `createIndexedDBStore({name, seed})` implement the same asynchronous interface. The facade in `core/index.js` is the application entry point. Core transaction, migration and import logic accepts this interface and never accesses a browser database.

| Method | Contract |
|---|---|
| `read()` / `get(type, id)` / `list(type)` | Detached data; unknown ID returns null. |
| `writeAtomic(dataset, {expectedRevision})` | Full validation and compare-and-swap. Existing `COMMITTED` / `STALE_PREVIEW` behavior retained. |
| `put(type, row)` / `delete(type, id)` | Explicit mutation in a whole-dataset transaction. Dangling references reject the entire write. |
| `transaction(async draft => result)` | Mutate a detached draft. Throws, invalid data or a competing revision preserve the original. No automatic retry of callbacks with side effects. |
| `snapshot(options)` / `restore(snapshot)` | Validated, checksummed export; migration preview before restore. |
| `metadata()` | schemaVersion, createdAt, updatedAt, synthetic source provenance, content revision and envelope checksum. |
| `recoveryStatus()` / `exportRecovery()` / `recover(snapshot, {expectedChecksum})` | Explicit recovery contract; see [Recovery](RECOVERY.md). |
| `close()` | Close the database connection. |

Storage envelope version 1 is separate from data schema 2 and API version 1.0. IndexedDB database version 1 describes only the storage layout. Neither increments the fact schema. All persistent state is one record in one native read/write transaction. Validation and Web Crypto run before that transaction; a synchronous get/compare/put prevents IndexedDB auto-commit during an asynchronous hash. The result is reported only after native transaction completion. Concurrent tabs can conflict; callers must obtain a new preview rather than silently overwrite.

Seed is used only when no persistent head exists. It never repairs or resets an existing invalid head. Corrupt state enters read-only recovery. Credentials, deployment configuration and recognized production credential/endpoint content are refused. Supported candidate datasets declare synthetic provenance; a declaration is not proof of origin. Never put private inputs in the public demo.

Memory store is ephemeral. IndexedDB survives tested browser process restarts, but browser quota failure, eviction, user deletion, private browsing, device loss and storage hardware failure remain possible. This is a local single-dataset adapter, not a server, multi-device database or encrypted vault. Regular external backups are required for durable use.

`syncActivityTasksAtomic(activity, store)` writes the Activity and its generated tasks together. `COMPLETE` means the transaction committed. `FAILED` means no confirmed write; taskCount is null. `PARTIAL` is reserved for future non-atomic adapters and is never returned by these atomic adapters. Completed/cancelled task status is preserved by the frozen task engine.
