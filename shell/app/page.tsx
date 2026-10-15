'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AuthGuard } from '@/components/layout/guards';
import { useSession } from '@/lib/auth/session-store';
import { homeFor } from '@/lib/auth/types';

function RedirectHome() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  useEffect(() => {
    router.replace(homeFor(user));
  }, [router, user]);
  return null;
}

export default function Page() {
  return (
    <AuthGuard>
      <RedirectHome />
    </AuthGuard>
  );
}
