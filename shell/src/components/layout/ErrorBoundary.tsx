'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { Card, CardBody } from '../ui/Card';

function DefaultFallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <Card role="alert">
      <CardBody className="flex flex-col items-start gap-3">
        <h2 className="font-display text-lg font-semibold text-primary">{t('shell:states.crashTitle')}</h2>
        <p className="text-sm text-muted">{t('shell:states.crashBody')}</p>
        <Button onClick={onReset}>{t('common:actions.retry')}</Button>
      </CardBody>
    </Card>
  );
}

interface Props {
  children: ReactNode;
  /** Cambia para reiniciar el boundary (p. ej. la ruta actual). */
  resetKey?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
}

/** Error boundary por sección: un fallo en una página no tumba el layout (sidebar/header). */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  override render() {
    if (this.state.error) return <DefaultFallback onReset={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
