'use client';

import { Suspense } from 'react';

import { RoleGuard } from '@/components/layout/guards';
import { Skeleton } from '@/components/ui/Skeleton';
import UserDetailPage from '@/features/users/UserDetailPage';

// `useSearchParams` exige Suspense en static export. El detalle usa `?id=` porque los ids no se conocen en build.
export default function Page() {
  return (
    <RoleGuard allow={['ADMIN', 'MODERATOR']}>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <UserDetailPage />
      </Suspense>
    </RoleGuard>
  );
}
