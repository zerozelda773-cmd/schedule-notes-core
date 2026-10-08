# Snapshot and backup

The original `exportSnapshot(dataset, {generatedAt})` payload remains schemaVersion, apiVersion, records, provenance, generatedAt and checksum. Timestamps are canonical UTC ISO with milliseconds. Object keys are canonicalized, array order is preserved, and SHA-256 covers the whole payload except checksum. Unknown remains null, zero remains zero, and IDs and source provenance remain intact.

The legacy default generatedAt uses the current clock for compatibility. Two calls at different clock times are different complete inputs and can have different checksums. Exact reproducibility for this original API requires an explicit generatedAt.

## Deterministic backup profile

`exportBackup(dataset, {generatedAt, baseChecksum})` is an experimental additive profile. Its default timestamp is the fixed synthetic reference time 2030-01-01T00:00:00.000Z, not a claim about the real creation time. Supply generatedAt when real backup timing matters and retain that value as part of the complete deterministic input.

The backup includes the original snapshot fields plus validated, checksummed metadata: full-backup-v1 profile, FULL payload mode, data schema, fact record count, source declarations, API/storage/schema compatibility and an optional baseline checksum. The baseline is only a relationship to another full backup. Incremental metadata declares supported=false and containsDelta=false. This implementation always contains the full dataset; it neither computes nor restores a delta. It does not invent incremental durability.

Record count covers the 11 public entity/fact collections and excludes import-batch bookkeeping. Metadata must match the actual payload, even when a caller recomputes the checksum.

**Integrity is not authenticity.** A checksum detects truncation or modification, but is not a signature, encryption, access control or proof of source truth. A party changing data can recompute it.

`inspectSnapshot(snapshot)` returns only read-only inspection: schema, recordCount, collection counts, migrationRequired, conflicts, unsupported rules, integrityStatus and issue classifications. A checksum may pass while compatibility or contract validation fails.

`restorePreview(snapshot, store)` performs safety, checksum, API/schema, provenance, record and migration validation and adds the same inspection fields. Existing-record changes/removals are counted by entity type, so callers can explicitly assess replacement before commit. No record contents are copied into these new diagnostics. A sealed preview binds the current revision and normalized snapshot. Editing its count, metadata or revision invalidates the plan hash.

`restoreSnapshot(plan, store)` revalidates and commits atomically. Stale or modified plans fail; future schemas/API versions fail closed. Legacy schema 1 snapshots use only the explicit migration route. Partial valid-looking rows are never automatically restored.

Retain full backups externally before migration or restore. Damaged recovery exports remain UNTRUSTED diagnostics and cannot be passed off as validated snapshots. See [Recovery](RECOVERY.md).
