import type { QuerySagasArgs, UserError } from '@bandada/contracts-ts/graphql/admin';
import { gql } from 'urql';

import type { SagaRow } from '../events/graphql';

const SAGA_FIELDS = 'id registrationId type step status failureReason retries deadlineAt startedAt updatedAt';

export const SAGAS_QUERY = gql<{ sagas: SagaRow[] }, QuerySagasArgs>`
  query Sagas($status: SagaStatus, $type: SagaType, $first: Int) {
    sagas(status: $status, type: $type, first: $first) { ${SAGA_FIELDS} }
  }
`;

export const RETRY_SAGA = gql<{ retrySaga: { saga: SagaRow | null; errors: UserError[] } }, { id: string }>`
  mutation RetrySaga($id: UUID!) {
    retrySaga(id: $id) { saga { ${SAGA_FIELDS} } errors { code message field } }
  }
`;
