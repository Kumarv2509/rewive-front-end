// Shared types matching the Rewive API contract (see plan doc for full endpoint list).

export type Delta = {
  label: string;
  direction: 'up' | 'down' | 'flat';
};

export interface DashboardSummary {
  greetingName: string;
  summarySentence: string;
  kpis: {
    actionsExecutedToday: { value: number; delta: Delta };
    decisionsPending: { value: number; delta: Delta };
    agentsActiveNow: { value: number; delta: Delta };
    timeSavedThisWeek: { value: string; delta: Delta };
    onTimeExecution: { value: string; delta: Delta };
  };
}

// Personas double as routing roles: every finding is addressed to the role
// whose call it is. Sales execution → sales supervisor; cross-functional
// sales + logistics → COO; returns / discounts / trade spend → commercial
// finance. FP&A doesn't get a queue — it gets the P&L impact rollup.
export type Persona =
  | 'store_manager'
  | 'cfo'
  | 'operations_head'
  | 'sales_supervisor'
  | 'coo'
  | 'commercial_finance';

// The lens looks at one role ('role') or the role plus everyone who reports
// into it ('team' — hierarchy mode, for seeing what's impacted below you).
export type RoleScope = 'role' | 'team';

export interface CurrentUser {
  name: string;
  initials: string;
  avatarBg: string;
  role: string;
  isAdmin: boolean;
  defaultPersona: Persona;
}

export interface PendingDecision {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  actionVerb: 'approve' | 'act' | 'clear' | 'release';
  persona: Persona;
}

export interface PulseItem {
  id: string;
  dotColor: string;
  html: string;
}

export interface LiveRunSummary {
  id: string;
  persona: Persona;
  name: string;
  eta: string;
  percent: number;
  barColor?: string;
  stepDescription: string;
}

export interface TopPerformer {
  id: string;
  name: string;
  avatarBg: string;
  initials: string;
  badge: string;
  statLine: string;
}

export type RunStatus = 'running' | 'needs_decision' | 'completed' | 'failed';

export interface RunListItem {
  id: string;
  persona: Persona;
  name: string;
  owner: { name: string; initials: string; avatarBg: string } | null;
  agentName: string;
  status: RunStatus;
  duration: string;
  outcome: string;
}

export type TimelineStepStatus = 'done' | 'live' | 'wait' | 'gate';

export interface TimelineStep {
  id: string;
  status: TimelineStepStatus;
  label: string;
  description: string;
  duration: string;
  icon?: string;
}

export interface RunDetail {
  id: string;
  name: string;
  meta: string;
  isLive: boolean;
  paused?: boolean;
  steps: TimelineStep[];
}

// ---------- Runs: exception log and chase & escalate ----------
export type ExceptionSeverity = 'info' | 'warning' | 'error';
export type ExceptionStatus = 'open' | 'resolved';

export interface RunException {
  id: string;
  runId: string;
  runName: string;
  severity: ExceptionSeverity;
  message: string;
  status: ExceptionStatus;
  createdAt: string;
}

export type ChaseTrigger = 'sla' | 'feedback';

export interface ChaseEscalation {
  id: string;
  runId: string;
  runName: string;
  trigger: ChaseTrigger;
  note: string;
  escalatedTo: string;
  createdAt: string;
}

export interface DecisionStats {
  trackedQtd: { value: number; delta: Delta };
  winRate: { value: string; delta: Delta };
  medianTimeToDecision: { value: string; delta: Delta };
  measuredImpactQtd: { value: string; delta: Delta };
}

export type Verdict = 'worked' | 'not_worked' | 'too_early';

export interface DecisionLedgerItem {
  id: string;
  persona: Persona;
  title: string;
  subtitle: string;
  madeBy: { type: 'human' | 'agent'; name: string; initials?: string; avatarBg?: string };
  informedBy: { type: 'agent' | 'policy'; name: string };
  date: string;
  verdict: Verdict;
  measuredImpact: { text: string; direction: 'up' | 'down' | 'flat' };
  originatingSignalId?: string;
  /** The finding this decision dispositioned — links the ledger row to its thread. */
  findingId?: string;
  assessorNote?: string;
}

