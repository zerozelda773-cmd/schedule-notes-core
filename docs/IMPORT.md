# Import contract and row explainability

CSV, JSON and multi-entity import use explicit stable IDs, dependency ordering,
validation, an immutable preview and an atomic commit. The schema 2 fact and
source-provenance rules are unchanged. A preview reads facts without mutation.

The client query `importPreview` accepts `files`, `sourceId`, `batchId` and optional
`updates`; it returns a `plan` and explained `rows`. Each file has `name`, `format`,
`entityType` and `text`. Public examples use synthetic names and records only.
`format` is `csv` or `json`; CSV structured fields are JSON text and booleans have
explicit true/false tokens. A zero value is different from a missing/null value.

The query envelope can be complete while the plan is blocked. Examine the plan
status, every row outcome and all issues before offering commit. The command
`importRecords` accepts only an explicit preview `plan`. A plan hash protects the
preview from modifications, while a content revision prevents overwriting facts
changed after preview. Neither is an authorization or authenticity signature.

| Outcome | Meaning | Default reason |
| --- | --- | --- |
| CREATE | Valid, previously absent stable ID. | `NEW_STABLE_ID` |
| UPDATE | Existing fact changed under an explicit expected fingerprint. | `EXPLICIT_UPDATE_APPROVED` |
| UNCHANGED | Existing fact is equivalent; source change alone is not a fact update. | `FACT_EQUIVALENT` |
| DUPLICATE | Repeated row or already imported source content. | `INPUT_OR_BATCH_DUPLICATE` |
| CONFLICT | Contradictory input or changed existing fact without explicit resolution. | `EXPLICIT_RESOLUTION_REQUIRED` |
| REJECT | Input fails a data, identity, provenance or safety contract. | `CONTRACT_REJECTED` |

Explained row results contain `entityType`, `fileIndex`, `rowIndex`, `outcome` and
`reason`. Specific validation reason codes replace the default where available.
Reason entries may include a known contract field, but never its value. This
projection omits file names, row bodies and existing/incoming conflict records.
The local preview plan still contains the data needed for explicit review and
commit; do not send it to a logger or an untrusted service.

All rows commit together. No accepted subset is written when another row has a
conflict or rejection. Stable IDs preserve identity across file boundaries;
Departments keep Hospital scope, and references must resolve exactly in the
projected dataset. Unknown enums and unsupported schema versions are rejected.
An update requires the fingerprint of the fact the caller actually reviewed.
Repeated import is idempotent; stale and tampered previews fail closed.

Local diagnostics contain only the operation outcome, timing, warning count and
uniform error code. No import text, file name, raw reason payload or row value is
included. A blocked import command returns `IMPORT_CONFLICT` or the applicable
typed failure without reporting partial changes.

Deletion remains an explicit schema 2 import API behavior; `importRecords` is
the multi-entity create/update preview path. It does not infer deletions from
missing rows, import fuzzy IDs, or promote candidates to exact identity.
