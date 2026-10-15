import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const useQuery = vi.fn();
vi.mock('urql', () => ({ useQuery: (...a: unknown[]) => useQuery(...a), gql: (s: TemplateStringsArray) => s.join('') }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));

import UsersPage from './UsersPage';

const node = (id: string, email: string, roles: string[], status = 'ACTIVE') => ({ id, email, displayName: null, status, roles, university: { id: 'u', name: 'UMSA' } });

describe('UsersPage', () => {
  it('muestra filas, roles y estado, y pagina por cursor', async () => {
    useQuery.mockImplementation(({ variables }: { variables?: { after?: string } }) =>
      variables && 'first' in variables
        ? [{ data: { users: { edges: [{ node: node('1', 'lucia@umsa.edu.bo', ['STUDENT']) }, { node: node('2', 'mod@umsa.edu.bo', ['MODERATOR'], 'SUSPENDED') }], pageInfo: { hasNextPage: true, endCursor: 'c1' } } }, fetching: false }, vi.fn()]
        : [{ data: { universities: [] }, fetching: false }, vi.fn()],
    );
    render(<UsersPage />);
    expect(screen.getByText('lucia@umsa.edu.bo')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Suspendido')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Gestionar a/ })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    const last = useQuery.mock.calls.filter(([a]) => a.variables && 'first' in a.variables).at(-1)![0];
    expect(last.variables.after).toBe('c1');
  });

  it('estado vacío con filtros', async () => {
    useQuery.mockReturnValue([{ data: { users: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } }, universities: [] }, fetching: false }, vi.fn()]);
    render(<UsersPage />);
    expect(screen.getByText('Aún no hay usuarios')).toBeInTheDocument();
  });
});