// FP&A rollup: findings translated onto the P&L, one row per line item —
// how many were identified, what happened to them, and the measured impact.
export interface PlImpactLine {
  key: string;
  plLine: string;
  topDrivers: string; // the findings that dominate this line, in plain words
  identified: number;
  accepted: number;
  acting: number;
  cleared: number; // loops closed — the number came back
  openNow: number;
  translatedImpact: { text: string; direction: 'up' | 'down' | 'flat' };
}

// ---------- FP&A: the full P&L, with Budget and Forecast as the base of drift ----------
// Values are pre-formatted numbers in the statement's unit (e.g. "128.4" with
// unit "AED M"); variances are percentages vs budget / vs forecast. isCost
// flips the good/bad direction for coloring.
export interface PlBreakdownRow {
  key: string;
  label: string;
  actual: string;
  budget: string;
  forecast: string;
  varBudgetPct: number;
  varForecastPct: number;
  anomalyIds: string[];
}

export interface PlStatementLine {
  key: string;
  label: string;
  kind: 'line' | 'subtotal';
  isCost: boolean;
  actual: string;
  budget: string;
  forecast: string;
  varBudgetPct: number;
  varForecastPct: number;
  anomalyIds: string[];
  /** Drill-downs; subtotal lines and overheads may have none. */
  byDimA?: PlBreakdownRow[];
  byDimB?: PlBreakdownRow[];
}

export type PlAnomalyStatus = 'raised' | 'watching' | 'cleared' | 'new';

// A drift anomaly is a task: what drifted, against which base (budget /
// forecast), on which P&L cell (line × dimA × dimB), whose call it is, and
// where it stands in the loop. findingId links it to the thread when the
// counterpart has raised it.
export interface PlAnomalyTask {
  id: string;
  title: string;
  plLineKey: string;
  plLineLabel: string;
  dimA?: string;
  dimB?: string;
  driftVsBudgetPct: number;
  driftVsForecastPct: number;
  impact: string;
  severity: FindingSeverity;
  routedTo: Persona;
  status: PlAnomalyStatus;
  findingId?: string;
}

export interface PlStatement {
  period: string;
  unit: string; // e.g. "AED M"
  dimALabel: string; // e.g. "SKU family" / "Service line"
  dimBLabel: string; // e.g. "Channel" / "Payer"
  lines: PlStatementLine[];
  anomalies: PlAnomalyTask[];
}

export interface LeaderboardHighlight {
  id: string;
  medal: string;
  tag: string;
  name: string;
  avatarBg: string;
  initials: string;
  statLine: string;
}

export interface LeaderboardRow {
  id: string;
  persona: Persona;
  type: 'human' | 'agent';
  name: string;
  initials: string;
  avatarBg: string;
  actionsClosed: number;
  onTimePct: number;
  decisionWinRatePct: number;
  timeSaved: string;
  trend: number[];
  trendColor: string;
}

export interface LoopSpeedRow {
  id: string;
  persona: Persona;
  mandate: string;
  stream: string;
  owner: { name: string; initials: string; avatarBg: string };
  counterpart: string;
  findings90d: number;
  medianTimeToDecide: string;
  medianTimeToClose: string;
  closedInWindowPct: number;
  trend: number[];
  trendColor: string;
}

export interface ScoreCard {
  id: string;
  label: string;
  value: string;
  deltaLabel: string;
  deltaTone: 'green' | 'red' | 'amber';
  sparkline: number[];
  sparklineColor: string;
}

export interface OutcomeInsight {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  text: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  subtitle: string;
  assigned: boolean;
  assignedTo?: string;
  actionType: 'assign' | 'schedule';
  scheduled?: boolean;
}

export interface OutcomeReport {
  runId: string;
  title: string;
  runMeta: string;
  published: boolean;
  scoreCards: ScoreCard[];
  insights: OutcomeInsight[];
  actions: RecommendedAction[];
}

