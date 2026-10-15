'use client';

import { RoleGuard } from '@/components/layout/guards';
import UsersPage from '@/features/users/UsersPage';

export default function Page() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <UsersPage />
    </RoleGuard>
  );
}
