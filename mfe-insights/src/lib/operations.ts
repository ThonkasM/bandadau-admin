// Operaciones GraphQL de insights escritas a mano (contract-first). `scripts/check-contract.mjs` las valida
// contra bandadau-docs/contracts/graphql/admin.graphql. Las queries se envían siempre por POST.

const REPORT_CORE = `
  id title question locale status failureReason createdAt completedAt
  audioUrl audioDurationSeconds engine model
  agentRun { id status toolsUsed tokens { input output total } }
`;

const REPORT_FULL = `${REPORT_CORE} markdown dataset chart`;

const ALERT_FIELDS = `
  id severity kind message details status resource occurrences raisedAt acknowledgedAt
`;

const RUN_FIELDS = `
  id agent trigger status model toolsUsed tokens { input output total }
  error stopReason startedAt finishedAt
  steps { index kind toolName outputSummary isError startedAt durationMs }
  report { id title status }
  alerts { id severity kind message }
`;

export const REPORTS_QUERY = `query InsightsReports($after: String, $first: Int) {
  reports(after: $after, first: $first) {
    edges { cursor node { ${REPORT_CORE} } }
    pageInfo { hasNextPage endCursor }
  }
}`;

export const REPORT_QUERY = `query InsightsReport($id: UUID!) {
  report(id: $id) { ${REPORT_FULL} }
}`;

export const REPORT_ENGINES_QUERY = `query InsightsReportEngines {
  reportEngines { engine label model available external mode }
}`;

export const REQUEST_REPORT_MUTATION = `mutation InsightsRequestReport($question: String!, $locale: Locale, $engine: ReportEngine) {
  requestReport(question: $question, locale: $locale, engine: $engine) {
    report { ${REPORT_CORE} }
    errors { code message field }
  }
}`;

export const ALERTS_QUERY = `query InsightsAlerts($status: AlertStatus, $severity: AlertSeverity, $first: Int) {
  alerts(status: $status, severity: $severity, first: $first) { ${ALERT_FIELDS} }
}`;

export const ACKNOWLEDGE_ALERT_MUTATION = `mutation InsightsAcknowledgeAlert($id: UUID!) {
  acknowledgeAlert(id: $id) {
    alert { ${ALERT_FIELDS} }
    errors { code message field }
  }
}`;

export const RUN_MONITORING_MUTATION = `mutation InsightsRunMonitoring {
  runMonitoringNow {
    agentRun { ${RUN_FIELDS} }
    errors { code message field }
  }
}`;

export const AGENT_RUNS_QUERY = `query InsightsAgentRuns($after: String, $first: Int, $agent: AgentKind) {
  agentRuns(after: $after, first: $first, agent: $agent) {
    edges { cursor node { ${RUN_FIELDS} } }
    pageInfo { hasNextPage endCursor }
  }
}`;

export const REPORT_READY_SUBSCRIPTION = `subscription InsightsReportReady($id: UUID!) {
  reportReady(id: $id) { ${REPORT_FULL} }
}`;

export const ALERT_RAISED_SUBSCRIPTION = `subscription InsightsAlertRaised($minSeverity: AlertSeverity) {
  alertRaised(minSeverity: $minSeverity) { ${ALERT_FIELDS} }
}`;
