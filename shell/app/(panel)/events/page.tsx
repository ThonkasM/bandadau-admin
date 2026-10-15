'use client';

import { RoleGuard } from '@/components/layout/guards';
import EventsPage from '@/features/events/EventsPage';

export default function Page() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <EventsPage />
    </RoleGuard>
  );
}
