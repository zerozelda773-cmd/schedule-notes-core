# Recovery and failure safety

An invalid envelope checksum, unsupported version, bad record, missing/unknown field or invalid enum puts storage in `RECOVERY_REQUIRED`. Normal reads reject and normal writes stop. Existing bytes are retained. The seed is never used to empty or overwrite a damaged existing database.

1. Read `recoveryStatus()` and stop normal mutations.
2. `exportRecovery()` returns a detached `RECOVERY_EXPORT` with integrity UNTRUSTED and original raw state. Credential-containing content is refused rather than echoed.
3. Preserve that export privately; it is diagnostic material, not a valid or authenticated snapshot.
4. Validate a known-good schema 2 snapshot.
5. Explicitly call `recover(snapshot, {expectedChecksum: recovery.raw.checksum})`. The compare-and-swap ensures the damaged head has not changed. No implicit recovery is performed.
6. Confirm HEALTHY and read back the restored facts.

Recovery can intentionally restore an older backup; inspect its provenance/time and accept that lost newer facts cannot be reconstructed. This explicit operation is different from silently resetting the database. Legacy backups must first use the migration preview and a validated target export. Unsafe exports remain blocked for human review.

Before-commit failures and native transaction aborts retain the previous complete state. A process can terminate after native commit but before an application receives its acknowledgement; the committed state may then exist despite no delivered response. After restart, read and re-preview by source/batch/fact fingerprints. Never infer rollback from a missing acknowledgement and never retry by blindly appending facts. Tests exercise aborted writes, an actual process killed before commit, an actual process killed after commit, restart, duplicate replay and recovery.
