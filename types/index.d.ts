// SPDX-License-Identifier: Apache-2.0
/** Runtime contracts remain authoritative. No production provider is included. */
export type EntityId = string;
export type HospitalId = EntityId;
export type DepartmentId = EntityId;
export type CustomerId = EntityId;
export type EmployeeId = EntityId;
export type ProductId = EntityId;
export type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue };
export type PeriodRole = 'event' | 'plan' | 'observation' | 'report';
export interface Period { kind: PeriodRole; from: string; to: string }
export interface Source { sourceId: EntityId; batchId?: EntityId; fingerprint?: string; rowIndex?: number }
export interface FactRecord { id: EntityId; synthetic: boolean; source: Source }
export interface Hospital extends FactRecord { name: string }
export interface Department extends FactRecord { name: string; hospitalId: HospitalId }
export interface Employee extends FactRecord { name: string }
export interface Customer extends FactRecord { name: string; hospitalId: HospitalId; departmentId: DepartmentId }
export interface Product extends FactRecord { name: string }
export interface SalesRecord extends FactRecord { hospitalId: HospitalId; productId: ProductId; employeeId: EmployeeId; eventDate: string; netQuantity: number; amount: number | null; kind: 'sale' | 'return' }
export interface EmployeePlanRecord extends FactRecord { employeeId: EmployeeId; hospitalId: HospitalId; productId: ProductId; planPeriod: Period & { kind: 'plan' }; plannedVisits: number; plannedActivities: number }
export interface Activity extends FactRecord { title: string; hospitalId: HospitalId; customerIds: CustomerId[]; eventDate: string; endDate: string; approval: 'draft' | 'approved' | 'cancelled'; status: 'planned' | 'completed' | 'cancelled'; expenseAmount: number | null }
export interface Task extends FactRecord { title: string; dueDate: string; status: 'pending' | 'done' | 'cancelled'; kind: 'manual' | 'prepare' | 'execute' | 'review' | 'visit'; activityId: EntityId | null; customerId: CustomerId | null; productId: ProductId | null }
export interface Visit extends FactRecord { customerId: CustomerId; employeeId: EmployeeId; productId: ProductId; eventDate: string; status: 'planned' | 'completed' | 'cancelled' }
export interface ObservationPeriod extends FactRecord { kind: 'observation'; from: string; to: string }
export interface EntityMap { Hospital: Hospital; Department: Department; Employee: Employee; Customer: Customer; Product: Product; SalesRecord: SalesRecord; EmployeePlanRecord: EmployeePlanRecord; Activity: Activity; Task: Task; Visit: Visit; ObservationPeriod: ObservationPeriod }
export type EntityType = keyof EntityMap;
export interface ImportBatch { sourceId: EntityId; batchId: EntityId; fingerprint: string; counts: Record<string, number>; synthetic: true }
export interface Dataset { schemaVersion: 2; synthetic: boolean; hospitals: Hospital[]; departments: Department[]; employees: Employee[]; customers: Customer[]; products: Product[]; sales: SalesRecord[]; employeePlans: EmployeePlanRecord[]; activities: Activity[]; tasks: Task[]; visits: Visit[]; observationPeriods: ObservationPeriod[]; importBatches: ImportBatch[] }
export interface Issue { code: string; field?: string; id?: EntityId; entityType?: EntityType; rowIndex?: number; path?: string; details?: Issue[] }
export interface ValidationResult { valid: boolean; issues: Issue[] }
export type IdentityQuality = 'EXACT' | 'PROBABLE' | 'AMBIGUOUS' | 'UNMATCHED';
export interface IdentityResult { quality: IdentityQuality; id: EntityId | null; candidates: EntityId[]; code: string | null }
export interface OutputEnvelope { value: number | null; truthStatus: 'INVALID_INPUT' | 'AMBIGUOUS' | 'UNMATCHED' | 'NO_DATA' | 'INCOMPLETE' | 'COMPLETE'; source: { type: 'SalesRecord'; sourceIds: EntityId[] }; period: Period | null; entity: { type: 'Product'; id: ProductId | null }; matchingQuality: IdentityQuality; completeness: { records: number; knownAmounts: number; coverage: 'UNKNOWN' | 'COMPLETE' | 'GAP_OR_UNKNOWN' }; calculation: { method: string; field: string; recordIds: EntityId[] }; limitations: string[] }
export type CoreErrorCode = 'VALIDATION_ERROR' | 'IDENTITY_AMBIGUOUS' | 'IDENTITY_UNMATCHED' | 'PERIOD_INVALID' | 'STORAGE_FAILURE' | 'MIGRATION_FAILURE' | 'IMPORT_CONFLICT' | 'RECOVERY_REQUIRED' | 'UNSUPPORTED_SCHEMA' | 'UNSUPPORTED_OPERATION';
export interface CoreError { code: CoreErrorCode; message: string; context: { operation?: string; entity?: EntityType; field?: string; rowIndex?: number; fileIndex?: number; recordCount?: number; fromSchema?: number; toSchema?: number }; recoverable: boolean; recommendedAction: string }
export interface DiagnosticEvent { operation: string; entity?: EntityType; duration: number; result: 'COMPLETE' | 'NO_CHANGE' | 'FAILED'; warningCount: number; errorCode?: CoreErrorCode }
export type DiagnosticListener = (event: Readonly<DiagnosticEvent>) => void | Promise<void>;
export interface WriteResult { status: string; revision?: string; issues?: Issue[] }
export interface TransactionResult<T> extends WriteResult { result?: T }
export interface StorageMetadata { storageVersion: 1; schemaVersion: 2; createdAt: string; updatedAt: string; source: { synthetic: true }; revision: string; checksum: string }
export interface SnapshotProvenance { synthetic: true; sourceIds: EntityId[] }
export interface Snapshot { schemaVersion: number; apiVersion: string; records: Dataset; provenance: SnapshotProvenance; generatedAt: string; checksum: string }
export interface BackupMetadata { profile: 'full-backup-v1'; payloadMode: 'FULL'; dataSchemaVersion: 2; recordCount: number; source: SnapshotProvenance; compatibility: { apiVersion: string; storageVersion: 1; supportedSchemaVersions: number[] }; incremental: { supported: false; containsDelta: false; baseChecksum: string | null } }
export interface Backup extends Snapshot { metadata: BackupMetadata }
export interface SnapshotInspection { status: 'VALID' | 'INVALID'; recordCount: number; collections: Record<string, number>; schema: number | null; migrationRequired: boolean; conflicts: Array<{ code: string; entityType?: EntityType; field?: string; count?: number }>; unsupported: string[]; integrityStatus: 'PASS' | 'FAIL' | 'UNKNOWN'; issues: Issue[] }
export interface RecoveryInspection { status: 'RECOVERABLE' | 'PARTIAL_RECOVERY' | 'UNRECOVERABLE'; storageStatus: 'HEALTHY' | 'READ_ONLY_RECOVERY' | 'RECOVERY_REQUIRED' | 'STORAGE_FAILED'; readOnly: true; automaticRecovery: false; partialSalvageSupported: false; issues: Issue[]; recoveryRequired?: boolean; recordCount?: number; individuallyValidRecords?: number; integrityStatus?: 'PASS' | 'FAIL' | 'UNKNOWN'; schema?: number | null; rawFingerprint?: string | null; availableSnapshot?: boolean; requiresConfirmation?: boolean; snapshotInspection?: SnapshotInspection | null }
export interface RestorePlan extends Partial<Omit<SnapshotInspection, 'status'>> { status: 'READY' | 'BLOCKED'; issues: Issue[]; baseRevision?: string; snapshot?: Snapshot | Backup; migration?: { fromVersion: number; toVersion: 2; counts: MigrationCounts; warnings: Issue[] }; planHash?: string }
export interface MigrationCounts { read: number; changed: number; skipped: number; rejected: number }
export interface MigrationResult { status: 'READY' | 'NO_CHANGE' | 'BLOCKED'; issues: Issue[]; fromVersion?: number; toVersion?: 2; sourceHash?: string; baseRevision?: string | null; backup?: Snapshot; dataset?: Dataset | null; counts?: MigrationCounts; warnings?: Issue[]; errors?: Issue[]; durationMs?: number; planHash?: string; recordsRead?: number; recordsChanged?: number; recordsSkipped?: number; recordsRejected?: number; result?: string }
export interface StorageAdapter {
 read(): Promise<Dataset>;
 writeAtomic(next: Dataset, options?: { expectedRevision?: string }): Promise<WriteResult>;
 get<T extends EntityType>(type: T, id: EntityId): Promise<EntityMap[T] | null>;
 put<T extends EntityType>(type: T, record: EntityMap[T]): Promise<TransactionResult<void>>;
 delete(type: EntityType, id: EntityId): Promise<TransactionResult<void>>;
 list<T extends EntityType>(type: T): Promise<EntityMap[T][]>;
 transaction<T>(mutator: (draft: Dataset) => T | Promise<T>, options?: { expectedRevision?: string }): Promise<TransactionResult<T>>;
 snapshot(options?: { generatedAt?: string }): Promise<Snapshot>;
 restore(snapshot: Snapshot | Backup): Promise<WriteResult>;
 recoveryStatus(): Promise<{ status: string; revision?: string; issues?: Issue[] }>;
 exportRecovery(): Promise<{ status: string; integrity?: 'UNTRUSTED'; raw?: JSONValue; issues?: Issue[] }>;
 inspectRecovery(options?: { snapshot?: Snapshot | Backup }): Promise<Readonly<RecoveryInspection>>;
 recover(snapshot: Snapshot | Backup, options?: { expectedChecksum?: string | null; expectedFingerprint?: string }): Promise<WriteResult>;
 metadata(): Promise<StorageMetadata>;
 close(): Promise<void>;
}
export type ImportOutcome = 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'DUPLICATE' | 'CONFLICT' | 'REJECT';
export interface ImportRowResult { entityType: EntityType; fileIndex: number; fileName: string; fileFingerprint: string; rowIndex: number; rowFingerprint: string | null; outcome: ImportOutcome; matchingQuality: IdentityQuality; reason: Issue[] | null; existing?: FactRecord | null; incoming?: FactRecord }
export interface ImportFile { name: string; entityType: EntityType; format: 'csv' | 'json'; text: string }
export interface ImportUpdate { entityType: EntityType; id: EntityId; expectedFingerprint: string }
export interface MultiImportOptions { files: ImportFile[]; dataset: Dataset; sourceId: EntityId; batchId: EntityId; updates?: ImportUpdate[] }
export interface ImportResult { status: 'READY' | 'BLOCKED' | 'REPEATED_IMPORT'; baseRevision?: string; sourceId?: EntityId; batchId?: EntityId; fingerprint?: string; fileFingerprints?: string[]; results?: ImportRowResult[]; actions?: Array<{ entityType: EntityType; outcome: 'CREATE' | 'UPDATE'; row: FactRecord }>; counts?: Record<ImportOutcome, number>; issues: Issue[]; nextDataset?: Dataset | null; planHash?: string }
export interface SingleImportOptions { format: 'csv' | 'json'; text: string; entityType: EntityType; dataset: Dataset; sourceId: EntityId; batchId: EntityId; policy?: { updates?: 'reject' | 'replace'; deletes?: 'reject' | 'explicit' } }
export interface SingleImportResult { status: 'READY' | 'BLOCKED' | 'REPEATED_IMPORT'; stage: string; entityType: EntityType; baseRevision: string; fingerprint: string | null; sourceId: EntityId; batchId: EntityId; policy: { updates: 'reject' | 'replace'; deletes: 'reject' | 'explicit' }; actions: Array<{ operation: 'insert' | 'replace' | 'delete'; row?: FactRecord; id?: EntityId }>; counts: { valid: number; invalid: number; duplicate: number; ambiguous: number; unmatched: number; ignored: number }; issues: Issue[]; normalizations: Array<{ code: string; field?: string; rowIndex?: number }>; matching: Array<IdentityResult & { field: string; rowIndex: number }>; planHash: string | null }
export interface Explanation { source: OutputEnvelope['source'] | Source | null; sourceRecordIds: EntityId[]; period: Period | null; identityMatch: IdentityQuality | null; calculation: OutputEnvelope['calculation'] | null; completeness: OutputEnvelope['completeness'] | null; limitations: string[] }
export interface Change { entityType: EntityType; id: EntityId; action: 'CREATE' | 'UPDATE' | 'CANCEL' | 'DELETE' }
export interface CommandEnvelope<T> { result: { status: 'COMPLETE' | 'NO_CHANGE' | 'FAILED'; value: T | null; error: CoreError | null }; changes: Change[]; warnings: Issue[]; provenance: { operation: string; schemaVersion: 2; revision: string | null; sourceRecordIds: EntityId[] } }
export interface Commands { createTask: { record: Task }; updateTask: { id: EntityId; changes: Partial<Pick<Task, 'title' | 'dueDate' | 'status' | 'kind' | 'activityId' | 'customerId' | 'productId'>> }; cancelTask: { id: EntityId }; createActivity: { record: Activity }; saveDraft: { record: Activity }; archiveCustomer: { id: EntityId }; importRecords: { plan: ImportResult }; restoreSnapshot: { plan: RestorePlan } }
export interface CommandValues { createTask: Task; updateTask: Task; cancelTask: Task; createActivity: Activity; saveDraft: Activity; archiveCustomer: never; importRecords: { counts: Record<string, number>; rows: RowDiagnostic[] }; restoreSnapshot: { recordCount: number } }
export interface Queries { getCurrentTasks: Record<string, never>; getCustomerSummary: { id: CustomerId; hospitalId?: HospitalId }; getActivityStatus: { id: EntityId }; getSalesSummary: { productId: ProductId; period: Period & { kind: 'report' } }; importPreview: Omit<MultiImportOptions, 'dataset'>; restorePreview: { snapshot: Snapshot | Backup }; snapshot: { generatedAt?: string }; getRecoveryStatus: Record<string, never> }
export interface RowDiagnostic { entityType: EntityType | null; fileIndex: number | null; rowIndex: number | null; outcome: ImportOutcome; reason: Array<{ code: string; field?: string }> }
export interface QueryValues { getCurrentTasks: { tasks: Task[] }; getCustomerSummary: { customer: Customer; identityMatch: 'EXACT'; activityIds: EntityId[]; taskIds: EntityId[]; visitIds: EntityId[] }; getActivityStatus: { id: EntityId; approval: Activity['approval']; status: Activity['status']; taskIds: EntityId[] }; getSalesSummary: OutputEnvelope; importPreview: { plan: ImportResult; rows: RowDiagnostic[] }; restorePreview: RestorePlan; snapshot: Snapshot; getRecoveryStatus: { status: string; revision?: string; issues?: Issue[] } }
export type OptionalPayloadQuery = 'getCurrentTasks' | 'getRecoveryStatus' | 'snapshot';
export interface CoreClient { command<K extends keyof Commands>(name: K, payload: Commands[K]): Promise<Readonly<CommandEnvelope<CommandValues[K]>>>; query<K extends OptionalPayloadQuery>(name: K, payload?: Queries[K]): Promise<Readonly<CommandEnvelope<QueryValues[K]>>>; query<K extends Exclude<keyof Queries, OptionalPayloadQuery>>(name: K, payload: Queries[K]): Promise<Readonly<CommandEnvelope<QueryValues[K]>>>; why(value: OutputEnvelope | CommandEnvelope<OutputEnvelope>): Readonly<Explanation>; onDiagnostic(listener: DiagnosticListener): () => void }
export interface AliasEntry { entityType: EntityType; id: EntityId; namespace: HospitalId | null; alias: string }
export interface Matching { normalize(value: unknown): string; score(left: unknown, right: unknown): number; createAliasRegistry(dataset: Dataset, entries?: AliasEntry[]): Readonly<{ status: 'COMPLETE' | 'FAILED'; aliases: AliasEntry[]; error: CoreError | null }>; candidates(type: EntityType, query: { name: string; namespace?: HospitalId | null }, dataset: Dataset, options?: { aliases?: AliasEntry[]; threshold?: number; limit?: number }): Readonly<{ quality: Exclude<IdentityQuality, 'EXACT'>; id: null; candidates: Array<{ id: EntityId; namespace: HospitalId | null; score: number; basis: 'ALIAS' | 'CANONICAL'; quality: 'PROBABLE' }>; error: CoreError | null }> }
export interface AdapterCheck { valid: boolean; requiredMethods: string[] }
export interface OptionalAdapters { aiProvider(adapter: unknown): AdapterCheck; excelReader(adapter: unknown): AdapterCheck; nativeStore(adapter: unknown): AdapterCheck; calendar(adapter: unknown): AdapterCheck }
export interface APIRegistryEntry { name: string; status: 'STABLE' | 'EXPERIMENTAL' | 'DEPRECATED' | 'INTERNAL'; since?: string; compatibility?: string; deprecatedIn?: string; replacement?: string; removal?: string }
export interface MigrationRegistryEntry { fromVersion: number; toVersion: number; status: string; id: string }
export interface ScheduleNotesCore {
 readonly schemaVersion: 2;
 readonly apiVersion: string;
 readonly apiRegistry: readonly APIRegistryEntry[];
 readonly migrationRegistry: readonly MigrationRegistryEntry[];
 emptyDataset(): Dataset;
 migrateDataset(data: unknown, target?: number): { status: 'NO_CHANGE' | 'MIGRATION_REQUIRED_MANUAL'; dataset: Dataset | null; limitations?: string[] };
 validatePeriod(period: unknown, expected?: PeriodRole): ValidationResult;
 calendarPeriod(adapter: { periodFor(date: string, kind: PeriodRole): Period } | null, date: string, kind: PeriodRole): { valid: boolean; period?: Period; issues?: Issue[] };
 resolveIdentity(type: EntityType, query: { id?: EntityId | null; name?: string; hospitalId?: HospitalId }, dataset: Dataset): IdentityResult;
 validateRecord(type: EntityType, row: unknown, dataset?: Dataset, options?: { requireSynthetic?: boolean; checkDuplicate?: boolean }): ValidationResult;
 validateDataset(dataset: unknown, options?: { requireSynthetic?: boolean }): ValidationResult;
 summarizeSales(dataset: Dataset, options?: { productId?: ProductId; period?: Period }): OutputEnvelope;
 createTask(task: unknown, dataset: Dataset): { status: 'VALID' | 'INVALID_INPUT'; task: Task | null; issues: Issue[] };
 syncActivityTasks(activity: Activity, existing: Task[], dataset: Dataset): { status: 'VALID' | 'NO_CHANGE' | 'INVALID_INPUT'; tasks: Task[]; issues: Issue[] };
 importPreview(options: SingleImportOptions): Promise<Readonly<SingleImportResult>>;
 commitImport(plan: SingleImportResult, store: Pick<StorageAdapter, 'read' | 'writeAtomic'>): Promise<WriteResult & { counts?: SingleImportResult['counts'] }>;
 createMemoryStore(dataset: Dataset): StorageAdapter;
 createIndexedDBStore(options?: { name?: string; seed?: Dataset; indexedDB?: unknown }): StorageAdapter;
 exportSnapshot(dataset: Dataset, options?: { generatedAt?: string }): Promise<Readonly<Snapshot>>;
 validateSnapshot(snapshot: unknown, options?: { allowLegacy?: boolean }): Promise<ValidationResult & { status: 'VALID' | 'INVALID' }>;
 inspectSnapshot(snapshot: unknown): Promise<Readonly<SnapshotInspection>>;
 exportBackup(dataset: Dataset, options?: { generatedAt?: string; baseChecksum?: string | null }): Promise<Readonly<Backup>>;
 restorePreview(snapshot: Snapshot | Backup, store: Pick<StorageAdapter, 'read' | 'writeAtomic'>): Promise<Readonly<RestorePlan>>;
 restoreSnapshot(plan: RestorePlan, store: Pick<StorageAdapter, 'read' | 'writeAtomic'>): Promise<WriteResult>;
 migrationPreview(input: unknown, options?: { targetDataset?: Dataset; toVersion?: number }): Promise<Readonly<MigrationResult>>;
 commitMigration(plan: MigrationResult, store: Pick<StorageAdapter, 'read' | 'writeAtomic'>): Promise<WriteResult & Partial<Omit<MigrationResult, 'status'>>>;
 multiImportPreview(options: MultiImportOptions): Promise<Readonly<ImportResult>>;
 commitMultiImport(plan: ImportResult, store: Pick<StorageAdapter, 'read' | 'writeAtomic'>): Promise<WriteResult & { counts?: Record<ImportOutcome, number> }>;
 syncActivityTasksAtomic(activity: Activity, store: StorageAdapter): Promise<{ status: 'COMPLETE' | 'FAILED'; commitStatus: string; taskCount: number | null; issues: Issue[] }>;
 createClient(options?: { store?: Pick<StorageAdapter, 'read' | 'writeAtomic'> & Partial<StorageAdapter>; dataset?: Dataset; onDiagnostic?: DiagnosticListener }): CoreClient;
 readonly optional: OptionalAdapters;
 readonly matching: Matching;
}
/** Private/public Android clients implement these interfaces; this package ships no Android implementation. */
export interface AndroidAdapter { storage: StorageAdapter; file: { readText(uri: string): Promise<string>; writeText(name: string, text: string): Promise<{ uri: string }> }; back: { register(handler: () => boolean): () => void }; lifecycle: { onEvent(listener: (event: 'pause' | 'resume' | 'stop') => void): () => void }; shareExport: { share(name: string, text: string): Promise<void> } }
export interface AIContext { schemaVersion: 2; facts: Readonly<Dataset>; output?: Readonly<OutputEnvelope>; synthetic: boolean }
export interface AIRequest { context: AIContext; purpose: string }
/** Suggestions never mutate facts. Caller validation must precede a supported Core command. */
export interface AISuggestion { kind: 'SUGGESTION'; proposedCommand: keyof Commands; proposedPayload: JSONValue; explanation: string; validationRequired: true }
export interface AIAdapter { suggest(request: Readonly<AIRequest>): Promise<readonly AISuggestion[]> }
declare const core: ScheduleNotesCore;
export default core;
export const schemaVersion: ScheduleNotesCore['schemaVersion'];
export const apiVersion: ScheduleNotesCore['apiVersion'];
export const apiRegistry: ScheduleNotesCore['apiRegistry'];
export const migrationRegistry: ScheduleNotesCore['migrationRegistry'];
export const emptyDataset: ScheduleNotesCore['emptyDataset'];
export const migrateDataset: ScheduleNotesCore['migrateDataset'];
export const validatePeriod: ScheduleNotesCore['validatePeriod'];
export const calendarPeriod: ScheduleNotesCore['calendarPeriod'];
export const resolveIdentity: ScheduleNotesCore['resolveIdentity'];
export const validateRecord: ScheduleNotesCore['validateRecord'];
export const validateDataset: ScheduleNotesCore['validateDataset'];
export const summarizeSales: ScheduleNotesCore['summarizeSales'];
export const createTask: ScheduleNotesCore['createTask'];
export const syncActivityTasks: ScheduleNotesCore['syncActivityTasks'];
export const importPreview: ScheduleNotesCore['importPreview'];
export const commitImport: ScheduleNotesCore['commitImport'];
export const createMemoryStore: ScheduleNotesCore['createMemoryStore'];
export const createIndexedDBStore: ScheduleNotesCore['createIndexedDBStore'];
export const exportSnapshot: ScheduleNotesCore['exportSnapshot'];
export const validateSnapshot: ScheduleNotesCore['validateSnapshot'];
export const inspectSnapshot: ScheduleNotesCore['inspectSnapshot'];
export const exportBackup: ScheduleNotesCore['exportBackup'];
export const restorePreview: ScheduleNotesCore['restorePreview'];
export const restoreSnapshot: ScheduleNotesCore['restoreSnapshot'];
export const migrationPreview: ScheduleNotesCore['migrationPreview'];
export const commitMigration: ScheduleNotesCore['commitMigration'];
export const multiImportPreview: ScheduleNotesCore['multiImportPreview'];
export const commitMultiImport: ScheduleNotesCore['commitMultiImport'];
export const syncActivityTasksAtomic: ScheduleNotesCore['syncActivityTasksAtomic'];
export const createClient: ScheduleNotesCore['createClient'];
export const optional: ScheduleNotesCore['optional'];
export const matching: ScheduleNotesCore['matching'];
