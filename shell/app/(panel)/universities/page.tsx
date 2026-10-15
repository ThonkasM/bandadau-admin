'use client';

import { RoleGuard } from '@/components/layout/guards';
import UniversitiesPage from '@/features/universities/UniversitiesPage';

export default function Page() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <UniversitiesPage />
    </RoleGuard>
  );
}
