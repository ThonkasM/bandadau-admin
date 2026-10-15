import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Reproductor de audio accesible (controles nativos; la transcripción es el resumen visible).
 * Si la URL prefirmada expiró, `onExpired` pide `report(id)` otra vez para obtener una nueva (UC-19 16a).
 */
export function AudioPlayer({
  url,
  durationSeconds,
  onExpired,
}: {
  url: string | null;
  durationSeconds: number | null;
  onExpired: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<'ok' | 'refreshing' | 'failed'>('ok');
  const retried = useRef<string | null>(null);

  if (!url) {
    return (
      <p className="bi-hint" role="status">
        {t('reports.audio.unavailable')}
      </p>
    );
  }

  const onError = () => {
    if (retried.current === url) {
      setState('failed');
      return;
    }
    retried.current = url;
    setState('refreshing');
    void onExpired().then(
      () => setState('ok'),
      () => setState('failed'),
    );
  };

  return (
    <div className="bi-audio">
      <audio key={url} controls preload="none" src={url} aria-label={t('reports.audio.label')} onError={onError}>
        <track kind="captions" />
      </audio>
      <p className="bi-hint">
        {durationSeconds ? `${t('reports.audio.duration', { seconds: durationSeconds })}. ` : ''}
        {t('reports.audio.transcriptNote')}
      </p>
      {state === 'refreshing' ? <p className="bi-hint" role="status">{t('reports.audio.refreshing')}</p> : null}
      {state === 'failed' ? <p className="bi-hint bi-hint--error" role="alert">{t('reports.audio.error')}</p> : null}
    </div>
  );
}
