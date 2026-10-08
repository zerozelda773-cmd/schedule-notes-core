# Public API lifecycle

Frozen compatibility baseline: v0.3.0, 31d6f4b7ef2101f8b377c0e02d6b05be22726f2a. API version remains 1.0; schema remains 2. The executable apiRegistry lists supported facade, namespace, returned client/store methods and legacy boundaries. Internal module paths are not application entry points.

Phase 3 had 21 STABLE and 24 EXPERIMENTAL entries. Phase 4 retains all original callables, promotes 16 documented interfaces and adds a bounded client/inspection surface. Current counts: **37 STABLE, 22 EXPERIMENTAL, 6 DEPRECATED**.

## Disposition of every previous experimental entry

PROMOTE TO STABLE:

- exportSnapshot, validateSnapshot, restorePreview, restoreSnapshot
- multiImportPreview, commitMultiImport, syncActivityTasksAtomic
- store.get, put, delete, list, transaction, snapshot, restore, metadata, close

Supported semantics are covered by conformance, snapshot/atomic-import regression and real browser tests. Snapshot timestamps are explicit inputs to deterministic hashes; the legacy default timestamp remains a live clock for compatibility.

KEEP EXPERIMENTAL:

- apiRegistry, migrationRegistry: registry layouts are development metadata
- createIndexedDBStore: native-runtime setup and capabilities remain environment dependent
- migrationPreview, commitMigration: narrow known mappings; no guessed migration
- store.recoveryStatus, exportRecovery, recover: explicit damaged-state workflows

New EXPERIMENTAL entries: createClient; client.command/query/why/onDiagnostic; matching and normalize/score/createAliasRegistry/candidates; inspectSnapshot, exportBackup; store.inspectRecovery; adapterTestSuite.runStorageCompatibilitySuite. Matching only suggests candidates; it does not modify resolveIdentity or turn probable matches into exact. Alias registries are owned by stable IDs/hospital scopes, external to schema 2 rows.

Original STABLE input/output/error/null/identity/period/persistence semantics retain frozen executable cases and seven-facet records in [API Contract Baseline](API-CONTRACT-BASELINE.md). No Stable API is removed or implicitly rebound to the new client.

DEPRECATED callables remain: migrateDataset and legacy.validDate/activityTasks/visitTask/salesSummary/createStore. Their original semantics remain tested; replacements require explicit new contracts, not blind substitution. Removal is not before API major 2.0. Deprecated raw legacy deserialization remains a caller validation boundary.

Future output changes must be detected by contract tests and reviewed with compatibility notes. The 0.x package line does not authorize undocumented breakage. Named commands/queries return structured errors, rather than requiring raw string parsing or internal object access.
