import type { AlertSeverity, EventStatus,RegistrationStatus, SagaStatus, ServiceStatus, UserStatus } from '@bandada/contracts-ts/graphql/admin';

import type { BadgeTone } from '@/components/ui/Badge';

export const userStatusTone: Record<UserStatus, BadgeTone> = {
  ACTIVE: 'success',
  PENDING_VERIFICATION: 'warning',
  SUSPENDED: 'danger',
  DELETED: 'neutral',
};

export const serviceStatusTone: Record<ServiceStatus, BadgeTone> = { UP: 'success', DEGRADED: 'warning', DOWN: 'danger' };

export const severityTone: Record<AlertSeverity, BadgeTone> = { INFO: 'info', WARNING: 'warning', CRITICAL: 'danger' };

export const eventStatusTone: Record<EventStatus, BadgeTone> = { DRAFT: 'neutral', PUBLISHED: 'success', CANCELLED: 'danger', FINISHED: 'info' };

export const registrationTone: Record<RegistrationStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  FAILED: 'danger',
  CANCELLATION_PENDING: 'warning',
  CANCELLED: 'neutral',
};

export const sagaTone: Record<SagaStatus, BadgeTone> = {
  STARTED: 'info',
  AWAITING_DEBIT: 'warning',
  AWAITING_TICKET: 'warning',
  COMPENSATING: 'warning',
  COMPLETED: 'success',
  COMPENSATED: 'neutral',
  FAILED: 'danger',
};
