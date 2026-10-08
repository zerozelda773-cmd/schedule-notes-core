# Generic data contract · schemaVersion 2

Independently authored public contract; no private product rules, thresholds or calendars. Each row has stable id, boolean synthetic, and source. ID format: [A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+. Names provide display/search candidates only. Source requires sourceId; imports add batchId, exact input SHA-256 and one-based rowIndex. Unknown fields are rejected.

| Entity / collection | Required fields after id, synthetic, source |
|---|---|
| Hospital / hospitals | name |
| Department / departments | name, hospitalId |
| Employee / employees | name |
| Customer / customers | name, hospitalId, departmentId |
| Product / products | name |
| SalesRecord / sales | hospitalId, employeeId, productId, eventDate, netQuantity, amount, kind |
| EmployeePlanRecord / employeePlans | employeeId, hospitalId, productId, planPeriod, plannedVisits, plannedActivities |
| Activity / activities | title, hospitalId, customerIds, eventDate, endDate, approval, status, expenseAmount |
| Task / tasks | title, dueDate, status, kind, activityId, customerId, productId |
| Visit / visits | customerId, employeeId, productId, eventDate, status |
| ObservationPeriod / observationPeriods | kind, from, to |

Dataset fields: schemaVersion, synthetic, all collections above, importBatches. IDs are unique within each collection. Department resolution additionally requires Hospital namespace. Same-named departments in different hospitals are distinct. Customer department and Activity customer hospital relationships must agree.

Numbers must be finite. Sales amount and Activity expenseAmount permit explicit null. Missing fields are invalid; null is unknown, zero is known. Sale amounts/quantities cannot be negative; return values cannot be positive. Counts are nonnegative integers; expenses cannot be negative. Validation never converts or infers input facts.

Enums: Sales kind sale/return; Activity approval draft/approved/cancelled and status planned/completed/cancelled; Task status pending/done/cancelled and kind manual/prepare/execute/review/visit; Visit status planned/completed/cancelled. Task reference fields must be present, but may be null.

Dates are strict ISO Gregorian dates. Period {kind,from,to} uses inclusive bounds and event/plan/observation/report roles. Sales use eventDate, plans use planPeriod, coverage uses observationPeriods, queries use report periods. Roles cannot interchange. An external periodFor(date,kind) adapter is validated; no private fiscal year is built in.

validateRecord(type,row,dataset,options) returns {valid,issues} without mutation. validateDataset checks collections, references, duplicates and import batch metadata. Representative issues: INVALID_DATE, UNKNOWN_PRODUCT, MISSING_HOSPITAL, AMBIGUOUS_IDENTITY, DUPLICATE_IDENTITY, INVALID_NEGATIVE_SEMANTICS.

Matching: EXACT means one stable ID in the correct namespace. PROBABLE means one name candidate and id=null. AMBIGUOUS means multiple candidates. UNMATCHED means no exact identity. Names never auto-bind.

Migration: schema 2 targeting 2 returns NO_CHANGE. Schema 1 or other versions return MIGRATION_REQUIRED_MANUAL, dataset=null. No source or period semantics are inferred. The original v0.1 API remains separately available; schema 2 is experimental.
