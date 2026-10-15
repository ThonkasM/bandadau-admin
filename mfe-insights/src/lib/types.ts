import type {
  AgentKind,
  AgentRunStatus,
  AlertKind,
  AlertSeverity,
  AlertStatus,
  GeneratedReportStatus,
  Locale,
} from '@bandada/contracts-ts/graphql/admin';

export type { AgentKind, AgentRunStatus, AlertKind, AlertSeverity, AlertStatus, GeneratedReportStatus, Locale };

export interface TokenUsageView {
  input: number;
  output: number;
  total: number;
}

export interface Report {
  id: string;
  title: string | null;
  question: string;
  locale: Locale;
  status: GeneratedReportStatus;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  audioUrl: string | null;
  audioDurationSeconds: number | null;
  agentRun: { id: string; status: AgentRunStatus; toolsUsed: string[]; tokens: TokenUsageView | null } | null;
  /** Solo en `report(id)` / `reportReady`. */
  markdown?: string | null;
  dataset?: unknown;
  chart?: unknown;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  kind: AlertKind;
  message: string;
  details: unknown;
  status: AlertStatus;
  resource: string | null;
  occurrences: number;
  raisedAt: string;
  acknowledgedAt: string | null;
}

export interface AgentRunStepView {
  index: number;
  kind: string;
  toolName: string | null;
  outputSummary: string | null;
  isError: boolean;
  startedAt: string;
  durationMs: number;
}

export interface AgentRun {
  id: string;
  agent: AgentKind;
  trigger: string;
  status: AgentRunStatus;
  model: string | null;
  toolsUsed: string[];
  tokens: TokenUsageView | null;
  error: string | null;
  stopReason: string | null;
  startedAt: string;
  finishedAt: string | null;
  steps: AgentRunStepView[];
  report: { id: string; title: string | null; status: GeneratedReportStatus } | null;
  alerts: Array<Pick<Alert, 'id' | 'severity' | 'kind' | 'message'>>;
}

export interface Page<T> {
  items: T[];
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface Dataset {
  columns: string[];
  rows: unknown[][];
}
