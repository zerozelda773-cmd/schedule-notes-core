# Snapshot and backup

`exportSnapshot(dataset, {generatedAt})` emits schemaVersion, apiVersion, records, provenance, generatedAt and checksum. Timestamps use canonical UTC ISO format with milliseconds, as returned by Date.toISOString(). Object keys are canonicalized, array order is preserved, and SHA-256 covers every payload field except checksum. Identical payload and timestamp yield identical bytes/checksum. Unknown values stay null, true zero stays zero, IDs and source provenance remain intact.

**Integrity ≠ authenticity.** A checksum detects truncation, unexpected modification and corruption. It is not a signature, identity assertion, encryption or access control. A person who changes content can recompute it. Source declarations do not prove real-world truth.

```js
const backup = await store.snapshot();
const preview = await api.restorePreview(backup, store);
// Inspect validation and migration results before writing.
if (preview.status === 'READY') await api.restoreSnapshot(preview, store);
```

Restore performs envelope safety, checksum, API/schema, provenance, record and migration validation. A sealed plan includes the expected current revision. Stale or modified plans fail; future schemas/API majors fail closed. Schema 1 snapshots take the explicit migration route. No credential/config fields are permitted. Neither an imported snapshot nor a matching checksum is trusted as authentic business evidence.

Retain the source/backup externally before migration or restore; the adapter does not silently replace your external backup. Recovery exports of damaged state are marked UNTRUSTED and are not importable valid snapshots. See [Recovery](RECOVERY.md).
