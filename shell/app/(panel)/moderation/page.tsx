'use client';

import { useTranslation } from 'react-i18next';

import { RoleGuard } from '@/components/layout/guards';
import { PageHeader } from '@/components/ui/PageHeader';
import { MfeHost } from '@/mfe/MfeHost';

// Una sola página estática: la sub-ruta del MFE viaja en `?path=` (static export no admite `[[...path]]` dinámico).
export default function Page() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['MODERATOR', 'ADMIN']}>
      <PageHeader title={t('shell:nav.items.moderation')} description={t('shell:moderation.description')} />
      <MfeHost name="moderation" />
    </RoleGuard>
  );
}
