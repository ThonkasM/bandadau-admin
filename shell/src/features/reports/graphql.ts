import { gql } from 'urql';

export interface PersonRef {
  id: string;
  displayName: string | null;
  email: string;
}

export interface TicketValidationRow {
  ticketId: string;
  eventId: string;
  eventTitle: string;
  validatedAt: string;
  attendee: PersonRef | null;
  validatedBy: PersonRef | null;
}

const PERSON = 'id displayName email';

/** Reporte de asistencia: quién escaneó la entrada de quién (`ticketValidations`, solo ADMIN). */
export const TICKET_VALIDATIONS_QUERY = gql<
  { ticketValidations: { truncated: boolean; items: TicketValidationRow[] } },
  { range: { from: string; to: string }; eventId?: string | null; first: number }
>`
  query TicketValidations($range: DateRangeInput!, $eventId: UUID, $first: Int) {
    ticketValidations(range: $range, eventId: $eventId, first: $first) {
      truncated
      items { ticketId eventId eventTitle validatedAt attendee { ${PERSON} } validatedBy { ${PERSON} } }
    }
  }
`;

export interface EventReportRow {
  id: string;
  title: string;
  startsAt: string;
  venue: string;
  capacity: number;
  seatsTaken: number;
  priceCredits: number;
  status: string;
  organizer: PersonRef | null;
}

/** Inscripciones por evento (todos los eventos recientes, sin filtrar por fecha): cupo ocupado = inscripciones confirmadas. */
export const EVENTS_REPORT_QUERY = gql<{ events: EventReportRow[] }, Record<string, never>>`
  query EventsReport {
    events(first: 50) { id title startsAt venue capacity seatsTaken priceCredits status organizer { ${PERSON} } }
  }
`;

export interface RegistrationTotals {
  registrationsConfirmed: number;
  registrationsFailed: number;
  registrationsCancelled: number;
}

export const REGISTRATION_TOTALS_QUERY = gql<{ dashboard: RegistrationTotals }, { range: { from: string; to: string } }>`
  query RegistrationTotals($range: DateRangeInput!) {
    dashboard(range: $range) { registrationsConfirmed registrationsFailed registrationsCancelled }
  }
`;

export interface CreditPoint {
  date: string;
  topUpCredits: number;
  debitCredits: number;
  refundCredits: number;
}

export interface WalletReport {
  topUpCount: number;
  topUpCredits: number;
  debitCount: number;
  debitCredits: number;
  refundCount: number;
  refundCredits: number;
  netCredits: number;
  circulatingCredits: number | null;
  series: CreditPoint[];
}

export const WALLET_REPORT_QUERY = gql<{ walletStats: WalletReport }, { range: { from: string; to: string } }>`
  query WalletReport($range: DateRangeInput!) {
    walletStats(range: $range) {
      topUpCount topUpCredits debitCount debitCredits refundCount refundCredits netCredits circulatingCredits
      series { date topUpCredits debitCredits refundCredits }
    }
  }
`;

export interface SagaReportRow {
  id: string;
  type: 'REGISTRATION' | 'CANCELLATION';
  step: string;
  status: string;
  failureReason: string | null;
  retries: number;
  startedAt: string;
  updatedAt: string;
}

/** SAGAs de inscripción y cancelación actualizadas desde el inicio del rango (tope de la API: 50). */
export const SAGAS_REPORT_QUERY = gql<{ sagas: SagaReportRow[] }, { since: string; first: number }>`
  query SagasReport($since: DateTime, $first: Int) {
    sagas(since: $since, first: $first) { id type step status failureReason retries startedAt updatedAt }
  }
`;
