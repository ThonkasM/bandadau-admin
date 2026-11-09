'use client';

import { RoleGuard } from '@/components/layout/guards';
import ReportsPage from '@/features/reports/ReportsPage';

export default function Page() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <ReportsPage />
    </RoleGuard>
  );
}
