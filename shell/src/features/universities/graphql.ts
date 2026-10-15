import type { CreateUniversityInput, University, UserError } from '@bandada/contracts-ts/graphql/admin';
import { gql } from 'urql';

export type UniversityRow = Pick<University, 'id' | 'name' | 'allowedDomains' | 'enabled' | 'createdAt'>;

export const UNIVERSITIES_QUERY = gql<{ universities: UniversityRow[] }>`
  query Universities {
    universities { id name allowedDomains enabled createdAt }
  }
`;

export const CREATE_UNIVERSITY = gql<{ createUniversity: { university: UniversityRow | null; errors: UserError[] } }, { input: CreateUniversityInput }>`
  mutation CreateUniversity($input: CreateUniversityInput!) {
    createUniversity(input: $input) {
      university { id name allowedDomains enabled createdAt }
      errors { code message field }
    }
  }
`;
