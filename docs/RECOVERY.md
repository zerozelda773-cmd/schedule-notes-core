# Recovery and failure safety

An invalid envelope checksum, unsupported version, invalid record, missing/unknown field or invalid enum enters RECOVERY_REQUIRED. Normal mutations stop, and existing bytes are retained. The seed is used only for absent state and never repairs or empties damaged existing state.

## Read-only assessment

`store.inspectRecovery({snapshot?})` inspects existing bytes without writing them, reports a fingerprint when the payload is safe, and classifies:

| Classification | Meaning |
|---|---|
| RECOVERABLE | The current envelope is valid, or an external known-good schema 2 snapshot passed full validation. This is an assessment, not permission to restore. |
| PARTIAL_RECOVERY | Some individual records appear valid in a damaged envelope. Cross-record completeness and whole-dataset integrity are not established. |
| UNRECOVERABLE | No safe supported candidate is available through this inspection, or the backend could not be read. |

The report includes storageStatus, recoveryRequired, recordCount, individuallyValidRecords, schema, integrityStatus and snapshotInspection. Individual counts are estimates for inspection; they do not certify a valid salvage subset. No automatic salvage, partial commit, reset or empty-database replacement is performed. partialSalvageSupported=false and automaticRecovery=false.

Detecting corruption locks the adapter into recovery mode without changing stored bytes. Externally replacing those bytes does not silently unlock normal writes; explicit validated recovery is required. Unsafe content is classified without returning its value. A healthy assessment may still indicate READ_ONLY_RECOVERY after an earlier corruption observation.

## Explicit recovery

1. Stop normal mutations after RECOVERY_REQUIRED.
2. `exportRecovery()` returns a detached RECOVERY_EXPORT with integrity UNTRUSTED and the original safe raw state. Unsafe content is refused rather than echoed. Keep exports privately; they are diagnostics.
3. Obtain and validate a known-good full schema 2 snapshot. Legacy backups need explicit migration first.
4. Inspect backup schema, sources, time, counts, compatibility and replacement effects. A valid checksum does not prove provenance or authorize overwriting facts.
5. Explicitly call `recover(snapshot, {expectedChecksum, expectedFingerprint})`. expectedChecksum remains required. The optional expectedFingerprint comes from inspection and binds the entire damaged head at confirmation time; use both for stronger stale-input protection.
6. Built-in backends compare the original canonical raw value inside the same atomic write operation, as well as the envelope checksum. Any mismatch returns STALE_PREVIEW.
7. Confirm HEALTHY and read back all restored facts.

Recovery can intentionally restore an older backup. Facts newer than the selected backup cannot be reconstructed automatically. This explicit operation is different from silently resetting storage.

Before-commit failures and transaction aborts retain the previous complete state. A process can terminate after native commit but before the acknowledgement arrives; absence of a response does not prove rollback. After restart, read and re-preview by source/batch/fact fingerprints instead of blindly appending. Browser tests cover aborts, process termination before and after commit, restart, duplicate replay and read-only recovery.
