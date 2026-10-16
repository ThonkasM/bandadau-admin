'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { env } from '@/lib/env';
import { MfeHost } from '@/mfe/MfeHost';

/** Insights/Reportes: fase 2 detrás de `NEXT_PUBLIC_FEATURE_INSIGHTS`. Con el flag activo monta `<bandada-mfe-insights>`. */
export function InsightsSection({ section }: { section: 'insights' | 'reports' }) {
  const { t } = useTranslation();
  const [reload, setReload] = useState(0);
  return (
    <>
      <PageHeader
        title={t(`shell:nav.items.${section}`)}
        actions={env.featureInsights ? <RefreshButton onRefresh={() => setReload((value) => value + 1)} /> : undefined}
      />
      {env.featureInsights ? (
        <MfeHost key={reload} name="insights" />
      ) : (
        <Card>
          <EmptyState icon={Sparkles} title={t('shell:phase2.title')} description={t('shell:phase2.body')} />
        </Card>
      )}
    </>
  );
}