export type AgentBuilderStepType = 'capabilities' | 'data_context' | 'plan';

export interface AgentBuilderChoice {
  id: string;
  label: string;
  selected: boolean;
}

export interface AgentBuilderPlanStep {
  n: number;
  text: string;
}

export interface AgentBuilderMessage {
  id: string;
  role: 'user' | 'bot';
  stepType?: AgentBuilderStepType;
  stepLabel?: string;
  text?: string;
  choices?: AgentBuilderChoice[];
  plan?: {
    name: string;
    estRuntime: string;
    steps: AgentBuilderPlanStep[];
  };
}

export interface AgentBuilderSession {
  sessionId: string;
  messages: AgentBuilderMessage[];
  detectedTemplate?: string;
}

export interface AgentPreview {
  agentId: string;
  state: 'draft' | 'live';
  name: string;
  function: string;
  capabilitiesCount: number;
  dataInputs: string;
  reviewGate: string;
  owner: { name: string; initials: string; avatarBg: string };
  guardrails: string;
  estRuntime: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

// ============ v2 ============

// ---------- Data Connectors ----------
export type ConnectorTypeKey =
  | 'snowflake'
  | 'dynamics'
  | 'salesforce'
  | 'sftp'
  | 'onedrive'
  | 'sharepoint'
  | 'anaplan'
  | 'adaptive_planning'
  | 'custom';

export interface ConnectorField {
  key: string;
  label: string;
  inputType: 'text' | 'password' | 'url' | 'select';
  required: boolean;
  options?: string[];
}

export interface ConnectorType {
  id: ConnectorTypeKey;
  name: string;
  icon: string;
  description: string;
  fields: ConnectorField[];
  isCustom: boolean;
}

export type ConnectionStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'error';

export interface DataConnection {
  id: string;
  connectorTypeId: ConnectorTypeKey;
  connectorTypeName: string;
  name: string;
  status: ConnectionStatus;
  owner: { name: string; initials: string; avatarBg: string };
  createdDate: string;
  lastSyncedAt: string | null;
  config: Record<string, string>;
  errorMessage?: string;
  forKpiId?: string;
}

export interface CreateConnectionInput {
  connectorTypeId: ConnectorTypeKey;
  name: string;
  config: Record<string, string>;
  forKpiId?: string;
}

export interface CreateCustomConnectorTypeInput {
  name: string;
  icon: string;
  description: string;
  fields: ConnectorField[];
}

// ---------- Agent Space ----------
export type AgentIndustry =
  | 'fnb'
  | 'healthcare'
  | 'retail'
  | 'manufacturing'
  | 'logistics'
  | 'technology'
  | 'financial_services'
  | 'real_estate'
  | 'general';
export type AgentFunction = 'finance' | 'hr' | 'procurement' | 'it' | 'sales' | 'customer_success';
export type AgentCatalogStatus = 'draft' | 'live' | 'paused' | 'archived';
export type AgentCreationPath = 'chat' | 'studio';

export interface AgentCostBudget {
  maxTokensPerRun?: number;
  maxMonthlyCost?: string;
}

export interface AgentCatalogEntry extends AgentPreview {
  description: string;
  industry: AgentIndustry;
  function2: AgentFunction;
  persona: Persona;
  catalogStatus: AgentCatalogStatus;
  creationPath: AgentCreationPath;
  workflowId?: string;
  inputsSummary: string[];
  outputsSummary: string[];
  roiToDate: { label: string; value: string; direction: 'up' | 'down' | 'flat' };
  tokenCostToDate: { tokens: number; estCost: string };
  runsCount: number;
  lastRunAt: string | null;
  costBudget?: AgentCostBudget;
}

export interface AgentCatalogFilters {
  industry?: AgentIndustry | 'all';
  function?: AgentFunction | 'all';
  status?: AgentCatalogStatus | 'all';
  agentType?: AgentCreationPath | 'all';
  search?: string;
  persona?: Persona | 'all';
  scope?: RoleScope;
}

// ---------- Agent Studio ----------
export type StudioNodeKind = 'input' | 'process' | 'output' | 'agent' | 'approval' | 'loop';

export interface StudioNodeBase {
  id: string;
  kind: StudioNodeKind;
  position: { x: number; y: number };
  label: string;
}

export type StudioInputSourceType = 'connector' | 'synthetic';
export interface InputNodeData extends StudioNodeBase {
  kind: 'input';
  sourceType: StudioInputSourceType;
  connectionId?: string;
  syntheticDatasetId?: string;
}

export interface ProcessNodeData extends StudioNodeBase {
  kind: 'process';
  instructions: string;
  generatedPrompt: string;
  generatedAt: string | null;
}

export type StudioOutputType = 'mcp' | 'connector' | 'excel' | 'ppt' | 'json' | 'pdf' | 'word';
export interface OutputNodeData extends StudioNodeBase {
  kind: 'output';
  outputType: StudioOutputType;
  connectionId?: string;
  destinationLabel: string;
}

export interface AgentNodeData extends StudioNodeBase {
  kind: 'agent';
  refAgentId?: string;
  inlineWorkflowId?: string;
}

export interface ApprovalNodeData extends StudioNodeBase {
  kind: 'approval';
  approverUserIds: string[];
  instructions: string;
}

export interface LoopNodeData extends StudioNodeBase {
  kind: 'loop';
  iterationMode: 'fixed_count' | 'per_item';
  iterationCount?: number;
  itemsSourceNodeId?: string;
  childNodeIds: string[];
}

export type StudioNode = InputNodeData | ProcessNodeData | OutputNodeData | AgentNodeData | ApprovalNodeData | LoopNodeData;

export interface StudioEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export type WorkflowStatus = 'draft' | 'published';

export interface AgentWorkflow {
  id: string;
  name: string;
  status: WorkflowStatus;
  version: number;
  publishedVersion: number | null;
  nodes: StudioNode[];
  edges: StudioEdge[];
  linkedAgentId?: string;
  createdAt: string;
  updatedAt: string;
  owner: { name: string; initials: string; avatarBg: string };
  costBudget?: AgentCostBudget;
}

export interface SimulationNodeResult {
  nodeId: string;
  summary: string;
  sampleOutputPreview: string;
}

export interface SimulationResult {
  workflowId: string;
  ranAt: string;
  status: 'success' | 'partial' | 'failed';
  nodeResults: SimulationNodeResult[];
  finalOutputPreview: string;
  budgetWarning?: string;
}

// ---------- Signal Studio ----------
export type SignalCategory = 'derailer' | 'laggard' | 'cost_drainer' | 'revenue_leakage' | 'other';

export interface SignalLineageEntry {
  connectionId: string;
  fieldsUsed: string[];
}

export interface SuggestedSignal {
  id: string;
  name: string;
  description: string;
  category: SignalCategory;
  sourceConnectionIds: string[];
  computableNow: boolean;
  approvalStatus: 'suggested' | 'pending_review' | 'approved' | 'rejected';
  lineage: SignalLineageEntry[];
  persona: Persona;
}

export interface ReviewCommitteeMember {
  userId: string;
  name: string;
  initials: string;
  avatarBg: string;
  title: string;
}

export interface SignalApproval {
  signalId: string;
  approvedByUserId: string;
  approvedAt: string;
}

export type ItsmStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';

export interface ItsmComment {
  id: string;
  authorName: string;
  authorInitials: string;
  authorAvatarBg: string;
  text: string;
  createdAt: string;
  stageAtComment: ItsmStatus;
}

export interface TrackedKpiTicket {
  id: string;
  signalId: string;
  signalName: string;
  status: ItsmStatus;
  assignedTo: { name: string; initials: string; avatarBg: string };
  comments: ItsmComment[];
  createdAt: string;
  updatedAt: string;
  lineage: SignalLineageEntry[];
}

export interface DatasetSignalCoverage {
  connectionId: string;
  connectionName: string;
  calculableSignalIds: string[];
}

// ---------- Shared people directory & audit log (extras) ----------
export interface PersonDirectoryEntry {
  userId: string;
  name: string;
  initials: string;
  avatarBg: string;
  roles: string[];
}

export type AuditEntityType = 'connection' | 'signal' | 'decision' | 'workflow';

export interface AuditLogEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actorName: string;
  timestamp: string;
}

