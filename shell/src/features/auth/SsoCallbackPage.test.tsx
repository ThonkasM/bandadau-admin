import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();
const loginWithHandoff = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/auth/session', () => ({ loginWithHandoff: (...a: unknown[]) => loginWithHandoff(...a), bootstrapSession: vi.fn(async () => undefined), logout: vi.fn() }));

import { ApiError } from '@/lib/api-error';
import { useSession } from '@/lib/auth/session-store';

import SsoCallbackPage from './SsoCallbackPage';

describe('SsoCallbackPage', () => {
  beforeEach(() => {
    replace.mockClear();
    loginWithHandoff.mockReset();
    useSession.setState({ status: 'anonymous', accessToken: null, user: null });
  });

  it('canjea code + cv y limpia la URL', async () => {
    window.history.pushState(null, '', '/sso/callback/?code=hc_abc#cv=verifier123');
    loginWithHandoff.mockResolvedValue({ user: { id: '1', email: 'admin@umsa.edu.bo', roles: ['ADMIN'] } });
    render(<SsoCallbackPage />);
    await waitFor(() => expect(loginWithHandoff).toHaveBeenCalledWith('hc_abc', 'verifier123'));
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
  });

  it('código inválido muestra el aviso y el acceso al login', async () => {
    window.history.pushState(null, '', '/sso/callback/?code=hc_bad#cv=v');
    loginWithHandoff.mockRejectedValue(new ApiError({ status: 401, code: 'HANDOFF_CODE_INVALID' }));
    render(<SsoCallbackPage />);
    expect(await screen.findByText(/expiró o ya se usó/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});
