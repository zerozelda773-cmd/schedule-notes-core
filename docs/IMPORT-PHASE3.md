# Multi-entity import

The v0.2.0 single-entity `importPreview` / `commitImport` contract remains callable. The additive `multiImportPreview` / `commitMultiImport` accepts synthetic CSV/JSON files with name, format, entityType and text. Filenames must clearly identify synthetic material; identity is determined by stable ID and content, never filename or display name.

```js
const preview = await api.multiImportPreview({
  dataset: await store.read(), files,
  sourceId: 'SRC_SYN_EXAMPLE', batchId: 'BATCH_SYN_EXAMPLE'
});
if (preview.status === 'READY') await api.commitMultiImport(preview, store);
```

Reference order is Hospital, Employee, Product, Department, Customer, ObservationPeriod, EmployeePlanRecord, SalesRecord, Activity, Task, Visit. References are validated against the projected identity set before facts can be committed. Unknown ID rejects with an unmatched reason; duplicate/conflicting identity blocks. Names never choose the first candidate. No write happens until the entire projected dataset validates.

| Row result | Meaning |
|---|---|
| CREATE | New stable identity/fact. |
| UPDATE | Explicit reviewed change tied to the exact existing fact fingerprint. |
| UNCHANGED | Same stable identity and canonical fact from another file. |
| DUPLICATE | Repeated equal input row or an already committed batch. |
| CONFLICT | Same ID, incompatible fact, without an approved exact update resolution; existing, incoming and reason are returned. |
| REJECT | Invalid shape/enum/value/provenance/reference; detailed reasons returned. |

Any conflict/reject blocks the entire batch. To resolve an update, supply `updates: [{entityType, id, expectedFingerprint}]`, where the fingerprint is SHA-256 of canonical existing fact fields excluding source. Wrong/stale fingerprints never overwrite. Conflicting rows within one input always block. Deletion is deliberately absent from the multi-entity API; the frozen single-entity explicit-delete route remains available.

Preview records file, row and combined source fingerprints, sourceId, batchId, rowIndex, all outcomes and the base dataset revision. Native atomic commit writes facts and batch provenance together. Same bytes after restart add zero facts. Formatting/name changes do not duplicate equal stable facts. Stable IDs are mandatory: unrelated IDs with identical values cannot be declared the same business fact without an explicit identity mapping, which this API does not guess. Row fingerprints appear in the sealed preview; file and batch provenance persist in the schema 2 source/batch fields without adding arbitrary record fields.

CSV numeric/null/boolean and structured JSON-field normalization is explicit. Scientific numeric notation is refused. Limits: 100 files, 2 MB per text and 10,000 rows per batch; no binary documents, remote downloads or private imports.