// ---------- Signal detail (drill-down) ----------
export interface SignalDatasetRow {
  date: string;
  label: string;
  maskedField: string;
  variance: string;
}

export interface PriorSolutionOutcome {
  summary: string;
  verdict: Verdict;
  cost: string;
  valueGenerated: string;
  timeline: { label: string; date: string }[];
}

export interface SimilarSignalMatch {
  id: string;
  label: string;
  scope: 'same_group' | 'restricted';
  priorSolution?: PriorSolutionOutcome;
  accessRequested?: boolean;
}

export interface SignalPrognosis {
  impactRange: string;
  confidence: 'low' | 'medium' | 'high';
  trend: 'up' | 'down' | 'flat';
  timeframe: string;
}

export interface SignalDetail {
  signalId: string;
  whySurfaced: string;
  prognosis: SignalPrognosis;
  datasetRows: SignalDatasetRow[];
  piiMasked: boolean;
  piiUnmaskRequested: boolean;
  similarSignals: SimilarSignalMatch[];
}

// ---------- Solution in hand (fast path — reviewer already has a fix) ----------
export type QuickSolutionStatus = 'drafting' | 'pending_confirmation' | 'confirmed';

export interface QuickSolution {
  id: string;
  signalId: string;
  description: string;
  status: QuickSolutionStatus;
  tasks: SolutionTask[];
  createdAt: string;
}

