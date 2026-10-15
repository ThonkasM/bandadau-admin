'use client';

import { RoleGuard } from '@/components/layout/guards';
import DashboardPage from '@/features/dashboard/DashboardPage';

export default function Page() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <DashboardPage />
    </RoleGuard>
  );
}
