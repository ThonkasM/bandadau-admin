'use client';

import { RoleGuard } from '@/components/layout/guards';
import SagasPage from '@/features/sagas/SagasPage';

export default function Page() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <SagasPage />
    </RoleGuard>
  );
}
