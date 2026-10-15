import type {
  MutationReactivateUserArgs,
  MutationSuspendUserArgs,
  MutationUpdateUserRolesArgs,
  PageInfo,
  QueryUsersArgs,
  Role,
  University,
  User,
  UserError,
} from '@bandada/contracts-ts/graphql/admin';
import { gql } from 'urql';

const USER_FIELDS = `
  id email displayName status roles locale theme createdAt emailVerifiedAt suspendedAt suspensionReason
  career semester university { id name }
`;

export type UserRow = Pick<
  User,
  | 'id' | 'email' | 'displayName' | 'status' | 'roles' | 'locale' | 'theme' | 'createdAt' | 'emailVerifiedAt'
  | 'suspendedAt' | 'suspensionReason' | 'career' | 'semester'
> & { university: Pick<University, 'id' | 'name'> | null };

export const USERS_QUERY = gql<
  { users: { edges: Array<{ cursor: string; node: UserRow }>; pageInfo: Pick<PageInfo, 'hasNextPage' | 'endCursor'> } },
  QueryUsersArgs
>`
  query Users($filter: UserFilter, $after: String, $first: Int) {
    users(filter: $filter, after: $after, first: $first) {
      edges { cursor node { ${USER_FIELDS} } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const USER_QUERY = gql<{ user: UserRow | null }, { id: string }>`
  query User($id: UUID!) {
    user(id: $id) { ${USER_FIELDS} }
  }
`;

type Payload = { user: UserRow | null; errors: UserError[] };

export const UPDATE_USER_ROLES = gql<{ updateUserRoles: Payload }, MutationUpdateUserRolesArgs>`
  mutation UpdateUserRoles($input: UpdateUserRolesInput!) {
    updateUserRoles(input: $input) { user { ${USER_FIELDS} } errors { code message field } }
  }
`;

export const SUSPEND_USER = gql<{ suspendUser: Payload }, MutationSuspendUserArgs>`
  mutation SuspendUser($input: SuspendUserInput!) {
    suspendUser(input: $input) { user { ${USER_FIELDS} } errors { code message field } }
  }
`;

export const REACTIVATE_USER = gql<{ reactivateUser: Payload }, MutationReactivateUserArgs>`
  mutation ReactivateUser($input: ReactivateUserInput!) {
    reactivateUser(input: $input) { user { ${USER_FIELDS} } errors { code message field } }
  }
`;

export const ALL_ROLES: readonly Role[] = ['STUDENT', 'ORGANIZER', 'MODERATOR', 'ADMIN'];
export const ALL_USER_STATUSES = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'] as const;
