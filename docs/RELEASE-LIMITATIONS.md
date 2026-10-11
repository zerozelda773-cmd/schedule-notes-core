# Release readiness limitations — Wave 1

This is a reviewed candidate disclosure, not a tag, release or npm authorization.
Published v0.4.0 remains the frozen compatibility reference. The root has 37 Stable,
22 existing Experimental and 6 Deprecated APIs; the separate Wave 1 subpath has
16 new Experimental pure functions. No Stable promotion or Schema 2 change occurs.

## Browser CAS closure and retained history

The first Firefox concurrent-CAS assertion failed because it assumed that starting
two asynchronous transactions together forces them to read the same revision.
That precondition was absent. Delaying delivery of the second window's open event
deterministically produces two valid sequential commits on different snapshots in
both Firefox and Chromium, reproducing the old assertion failure without losing
either update. A barrier after both drafts are read establishes the actual CAS
precondition: exactly one COMMITTED, one STALE_PREVIEW and no loser write persists.
Classification: TEST RACE. The storage implementation and CAS contract are unchanged.
The original assertion evidence is retained; an uncontrolled passing run is not
used as proof. The browser suite now enforces the shared-revision precondition.

Firefox 157 and Chromium 155 were exercised in isolated fresh synthetic profiles
against the same contract, including process kill/restart and Wave 1 checks.
Support claims apply only to those tested operations and recorded versions.
WebKit/Safari are unverified; Android WebView remains BEST EFFORT, contract-only.
The separate historical first-browser failure remains UNKNOWN / NOT REPRODUCED /
ROOT CAUSE UNKNOWN. This CAS correction does not claim to fix that historical event.

## Authoritative L1–L7 disclosure

The approved Wave 1 scope defines exactly these seven HOLDs. All remain HOLD.
Candidate verification does not waive them or authorize implementing held behavior.

| ID | Meaning / why HOLD | Current boundary | Release disclosure |
|---|---|---|---|
| L1 | Activity cancellation cascades to non-engine-owned manual/visit-linked Tasks; completed/history and recovery rules are not uniquely established. | Plan the Activity transition and explicit impacts only; do not infer cascade policy. | No automatic manual-Task cascade or recovery promise. |
| L2 | Durable alias/confirmation/lifecycle audit ownership and shared facts CAS; envelope/sidecar/schema choice is unapproved. | Pure validators and plans only; no write-through, shared durable metadata or new store. | Alias/confirmation/withdraw receipts are caller-owned values, not durable persistence. |
| L3 | New Customer hospital fallback scopes, multiple-ID/Department relations and automatic merge/rename/revoke lack approved contracts. | Existing Department namespace, explicit single-ID confirmation and ambiguity preservation only. | No inferred scope expansion, multi-Department relationship or silent identity merge. |
| L4 | Raw absence/date coverage cannot automatically prove scoped known zero; implicit recent-month/lookback/count/fiscal/source-universe policy is unapproved. | Explicit calendar, validated buckets and eligibility; actual known-month mean and source diagnostics. | Missing is not zero; no implicit months, private defaults or coverage proof. |
| L5 | Retroactive global terminal enforcement across Stable store/sync/import/restore or global reopen permissions would change existing contracts. | New opt-in pure plans protect terminal history; old Stable primitives retain their semantics. | No global terminal lock or automatic reopen authorization. |
| L6 | Persisting unknown-employee hospital facts or alias/archive/withdraw/journal/multi-Department extensions into Schema 2 requires an approved versioned model. | Validated SalesRecord readers and separate read-only projections only. | Closed Schema 2 is unchanged; projections/metadata cannot be persisted into it. |
| L7 | Archive undo/reopen/cascade and expanded object scopes lack approved transition/recovery contracts. | Customer active-view exclusion preserves facts/references; delete is precheck only. | No unarchive, cascade or additional archive object support. |

Cancel, withdraw, archive and delete remain distinct. A delete precheck is not
deletion authorization. Identity uncertainty is preserved: name/score is not ID,
PROBABLE never automatically becomes EXACT, and explicit confirmation does not
authenticate a person or authorize durable writes. Aliases require stable owners
and evidence; ambiguity is not silently merged. Hospital aggregation uses exact
hospital IDs; known-month means do not invent missing months or strict totals.

## Toolchain, durability and performance

TypeScript semantic compilation is NOT_APPLICABLE to the current formal toolchain:
there is no supported tsc configuration or command. Lightweight declaration syntax
and public interface alignment are verified; semantic compiler PASS is not claimed.

Browser storage remains local and vulnerable to quota, eviction, private-browsing,
user deletion and hardware loss. Keep external backups. Checksums detect integrity
changes, not authenticity. Migration covers only explicit supported mappings.

Restore performance debt: approximately +57.9% for 1000 rows, inherited from the
approved review input and not remeasured by this closure. KNOWN PERFORMANCE DEBT;
not correctness-blocking and not resolved. A new timing sample cannot erase it.

## Private and publication boundary

No private implementation/history, real hospitals/customers/personnel/sales/activity/
financial data, business mapping/template, production infrastructure, signing,
updater, secret or internal evidence is included. Fixtures are invented from zero.
Android/SQLite/AI contracts include no private runtime or production provider.
Package metadata remains private:true and 0.4.0-candidate.1. Recommended next release:
v0.5.0 after its explicit Human Gate; metadata is not a published version promise.
npm = DEFER; packageability does not authorize npm publishing. No Wave 2 or HOLD
removal is implied. Candidate differs from Main, Tag, Release and npm publication.
