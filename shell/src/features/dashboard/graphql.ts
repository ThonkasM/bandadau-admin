import type { Alert, Dashboard, MetricSeries, QueryDashboardArgs, ServiceHealthReport } from '@bandada/contracts-ts/graphql/admin';
import { gql } from 'urql';

export type DashboardData = Pick<
  Dashboard,
  | 'activeUsers' | 'newUsers' | 'posts' | 'comments' | 'reactions' | 'registrationsConfirmed' | 'registrationsFailed'
  | 'registrationsCancelled' | 'creditsToppedUp' | 'creditsSpent' | 'flaggedContent' | 'openAlerts'
> & { series: MetricSeries[] };

export const DASHBOARD_QUERY = gql<{ dashboard: DashboardData }, QueryDashboardArgs>`
  query Dashboard($range: DateRangeInput!) {
    dashboard(range: $range) {
      activeUsers newUsers posts comments reactions
      registrationsConfirmed registrationsFailed registrationsCancelled
      creditsToppedUp creditsSpent flaggedContent openAlerts
      series { name points { date value } }
    }
  }
`;

export const SERVICE_HEALTH_QUERY = gql<{ serviceHealth: ServiceHealthReport }>`
  query ServiceHealth {
    serviceHealth {
      checkedAt overall
      services { name status latencyMs error }
      queues { name messagesReady messagesUnacked consumers isDeadLetter }
    }
  }
`;

export type AlertRow = Pick<Alert, 'id' | 'severity' | 'kind' | 'message' | 'status' | 'raisedAt' | 'occurrences' | 'resource'>;

export const OPEN_ALERTS_QUERY = gql<{ alerts: AlertRow[] }>`
  query OpenAlerts {
    alerts(status: OPEN, first: 5) { id severity kind message status raisedAt occurrences resource }
  }
`;

export const ALERT_RAISED_SUBSCRIPTION = gql<{ alertRaised: AlertRow }>`
  subscription AlertRaised {
    alertRaised { id severity kind message status raisedAt occurrences resource }
  }
`;