// ---------- Solution design ----------
export type SolutionTaskType = 'new_agent' | 'existing_agent' | 'human_task';
export type SolutionTaskStatus = 'proposed' | 'needs_review' | 'confirmed' | 'in_progress' | 'done';
export type TaskChannel = 'app' | 'teams' | 'slack' | 'servicenow';

export interface TaskComment {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface SolutionTask {
  id: string;
  persona: Persona;
  type: SolutionTaskType;
  title: string;
  owner: string;
  status: SolutionTaskStatus;
  channel: TaskChannel;
  comments: TaskComment[];
  agentSpecId?: string;
  // populated only when returned from the aggregate /tasks endpoint
  solutionId?: string;
  solutionName?: string;
}

export interface ValidationReview {
  pros: string[];
  cons: string[];
  expectedRoi: string;
  expectedCost: string;
  timeToValue: string;
  recommendation: 'dev_handoff' | 'ready_for_runs';
  recommendationReason: string;
}

export interface HandoffCardData {
  kind: 'escalate' | 'handback';
  fromName: string;
  fromRole: string;
  toLabel: string;
  note: string;
  createdAt: string;
  contract?: { does: string; wont: string; owner: string; whenUnsure: string };
}

export type SolutionDesignStatus = 'drafting' | 'pending_approval' | 'approved';

export interface SolutionDesign {
  id: string;
  signalId: string;
  signalName: string;
  signalCategory: SignalCategory;
  status: SolutionDesignStatus;
  approach: string;
  dataNeeded: string;
  owner: { name: string; initials: string; avatarBg: string };
  guardrails: string;
  copiedFromLabel: string | null;
  taskList: SolutionTask[];
  validation: ValidationReview | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Unified Agent Studio (one spec, two altitudes) ----------
export type AgentAltitude = 'business' | 'developer';
export type AgentSpecStatus = 'drafting' | 'escalated' | 'ready_to_publish' | 'published';

export interface AgentSpecVersionEntry {
  version: number;
  summary: string;
  actorName: string;
  altitude: AgentAltitude;
  timestamp: string;
}

export interface AgentSpecCapability {
  id: string;
  label: string;
  selected: boolean;
}

export type AgentTone = 'direct' | 'diplomatic' | 'warm' | 'formal';
export type AgentCommunicationStyle = 'concise' | 'data_first' | 'story_first';
export type AgentResponseType = 'proactive' | 'wait_to_be_asked' | 'scheduled_digest';
export type AgentWorkingHours = 'business_hours' | 'always_on' | 'custom';

export interface AgentDelegateIdentity {
  delegateName: string;
  tone: AgentTone;
  communicationStyle: AgentCommunicationStyle;
  responseType: AgentResponseType;
  escalationTemperament: number;
  workingHours: AgentWorkingHours;
  whenUnsure: string;
}

export interface AgentSpec {
  id: string;
  name: string;
  persona: Persona;
  solutionDesignId: string;
  taskId: string;
  status: AgentSpecStatus;
  needsTechnicalWork: boolean;
  owner: { name: string; initials: string; avatarBg: string };
  version: number;
  versionTrail: AgentSpecVersionEntry[];
  // business altitude
  intent: string;
  capabilities: AgentSpecCapability[];
  planPreview: string[];
  delegateIdentity: AgentDelegateIdentity;
  // developer altitude
  dataContract: string[];
  permissions: string[];
  guardrails: string;
  testRunResult: string | null;
  // handoff
  escalation: HandoffCardData | null;
  handback: HandoffCardData | null;
  linkedAgentId?: string;
}

// ---------- KPI Library (onboarding: pick KPIs, or import drivers and budget) ----------
// Healthcare segments + FMCG segments; the Mandate Library shows the set that
// matches the chosen industry context.
export type KpiSegment = 'hospital' | 'clinic' | 'pharmacy' | 'manufacturing' | 'distribution' | 'retail_trade';
export type KpiCategory = 'financial' | 'operational' | 'clinical' | 'patient_experience';

export interface KpiDriver {
  name: string;
  dataSource: string;
}

export interface KpiCatalogEntry {
  id: string;
  name: string;
  segment: KpiSegment;
  category: KpiCategory;
  definition: string;
  formula: string;
  driversNeeded: KpiDriver[];
}

export type TrackedKpiSource = 'catalog' | 'custom' | 'planning_import';
export type TrackedKpiDataStatus = 'connected' | 'needs_connection' | 'pending_approval';

export interface TrackedKpi {
  id: string;
  name: string;
  segment: KpiSegment | null;
  category: KpiCategory | null;
  source: TrackedKpiSource;
  driversNeeded: KpiDriver[];
  dataStatus: TrackedKpiDataStatus;
  addedAt: string;
}

export interface CustomKpiInput {
  name: string;
  drivers: KpiDriver[];
}

export interface PlanningImportResult {
  connectionId: string;
  connectorName: string;
  driversImported: { name: string; value: string }[];
  budgetLinesImported: { name: string; amount: string }[];
  importedAt: string;
}

// ============ v4 — shadow organization ============

// ---------- Org profile & industry templates ----------
export type IndustryKey = 'fmcg' | 'healthcare' | 'manufacturing';

export interface OrgProfile {
  orgName: string;
  industry: IndustryKey;
}

export interface IndustryOption {
  id: IndustryKey;
  name: string;
  description: string;
  streamCount: number;
  kpiCount: number;
}

// ---------- KPI brain (graph: targets ← stream KPIs ← drivers) ----------
export type BrainNodeKind = 'target' | 'stream_kpi' | 'driver';
export type BrainNodeStatus = 'connected' | 'proposed' | 'needs_data' | 'declined';
export type BrainHealth = 'on_track' | 'at_risk' | 'off_track';
export type BrainEdgeWeight = 'strong' | 'moderate' | 'weak';

export interface BrainNode {
  id: string;
  kind: BrainNodeKind;
  name: string;
  streamKey: string | null; // null for org-level targets
  definition: string;
  currentValue?: string;
  targetValue?: string;
  trend?: 'up' | 'down' | 'flat';
  health?: BrainHealth;
  status: BrainNodeStatus;
  proposedBy?: string; // shadow agent name, when status === 'proposed'
  dataSources: string[];
}

export interface BrainEdge {
  id: string;
  source: string; // contributes from (driver / stream KPI)
  target: string; // contributes to (stream KPI / target)
  weight: BrainEdgeWeight;
  status: 'connected' | 'proposed';
  rationale?: string;
  proposedBy?: string;
}

export interface StreamDef {
  key: string;
  name: string;
  answersTo: string;
}

export interface KpiBrain {
  industry: IndustryKey;
  streams: StreamDef[];
  nodes: BrainNode[];
  edges: BrainEdge[];
}

export interface CustomBrainNodeInput {
  name: string;
  streamKey: string;
  definition: string;
  dataSources: string[];
  contributesTo: string; // node id the new KPI feeds
}

export interface UpdateBrainNodeInput {
  id: string;
  name?: string;
  definition?: string;
  targetValue?: string;
  streamKey?: string;
  dataSources?: string[];
}

// ---------- Shadow org (agent counterparts per function stream) ----------
export type ShadowAgentHealth = 'healthy' | 'attention' | 'critical';

export interface ShadowAgent {
  id: string;
  persona: Persona;
  name: string;
  streamKey: string | null; // null = org-level chief of staff
  humanOwner: { name: string; initials: string; avatarBg: string; role: string };
  watchesNodeIds: string[];
  openFindings: number;
  slaBreaches: number;
  temperament: number; // 0 quiet … 100 hair-trigger
  health: ShadowAgentHealth;
  lastFindingAt: string | null;
  reportsToAgentId: string | null;
}

export interface ShadowOrg {
  industry: IndustryKey;
  agents: ShadowAgent[];
}

// ---------- Findings (evolved signals — every finding demands a disposition) ----------
export type FindingDisposition = 'accept' | 'act' | 'acknowledge' | 'abandon';
export type FindingStatus = 'open' | 'accepted' | 'acting' | 'acknowledged' | 'abandoned' | 'closed';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ImpactPathStep {
  nodeId: string;
  nodeName: string;
  kind: BrainNodeKind;
  effect: string;
}

export interface FindingEvidenceItem {
  label: string;
  value: string;
}

export interface Finding {
  id: string;
  title: string;
  summary: string;
  raisedByAgentId: string;
  raisedByAgentName: string;
  streamKey: string;
  linkedKpiNodeId: string;
  severity: FindingSeverity;
  impactPath: ImpactPathStep[]; // leaf → target
  impactEstimate: string;
  evidence: FindingEvidenceItem[];
  status: FindingStatus;
  disposition: FindingDisposition | null;
  dispositionBy: string | null;
  dispositionAt: string | null;
  dispositionReason: string | null; // required for abandon
  slaHoursRemaining: number;
  escalationLevel: number; // 0 = stream owner, 1+ = up the shadow org
  escalatedToAgentId: string | null;
  closureKpiId: string | null; // set on accept
  solutionDesignId: string | null; // set on act
  reAlertCondition: string | null; // set on acknowledge
  assessorVerdict?: { verdict: Verdict; note: string; at: string } | null; // set when the loop closes
  detectedAt: string;
  persona: Persona;
}

export interface DispositionInput {
  disposition: FindingDisposition;
  reason?: string; // required for abandon
  reAlertCondition?: string; // optional override for acknowledge
}

// ---------- Closure KPIs (measurable exit condition per accepted finding) ----------
export type ClosureStatus = 'tracking' | 'closed' | 'regressed';

export interface ClosureKpi {
  id: string;
  findingId: string;
  findingTitle: string;
  name: string;
  baseline: string;
  target: string;
  current: string;
  progressPct: number;
  status: ClosureStatus;
  watchedByAgentName: string;
  createdAt: string;
  closedAt: string | null;
}
