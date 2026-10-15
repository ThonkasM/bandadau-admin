'use client';

import { Suspense } from 'react';

import { RoleGuard } from '@/components/layout/guards';
import { Skeleton } from '@/components/ui/Skeleton';
import EventDetailPage from '@/features/events/EventDetailPage';

export default function Page() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <EventDetailPage />
      </Suspense>
    </RoleGuard>
  );
}
