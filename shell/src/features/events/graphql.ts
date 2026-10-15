import type {
  Event,
  EventFilter,
  Registration,
  SagaInstance,
  User,
} from '@bandada/contracts-ts/graphql/admin';
import { gql } from 'urql';

const EVENT_FIELDS = 'id title description startsAt venue capacity seatsTaken priceCredits status createdAt organizer { id email displayName }';

export type EventRow = Pick<Event, 'id' | 'title' | 'description' | 'startsAt' | 'venue' | 'capacity' | 'seatsTaken' | 'priceCredits' | 'status' | 'createdAt'> & {
  organizer: Pick<User, 'id' | 'email' | 'displayName'> | null;
};

export const EVENTS_QUERY = gql<{ events: EventRow[] }, { filter?: EventFilter; first?: number }>`
  query Events($filter: EventFilter, $first: Int) {
    events(filter: $filter, first: $first) { ${EVENT_FIELDS} }
  }
`;

export const EVENT_QUERY = gql<{ event: EventRow | null }, { id: string }>`
  query EventDetail($id: UUID!) {
    event(id: $id) { ${EVENT_FIELDS} }
  }
`;

export type SagaRow = Pick<SagaInstance, 'id' | 'registrationId' | 'type' | 'step' | 'status' | 'failureReason' | 'retries' | 'deadlineAt' | 'startedAt' | 'updatedAt'>;
const SAGA_FIELDS = 'id registrationId type step status failureReason retries deadlineAt startedAt updatedAt';

export type RegistrationRow = Pick<Registration, 'id' | 'eventId' | 'status' | 'failureReason' | 'createdAt' | 'updatedAt'> & {
  user: Pick<User, 'id' | 'email' | 'displayName'> | null;
  saga: SagaRow | null;
};

export const REGISTRATIONS_QUERY = gql<{ registrations: RegistrationRow[] }, { eventId: string; status?: Registration['status'] | null }>`
  query Registrations($eventId: UUID!, $status: RegistrationStatus) {
    registrations(eventId: $eventId, status: $status) {
      id eventId status failureReason createdAt updatedAt
      user { id email displayName }
      saga { ${SAGA_FIELDS} }
    }
  }
`;
