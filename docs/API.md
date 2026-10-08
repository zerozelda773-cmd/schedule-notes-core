# Public API and client contract

Schedule Notes Core is a headless module. The package entry point exposes the
public registry and versioned contracts without requiring the demo or a DOM.
CommonJS and ES module consumers share the same implementation. The package is
prepared for consumption; publication to a package registry is a separate gate.

## Client

Use `ScheduleNotesCore.createClient({ store, onDiagnostic })` to retain a storage
adapter privately inside a command/query client. Omit `store` to create a memory
adapter; optional `dataset` supplies its initial synthetic schema 2 facts.
`store` must supply asynchronous `read()` and `writeAtomic(next,
{ expectedRevision })`. An adapter that passes the full storage compatibility
suite may claim Core Compatible; merely supplying those two methods does not
prove transaction, restart or recovery compatibility.

```js
const client = ScheduleNotesCore.createClient({ store });
const result = await client.command('cancelTask', { id: 'T_SYN_001' });
const tasks = await client.query('getCurrentTasks');
```

Every asynchronous operation returns:

```js
{
  result: { status: 'COMPLETE', value: /* local caller output */, error: null },
  changes: [],
  warnings: [],
  provenance: {
    operation: 'getCurrentTasks', schemaVersion: 2,
    revision: /* content hash, or null */, sourceRecordIds: []
  }
}
```

`COMPLETE` means the operation succeeded. `NO_CHANGE` means an accepted command
left facts unchanged. `FAILED` always has `value: null`, a structured error and
zero reported changes. Queries always return detached frozen values and zero
changes. A completed *preview query* may contain a `BLOCKED` plan: reading and
explaining a rejected import is a successful query, but it is not permission to
commit that plan. Numerical truth status and completeness stay inside the value;
unknown numbers remain `null`.

Source record IDs identify the facts used by a query or command. Provider source
IDs remain available through the returned records' `source` and explanation
envelopes. IDs and fact values are returned only to the local caller, never to
the diagnostic listener.

## Commands

| Name | Payload | Semantics |
| --- | --- | --- |
| `createTask` | `{ record }` | Validate and atomically insert a new schema 2 Task. |
| `updateTask` | `{ id, changes }` | Explicit patch; ID, source and synthetic provenance remain immutable. |
| `cancelTask` | `{ id }` | Pending becomes cancelled; repeated cancellation changes nothing. |
| `createActivity` | `{ record }` | Insert an Activity and its derived tasks in the same atomic commit. |
| `saveDraft` | `{ record }` | Insert or edit a planned draft; no derived tasks. Existing approved facts cannot become drafts. |
| `archiveCustomer` | `{ id }` | Returns `UNSUPPORTED_OPERATION`; schema 2 has no archive state. |
| `importRecords` | `{ plan }` | Commit an explicit multi-entity preview with hash and revision checks. |
| `restoreSnapshot` | `{ plan }` | Commit an explicitly reviewed restore preview; never infer or skip preview. |

Task updates accept only `title`, `dueDate`, `status`, `kind`, `activityId`,
`customerId` and `productId`. Done and cancelled tasks cannot return to pending;
done tasks cannot be cancelled. A terminal task may have its descriptive fields
edited without changing the terminal status. A draft save retains its source
ID and synthetic flag. Every fact remains subject to the existing schema 2,
identity and relationship validation. This interface does not add an archive
field or modify private product contracts.

Each operation reads the current content revision and uses compare-and-swap for
its atomic write. Invalid references, invalid states, backend failures and stale
previews leave the previous facts intact. Callers must inspect `result.status`
and `result.error.code`; do not parse error messages.

## Queries

| Name | Payload | Value |
| --- | --- | --- |
| `getCurrentTasks` | `{}` | `{ tasks }`, containing pending tasks. |
| `getCustomerSummary` | `{ id, hospitalId? }` | Exact customer and related Activity, Task and Visit IDs. |
| `getActivityStatus` | `{ id }` | Activity ID, approval, status and associated task IDs. |
| `getSalesSummary` | `{ productId, period }` | Existing explainable sales output envelope. |
| `importPreview` | `{ files, sourceId, batchId, updates? }` | `{ plan, rows }` with row classification and reason codes. |
| `restorePreview` | `{ snapshot }` | Explicit restore plan, including compatibility and integrity checks. |
| `snapshot` | `{ generatedAt? }` | Validated schema 2 snapshot. |
| `getRecoveryStatus` | `{}` | Adapter's read-only recovery status, if supported. |

Queries call no fact-writing method. Identity-based queries require an explicit
existing stable ID; a fuzzy candidate is never automatically accepted. A sales
query requires a `report` period. Event, plan and observation roles keep their
existing meanings. `getRecoveryStatus` can report recovery even when ordinary
fact reads are unavailable; it does not reset or repair storage.

## Core error contract

Each error has `code`, fixed `message`, `context`, `recoverable` and fixed
`recommendedAction` fields. Required codes are `VALIDATION_ERROR`,
`IDENTITY_AMBIGUOUS`, `IDENTITY_UNMATCHED`, `PERIOD_INVALID`, `STORAGE_FAILURE`,
`MIGRATION_FAILURE`, `IMPORT_CONFLICT`, `RECOVERY_REQUIRED` and
`UNSUPPORTED_SCHEMA`. Unsupported operations use `UNSUPPORTED_OPERATION`.
Legacy results are mapped using structured status or issue codes, never exception
message parsing. Context contains only known operation/entity/field enums and
nonnegative row, file, record or schema counts. Input values, IDs, raw exceptions,
paths, file names and credentials are excluded.

Invalid client options or an invalid storage interface at client creation throw
a fixed `TypeError` carrying the error fields directly and in `error.coreError`;
normal asynchronous operation failures return the envelope above. Options must
be a plain object with only `store`, `dataset` and `onDiagnostic`. Factory options,
fact data and operation payloads reject accessors without invoking their getters.
Inherited adapter methods are allowed, but accessor methods are rejected.

## Local diagnostics

`client.onDiagnostic(listener)` registers a local observer and returns an
unsubscribe function. `options.onDiagnostic` is an optional initial listener.
Observers receive only `operation`, optional `entity`, `duration` in milliseconds,
`result`, `warningCount` and optional `errorCode`. Operation, entity, result and
error codes are explicit allowlists. No source records, names, row bodies, IDs,
file names, paths or exception messages are emitted. Durations are observational
and are not included in deterministic fact hashes.

The interface never uploads or makes network requests. Synchronous observer
exceptions and rejected observer promises are isolated from command results and
fact commits. Observers are advisory; they cannot authorize a mutation.

## Explainability and AI

`client.why(output)` returns `source`, `sourceRecordIds`, `period`,
`identityMatch`, `calculation`, `completeness` and `limitations` for a compatible
output envelope. Missing evidence stays absent or `null`; an explanation does
not invent records or convert unknown values into zero. This is local caller
output, not a logging payload.

AI adapters return suggestions only. There is no `applyAISuggestion` command or
callback that writes facts automatically. A human or explicit rule must validate
an intended change, then invoke an existing supported command. AI output is not
another source of business truth.

See [import explainability](IMPORT.md), [candidate matching](MATCHING.md), the API
registry and compatibility baseline for experimental/stable classifications.
New client and matching APIs retain an explicit experimental classification
until their public contract has earned promotion.
