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

export interface PendingDecision {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  actionVerb: 'approve' | 'act' | 'clear' | 'release';
}

export interface PulseItem {
  id: string;
  dotColor: string;
  html: string;
}

export interface LiveRunSummary {
  id: string;
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
  steps: TimelineStep[];
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
  title: string;
  subtitle: string;
  madeBy: { type: 'human' | 'agent'; name: string; initials?: string; avatarBg?: string };
  informedBy: { type: 'agent' | 'policy'; name: string };
  date: string;
  verdict: Verdict;
  measuredImpact: { text: string; direction: 'up' | 'down' | 'flat' };
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
export type ConnectorTypeKey = 'snowflake' | 'dynamics' | 'salesforce' | 'sftp' | 'onedrive' | 'sharepoint' | 'custom';

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
}

export interface CreateConnectionInput {
  connectorTypeId: ConnectorTypeKey;
  name: string;
  config: Record<string, string>;
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
