# Public schema migration

Only Public Core contracts are migrated. This is not a migration of the private production product. Schema 2 stays unchanged. The registry currently contains only the supported 1 → 2 transform; future versions require an explicit reviewed transform, validation and tests.

```js
const plan = await api.migrationPreview(oldPublicDataset, {
  targetDataset: await store.read()
});
// Retain plan.backup outside the store before applying an upgrade.
if (plan.status === 'READY' || plan.status === 'NO_CHANGE') {
  const result = await api.commitMigration(plan, store);
}
```

Source safety/shape validation → checksummed immutable backup → explicit mapping → dry-run target validation → sealed plan → compare-and-swap commit → schema version recorded in the same atomic state. Preview never mutates the source. Failed/blocked/stale plans cannot apply even a valid subset. Source-only planning is allowed, but a target revision is required to commit. A no-change schema 2 pass is idempotent. Transform output and backup content are deterministic; measured duration is telemetry and may vary.

Evidence includes fromVersion, toVersion, recordsRead, recordsChanged, recordsSkipped, recordsRejected, warnings, errors, durationMs and result. Counts refer to rows read/transformed/skipped/rejected during planning; rejected rows can have multiple detailed errors. They are not a claim that a blocked plan wrote any rows. Backup preserves the complete original source, including rejected rows.

The narrow schema 1 mapping preserves explicit IDs, names, nulls, zeros, enum semantics and source declarations. `date` maps to eventDate; a valid explicit `month` maps only to a plan period. Recognized display-name fields map to name. Known legacy metadata has a documented warning. Missing source receives synthetic migration provenance tied to the full original source hash. Unknown fields, conflicting fields, missing required collections, unclear Activity event dates/status, unresolved references and legacy import histories without a mapping reject the upgrade. Timestamps are never guessed into business event dates. A complete synthetic old-schema example is generated in `fixtures/legacy-schema1.json`; older incomplete examples may correctly remain blocked.

Snapshots are checksum-validated before migration planning. `restorePreview` invokes the registry and produces the supported target snapshot; no schema 3 is invented. A caller can inspect migration warnings before commit. The deprecated `migrateDataset` remains callable with its original manual-migration response; it does not acquire new automatic behavior silently.

The full-backup-v1 profile is accepted after its checksummed metadata is verified against actual records. Restore preview additionally reports schema, migrationRequired, recordCount, conflicts, unsupported mappings and integrityStatus before any write. The legacy snapshot shape and explicitly timed checksum remain supported. This additive backup profile does not expand the migration registry or permit partial salvage. Compatibility conformance runs the same explicit 1 → 2 route against each declared adapter capability.
