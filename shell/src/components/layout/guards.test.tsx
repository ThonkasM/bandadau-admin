import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSession } from '@/lib/auth/session-store';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => '/users/' }));
vi.mock('@/lib/auth/session', () => ({ bootstrapSession: vi.fn(async () => undefined), logout: vi.fn() }));

import { AuthGuard, RoleGuard } from './guards';

const user = (roles: string[]) => ({ id: '1', email: 'a@umsa.edu.bo', roles, status: 'ACTIVE', locale: 'es', theme: 'SYSTEM' }) as never;

describe('guards', () => {
  beforeEach(() => {
    replace.mockClear();
    useSession.setState({ status: 'idle', accessToken: null, user: null });
  });

  it('sin sesión redirige a login con next', () => {
    useSession.setState({ status: 'anonymous' });
    render(<AuthGuard>secreto</AuthGuard>);
    expect(replace).toHaveBeenCalledWith('/login/?next=%2Fusers%2F');
    expect(screen.queryByText('secreto')).toBeNull();
  });

  it('sesión sin rol de panel muestra acceso denegado', () => {
    useSession.setState({ status: 'authenticated', accessToken: 't', user: user(['STUDENT']) });
    render(<AuthGuard>secreto</AuthGuard>);
    expect(screen.getByText('Sin acceso al panel')).toBeInTheDocument();
    expect(screen.queryByText('secreto')).toBeNull();
  });

  it('MODERATOR pasa el guard de panel pero no el de ADMIN', () => {
    useSession.setState({ status: 'authenticated', accessToken: 't', user: user(['MODERATOR']) });
    render(
      <AuthGuard>
        <RoleGuard allow={['ADMIN']}>solo-admin</RoleGuard>
        <RoleGuard allow={['MODERATOR']}>mod</RoleGuard>
      </AuthGuard>,
    );
    expect(screen.queryByText('solo-admin')).toBeNull();
    expect(screen.getByText('mod')).toBeInTheDocument();
  });
});
