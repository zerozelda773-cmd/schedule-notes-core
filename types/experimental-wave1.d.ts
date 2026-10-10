// SPDX-License-Identifier: Apache-2.0
/** All APIs in this subpath are experimental, pure, and perform no durable writes. */
import type { Dataset, EntityType, Matching, AliasEntry, Period, OutputEnvelope, Task, Activity } from './index';
export interface Failure { status: 'FAILED'; code: string; changes: readonly [] }
export interface NoChange { status: 'NO_CHANGE'; changes: readonly []; writes: false; expectedRevision?: string }
export type TruthQuality = 'KNOWN' | 'UNKNOWN' | 'NO_DATA' | 'INCOMPLETE' | 'UNMATCHED' | 'AMBIGUOUS';
export interface ActualFact { kind: 'actual'; value: number | null; quality: TruthQuality; sourceIds: string[] }
export interface TruthAssessment { value: number | null; truthStatus: TruthQuality; sourceIds: string[]; isKnownZero: boolean }
export interface MonthBucket { id: string; period: Period & { kind: 'observation' }; eligible: boolean; truth: ActualFact }
export interface CalendarPolicy { calendar: 'GREGORIAN_MONTH'; closedThrough: string }
export type PeriodSelection = CalendarPolicy & ({ mode: 'EXPLICIT'; bucketIds: string[] } | { mode: 'LATEST_ELIGIBLE'; limit: number });
export interface Exclusion { id: string; reason: string }
export interface SelectedPeriods { status: 'COMPLETE'; selectedIds: string[]; eligibleIds: string[]; excluded: Exclusion[]; policy: PeriodSelection; coverageAssessed: false; inferredZero: false }
export interface AggregatedPeriods { status: 'COMPLETE'; value: number | null; truthStatus: 'KNOWN' | 'UNKNOWN' | 'NO_DATA' | 'INCOMPLETE'; denominator: number; selectedIds: string[]; effectiveIds: string[]; excluded: Exclusion[]; sourceIds: string[]; method: 'EXPLICIT_KNOWN_MONTH_MEAN'; coverageAssessed: false; limitations: string[] }
export interface HospitalScope { hospitalId: string; productId: string; period: Period & { kind: 'report' } }
export interface HospitalSales extends Omit<OutputEnvelope, 'entity'> { entity: { type: 'HospitalProduct'; hospitalId: string; productId: string }; scope: HospitalScope; excludedRecordIds: string[] }
export type ProjectionIdentity = { quality: 'EXACT'; id: string } | { quality: 'PROBABLE' | 'UNMATCHED' | 'AMBIGUOUS'; id: null };
export interface ProjectionFact { id: string; synthetic: true; sourceId: string; hospital: ProjectionIdentity; product: ProjectionIdentity; employee: ProjectionIdentity; eventDate: string; amount: number | null; kind: 'sale' | 'return' }
export interface HospitalProjection { status: 'COMPLETE'; value: null; knownValue: number | null; amountTruth: 'NO_DATA' | 'KNOWN' | 'INCOMPLETE'; truthStatus: 'INCOMPLETE' | 'UNMATCHED' | 'NO_DATA'; retainedRecordIds: string[]; excluded: Exclusion[]; unknownAmountIds: string[]; diagnostics: Array<{ id: string; hospitalQuality?: string; productQuality?: string; employeeQuality?: string }>; sourceIds: string[]; scope: HospitalScope; coverage: 'NOT_ASSESSED'; writableToSchema2: false; limitations: string[] }
export interface CandidateRequest { entityType: EntityType; query: { name: string; namespace?: string | null }; options: { aliases?: AliasEntry[]; threshold?: number; limit?: number } }
export interface CandidateEvidence extends CandidateRequest { status: 'COMPLETE'; revision: string; candidates: ReturnType<Matching['candidates']>; fingerprint: string; authenticationVerified: false }
export interface ConfirmationIntent { entityType: EntityType; selectedId: string; namespace: string | null; selection: 'EXPLICIT'; expectedRevision: string; evidence: CandidateEvidence }
export interface Confirmation { status: 'CONFIRMED'; entityType: EntityType; id: string; namespace: string | null; revision: string; evidenceFingerprint: string; candidateQuality: CandidateEvidence['candidates']['quality']; identityQuality: 'EXACT_LOOKUP'; selection: 'DECLARED_EXPLICIT_SELECTION'; authenticationVerified: false; persisted: false }
export interface AliasIntent extends AliasEntry { evidence: { selection: 'EXPLICIT'; sourceId: string; expectedRevision: string } }
export interface AliasValidation { status: 'VALID' | 'AMBIGUOUS'; aliases: AliasIntent[]; conflicts: Array<{ entityType: EntityType; namespace: string | null; labelFingerprint: string; ownerIds: string[] }>; revision: string; fingerprint: string; authenticationVerified: false; durableWriteThrough: 'HELD' }
export interface MigrationGuard { status: 'NO_MIGRATION'; schemaVersion: 2; modifiesDataset: false; aliasMetadata: 'NOT_PRESENT'; newMetadataPersistence: 'HELD' }
export interface TerminalRequest { entityType: 'Task' | 'Activity'; id: string; operation: 'CANCEL' | 'COMPLETE' | 'EDIT'; expectedRevision: string; changes?: Partial<Pick<Task, 'title' | 'dueDate'>> | Partial<Pick<Activity, 'title' | 'eventDate' | 'endDate' | 'expenseAmount'>> }
export interface RecordChange { entityType: 'Task' | 'Activity'; id: string; before: Task | Activity; after: Task | Activity }
export interface TerminalPlan { status: 'PLANNED'; kind: 'TERMINAL'; request: TerminalRequest; expectedRevision: string; nextRevision: string; changes: RecordChange[]; scope: 'OPT_IN_PLAN_ONLY'; cascades: false; writes: false; persistence: 'HELD' }
export interface WithdrawState { formatVersion: 1; recommendations: Array<{ id: string; title: string; synthetic: true; sourceId: string }>; associations: Array<{ id: string; recommendationId: string; taskId: string; status: 'ACTIVE' | 'WITHDRAWN'; synthetic: true; sourceId: string }> }
export interface WithdrawRequest { recommendationId: string; expectedRevision: string; expectedStateRevision: string }
export interface WithdrawValidation { status: 'VALID'; durableWriteThrough: 'HELD'; authenticationVerified: false }
export interface WithdrawPlan { status: 'PLANNED'; kind: 'WITHDRAW'; request: WithdrawRequest; expectedRevision: string; expectedStateRevision: string; nextRevision: string; nextStateRevision: string; changes: RecordChange[]; nextState: WithdrawState; recommendationPreserved: true; auditPreserved: true; writes: false; persistence: 'HELD'; scope: 'EXPLICIT_ASSOCIATION_ONLY' }
export interface ArchiveState { formatVersion: 1; archived: Array<{ entityType: 'Customer'; id: string }> }
export interface ArchiveRequest { entityType: 'Customer'; id: string; expectedRevision: string; expectedStateRevision: string }
export interface ArchiveValidation { status: 'VALID'; objectScope: 'Customer'; durableWriteThrough: 'HELD' }
export interface ArchivePlan { status: 'PLANNED'; kind: 'ARCHIVE'; request: ArchiveRequest; expectedRevision: string; expectedStateRevision: string; nextRevision: string; nextStateRevision: string; changes: readonly []; nextState: ArchiveState; activeCustomerIds: string[]; stableIdsPreserved: true; referencesPreserved: true; writes: false; persistence: 'HELD'; scope: 'CUSTOMER_VIEW_ONLY' }
export type CommandPlan = TerminalPlan | WithdrawPlan | ArchivePlan;
export interface PlanValidation { status: 'VALID'; writes: false; scope: 'OPT_IN_PLAN_ONLY'; persistence: 'HELD' }
export interface DeleteRequest { entityType: 'Task' | 'Activity'; id: string; eligibility: 'DECLARED_TEMPORARY' }
export interface DeletePrecheck { status: 'ELIGIBLE_PRECHECK'; eligibility: 'CALLER_DECLARED_NOT_AUTHENTICATED'; associationScope: 'SCHEMA_2_ONLY'; limitations: string[]; writes: false }
export declare const apiRegistry: readonly Readonly<{ name: string; stability: 'EXPERIMENTAL'; scope: 'PURE_NO_WRITE' }>[];
export declare function assessTruth(fact: ActualFact): Readonly<TruthAssessment | Failure>;
export declare function selectPeriods(buckets: MonthBucket[], options: PeriodSelection): Readonly<SelectedPeriods | Failure>;
export declare function aggregatePeriods(buckets: MonthBucket[], options: CalendarPolicy & { bucketIds: string[] }): Readonly<AggregatedPeriods | Failure>;
export declare function summarizeHospitalSales(dataset: Dataset, scope: HospitalScope): Readonly<HospitalSales | Failure>;
export declare function summarizeHospitalProjection(facts: ProjectionFact[], scope: HospitalScope, dataset: Dataset): Readonly<HospitalProjection | Failure>;
export declare function candidateEvidence(dataset: Dataset, request: CandidateRequest): Promise<Readonly<CandidateEvidence | Failure>>;
export declare function confirmIdentity(dataset: Dataset, intent: ConfirmationIntent): Promise<Readonly<Confirmation | Failure>>;
export declare function validateAliases(dataset: Dataset, entries: AliasIntent[]): Promise<Readonly<AliasValidation | Failure>>;
export declare function migrationGuard(dataset: Dataset): Readonly<MigrationGuard | Failure>;
export declare function planTerminal(dataset: Dataset, request: TerminalRequest): Promise<Readonly<TerminalPlan | NoChange | Failure>>;
export declare function validateWithdrawState(dataset: Dataset, state: WithdrawState): Readonly<WithdrawValidation | Failure>;
export declare function planWithdraw(dataset: Dataset, state: WithdrawState, request: WithdrawRequest): Promise<Readonly<WithdrawPlan | NoChange | Failure>>;
export declare function validateArchiveState(dataset: Dataset, state: ArchiveState): Readonly<ArchiveValidation | Failure>;
export declare function planArchive(dataset: Dataset, state: ArchiveState, request: ArchiveRequest): Promise<Readonly<ArchivePlan | NoChange | Failure>>;
export declare function validateCommandPlan(dataset: Dataset, plan: CommandPlan, state?: WithdrawState | ArchiveState | null): Promise<Readonly<PlanValidation | Failure>>;
export declare function deletePrecheck(dataset: Dataset, request: DeleteRequest): Readonly<DeletePrecheck | Failure>;
declare const wave1: { readonly apiRegistry: typeof apiRegistry; readonly assessTruth: typeof assessTruth; readonly selectPeriods: typeof selectPeriods; readonly aggregatePeriods: typeof aggregatePeriods; readonly summarizeHospitalSales: typeof summarizeHospitalSales; readonly summarizeHospitalProjection: typeof summarizeHospitalProjection; readonly candidateEvidence: typeof candidateEvidence; readonly confirmIdentity: typeof confirmIdentity; readonly validateAliases: typeof validateAliases; readonly migrationGuard: typeof migrationGuard; readonly planTerminal: typeof planTerminal; readonly validateWithdrawState: typeof validateWithdrawState; readonly planWithdraw: typeof planWithdraw; readonly validateArchiveState: typeof validateArchiveState; readonly planArchive: typeof planArchive; readonly validateCommandPlan: typeof validateCommandPlan; readonly deletePrecheck: typeof deletePrecheck };
export default wave1;
