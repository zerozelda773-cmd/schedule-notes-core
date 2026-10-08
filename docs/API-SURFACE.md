# Public API surface

Node: require("./core/index.js"). Browser: registered scripts expose ScheduleNotesCore. Callers use this facade; backing collections/module helpers are internal.

| API | Status |
|---|---|
| schemaVersion, emptyDataset, migrateDataset | experimental |
| validateRecord, validateDataset | experimental |
| resolveIdentity | experimental |
| validatePeriod, calendarPeriod | experimental |
| summarizeSales | experimental |
| createTask, syncActivityTasks | experimental |
| importPreview, commitImport | experimental |
| createMemoryStore | experimental |
| optional.aiProvider/excelReader/nativeStore/calendar | experimental interfaces only |
| core/core.js v0.1 exports | legacy compatibility behavior retained |
| parseCSV, canonical, fingerprint, per-module helpers | internal |

Phase 2 promises no long-term API compatibility. The repository package remains private to npm. Candidate development does not create v0.2.0 tags.

Optional AI interface: analyze(context), suggest(context). Core works without AI and supplies no real token or prompt. Excel readRows, calendar periodFor and native read/writeAtomic are future adapter interfaces, with no production implementation.
