'use client';

import type { ReactNode } from 'react';

import { GraphQLProvider } from '@/components/GraphQLProvider';
import { AuthGuard } from '@/components/layout/guards';
import { Shell } from '@/components/layout/Shell';

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <GraphQLProvider>
        <Shell>{children}</Shell>
      </GraphQLProvider>
    </AuthGuard>
  );
}
