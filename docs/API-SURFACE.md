# Public API surface and lifecycle

Compatibility baseline: v0.2.0, `f0a2256f118b57ed77f95e050437036131dfa8d2`. The executable registry is exported as `api.apiRegistry` from `core/index.js`. Contract tests require an entry for every actual facade, optional adapter, store method and legacy export. Demo code may only use the facade and its returned store interface; implementation modules/global `ScheduleCoreV2` are INTERNAL.

| Status | Meaning |
|---|---|
| STABLE | Supported schema 2 input and return semantics are backward compatible with the documented v0.2.0 baseline. Additional documented metadata may be returned. |
| EXPERIMENTAL | Additive Phase 3 interface; explicit migration notes and tests are required for future changes. |
| DEPRECATED | Still callable, tested and documented with a replacement. |
| INTERNAL | Implementation surface; applications must not couple to it. |

STABLE: schemaVersion, apiVersion, emptyDataset, validatePeriod, calendarPeriod, resolveIdentity, validateRecord, validateDataset, summarizeSales, createTask, syncActivityTasks, importPreview, commitImport, createMemoryStore, optional and its aiProvider/excelReader/nativeStore/calendar validators; store.read/writeAtomic.

EXPERIMENTAL: apiRegistry, migrationRegistry, createIndexedDBStore, exportSnapshot, validateSnapshot, restorePreview, restoreSnapshot, migrationPreview, commitMigration, multiImportPreview, commitMultiImport, syncActivityTasksAtomic; store.get/put/delete/list/transaction/snapshot/restore/recoveryStatus/exportRecovery/recover/metadata/close.

DEPRECATED: migrateDataset → migrationPreview + commitMigration. Original manual/no-change response semantics remain. Legacy exports from core/core.js remain: validDate → validatePeriod, activityTasks → syncActivityTasksAtomic, visitTask → createTask, salesSummary → summarizeSales, createStore → createIndexedDBStore. The replacements need their explicit new contracts, not a blind signature substitution.

Lifecycle: ACTIVE → DEPRECATED → REMOVED IN FUTURE MAJOR. No stable member is removed silently. Deprecation records name, status, replacement and earliest removal boundary (not before API major 2.0). Deprecated calls remain covered by regression tests. API version 1.0 is independent of schema 2; a migration does not force API/schema version changes together. The 0.x package line is developing, but undocumented semantic breakage remains prohibited.

Changes from v0.2.0: additive experimental persistence/migration/backup/import APIs; backward-compatible expansion of the memory store to the common interface for supported schema 2 data; documented deprecation of the manual migration and separately retained v0.1 legacy helpers. Identity, period, schema, validation, single-entity import and output semantics retain their original regression tests.

See [Storage](STORAGE.md), [Migration](MIGRATION.md), [Snapshot](SNAPSHOT.md), [Recovery](RECOVERY.md), [Import](IMPORT-PHASE3.md), [Testing](TESTING.md). No provider implementation or production access is implied.