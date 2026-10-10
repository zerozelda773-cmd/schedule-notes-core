# Experimental Wave 1

Import `schedule-notes-core/experimental-wave1` explicitly. All 16 functions are
EXPERIMENTAL. The frozen v0.4.0 root exports, stable contracts, schema 2, storage
adapters and migration registry are unchanged. This is a local implementation
wave, not a version candidate or publication.
The CommonJS entry also has a nonenumerable `default` interop binding to the same
API object, matching its declaration namespace. This is module metadata, not a
seventeenth function or a runtime/store. The original root entry is unchanged.

## Truth and explicit periods

`assessTruth` separates evidenced known zero from unknown, no data, incomplete,
unmatched and ambiguous. Only actual finite values with source IDs can be KNOWN;
budget/forecast input is rejected. A declared source ID is not authenticity proof.

`selectPeriods` requires a Gregorian calendar, a caller supplied `closedThrough`,
explicit eligibility and either explicit bucket IDs or explicit latest-eligible
mode with a limit. Full, nonoverlapping calendar months are required. No current
clock, default month count, fiscal policy, coverage rule or override is inferred.
`aggregatePeriods` averages only selected known eligible months. Evidenced zero
counts in its denominator; missing/null never counts as zero. It returns null for
no effective month, explains exclusions, and labels the result a known-month mean,
not a strict period total or proof of source coverage.

## Stable hospital identity

`summarizeHospitalSales` requires exact hospital/product IDs and an explicit report
period. It uses the existing strict schema 2 sales summary and existing dataset
observation-period coverage contract after filtering by hospital ID. Names never
join hospitals; missing employee IDs still fail schema 2 validation.

`summarizeHospitalProjection` is a separate read-only view of independently
supplied synthetic facts with explicit identity quality. Exact hospital/product
IDs can retain a fact even when employee identity is unknown; ambiguous hospital
or product identity is never attributed. Its `knownValue` is a partial known sum,
its strict `value` remains null because coverage was not assessed, and its output
cannot be imported into schema 2. Unattributed facts keep the query UNMATCHED.

## Matching, confirmation and aliases

`candidateEvidence` reuses public matching. Even score 1 remains PROBABLE;
presentation limits cannot remove AMBIGUOUS quality. `confirmIdentity` checks an
explicit selected existing ID, namespace, dataset revision and recomputed evidence.
It returns exact ID lookup separately from unchanged candidate quality. A caller's
EXPLICIT declaration and evidence hash do not authenticate a person or authorize
storage. Evidence creation, confirmation and alias checks perform no writes.

`validateAliases` checks one stable owner per entry and mandatory department
namespace, records source/revision declarations, deduplicates identical entries,
and preserves conflicting owners as AMBIGUOUS. No silent replacement, automatic
exact promotion, persistent alias schema or snapshot metadata is introduced.

## Command plans and terminal history

`planTerminal` supports Task and Activity edit/cancel/complete only in the new
opt-in scope. Completed/cancelled history cannot be edited or reopened there.
Identical terminal intent is idempotent. Activity completion requires approval.
Plans include before/after records, expected/next dataset revisions, frozen output
and no writes. Activity cancellation never cascades to manually linked Tasks.
Old root commands, sync, imports and restore remain callable with old semantics;
these guards do not retroactively enforce a global terminal lock.

`planWithdraw` requires an explicit external recommendation/execution association.
At most one ACTIVE association is allowed per recommendation, with a pending Task
and matching declared source ID. Withdrawal plans change that Task to cancelled
and the association to WITHDRAWN while preserving the recommendation and audit.
History permits later association with a new Task; duplicate active executions
and reuse of a previously associated Task are rejected. No persistent association
model, recommendation store or second runtime is provided.

`planArchive` supports only Customer active-view exclusion. Its plan preserves the
whole schema 2 dataset, stable IDs and references. External archive state is an
input/output value, not a new store. Unarchive, cascade and other object scopes
remain held. `validateCommandPlan` recomputes a plan against its current inputs and
rejects tampering/stale revisions; it has no apply/commit operation.

`deletePrecheck` examines caller-declared temporary unreferenced manual Tasks or
draft Activities within schema 2 only. It is not delete authorization or proof of
external association absence and never deletes anything.

## Compatibility, migration and boundaries

`migrationGuard` refuses future schemas and extensions to the closed schema 2.
Version 1 still requires the existing explicit migration process. No migration,
snapshot extension, durable metadata or API promotion occurs in this wave.
Frozen module/type/oracle hashes and existing complete compatibility tests protect
the v0.4.0 root behavior. New fixtures are independently invented synthetic values.

New metadata persistence, manual Activity/Task cascade, optional identity
relationships, implicit months, coverage/override policy, retroactive stable API
changes and schema 2 relaxation remain HOLD. No private data, mapping, template,
history, production dependency, Android bridge, signing or updater is included.
Independent public CI and anonymous clean-clone gates are required in a later
authorized phase; local tests do not establish those gates or authorize a release.
