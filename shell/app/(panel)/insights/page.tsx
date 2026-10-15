'use client';

import { RoleGuard } from '@/components/layout/guards';
import { InsightsSection } from '@/features/insights/InsightsSection';

export default function Page() {
  return (
    <RoleGuard allow={['ADMIN']}>
      <InsightsSection section="insights" />
    </RoleGuard>
  );
}
