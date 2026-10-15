import { create } from 'zustand';

import type { SessionUser } from './types';

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  /** Access token SOLO en memoria (seguridad-y-sso.md §5): nunca localStorage/sessionStorage/IndexedDB. */
  accessToken: string | null;
  user: SessionUser | null;
  /** Se incrementa en cada login/logout para recrear el cliente GraphQL y vaciar su caché. */
  epoch: number;
  setStatus: (status: SessionStatus) => void;
  setSession: (accessToken: string, user: SessionUser) => void;
  setToken: (accessToken: string) => void;
  clear: () => void;
}

export const useSession = create<SessionState>((set) => ({
  status: 'idle',
  accessToken: null,
  user: null,
  epoch: 0,
  setStatus: (status) => set({ status }),
  setSession: (accessToken, user) => set((s) => ({ status: 'authenticated', accessToken, user, epoch: s.epoch + 1 })),
  setToken: (accessToken) => set({ accessToken }),
  clear: () => set((s) => ({ status: 'anonymous', accessToken: null, user: null, epoch: s.epoch + 1 })),
}));
