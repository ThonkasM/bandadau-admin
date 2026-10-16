import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useErrorMessage, useHost, useServices } from '../../app/services';
import { Button, StateBox } from '../../components/ui';
import type { Report } from '../../lib/types';
import { DICTATION_SHORTCUT, DictationButton } from './DictationButton';
import { useSpeechDictation } from './useSpeechDictation';

export const QUESTION_MIN = 5;
export const QUESTION_MAX = 500;
/** Segundos de la cuenta regresiva antes de enviar solo lo dictado (UC-19, flujo alterno «dictado»). */
export const DICTATION_AUTO_SEND_SECONDS = 2;
const EXAMPLE_KEYS = [
  'reports.examples.creditsToday',
  'reports.examples.lastBuyer',
  'reports.examples.topEvent',
  'reports.examples.topSpender',
  'reports.examples.newUsersToday',
  'reports.examples.lastMonth',
  'reports.examples.moderation',
] as const;

/** UC-19 pasos 1–2: pregunta en lenguaje natural → `requestReport(question, locale)` con `Idempotency-Key` por intención. */
export function RequestReportForm({ onRequested }: { onRequested: (report: Report) => void }) {
  const { t } = useTranslation();
  const { service, bridge } = useServices();
  const { locale } = useHost();
  const errorMessage = useErrorMessage();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // La clave identifica la intención (pregunta + idioma): un reintento por red la reutiliza; una pregunta nueva, no.
  const intent = useRef<{ key: string; question: string; locale: string } | null>(null);

  const trimmed = question.trim();
  const validation =
    trimmed.length > 0 && trimmed.length < QUESTION_MIN
      ? t('reports.form.tooShort', { min: QUESTION_MIN })
      : trimmed.length > QUESTION_MAX
        ? t('reports.form.tooLong', { max: QUESTION_MAX })
        : null;

  const [countdown, setCountdown] = useState<number | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dictation = useSpeechDictation({
    locale,
    onFinal: (text) => {
      setQuestion(text);
      setProblem(null);
      // Solo se envía sola una pregunta válida; si no, el usuario la completa a mano.
      setCountdown(text.length >= QUESTION_MIN && text.length <= QUESTION_MAX ? DICTATION_AUTO_SEND_SECONDS : null);
    },
  });
  const dictating = dictation.status !== 'idle';
  const showingInterim = dictating && dictation.interim !== '';

  const cancelCountdown = () => setCountdown(null);
  const editDictation = () => {
    setCountdown(null);
    textarea.current?.focus();
  };

  const send = async () => {
    if (busy || trimmed.length < QUESTION_MIN || validation) return;
    setCountdown(null);
    if (!intent.current || intent.current.question !== trimmed || intent.current.locale !== locale) {
      intent.current = { key: crypto.randomUUID(), question: trimmed, locale };
    }
    setBusy(true);
    setProblem(null);
    try {
      const report = await service.requestReport(trimmed, locale, intent.current.key);
      intent.current = null;
      setQuestion('');
      onRequested(report);
    } catch (error) {
      const message = errorMessage(error);
      setProblem(message);
      bridge.emit('bandada:toast', { kind: 'error', message });
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  // Cuenta regresiva: 2 → 1 → 0 y se envía (mismo flujo que «Pedir reporte»). Cualquier edición la cancela.
  useEffect(() => {
    if (countdown === null) return undefined;
    const timer = setTimeout(
      () => {
        if (countdown <= 0) void send();
        else setCountdown(countdown - 1);
      },
      countdown <= 0 ? 0 : 1000,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `send` se recrea en cada render; solo importa el valor de la cuenta
  }, [countdown]);

  const toggleDictation = () => {
    setCountdown(null);
    dictation.toggle();
  };

  // Atajo Alt+V (Opción+V en Mac) con el foco dentro del formulario: no interfiere con el tecleo normal.
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyV' && dictation.supported && !busy) {
      event.preventDefault();
      toggleDictation();
    }
  };

  const liveStatus = busy
    ? t('reports.dictation.status.generating')
    : dictation.status === 'listening'
      ? t('reports.dictation.status.listening')
      : dictation.status === 'transcribing'
        ? t('reports.dictation.status.transcribing')
        : countdown !== null
          ? t('reports.dictation.status.countdown')
          : '';

  return (
    <form className="bi-card bi-form" onSubmit={submit} onKeyDown={onKeyDown} aria-labelledby="bi-form-title" noValidate>
      <h2 id="bi-form-title" className="bi-card__title">
        {t('reports.form.title')}
      </h2>
      <label className="bi-label" htmlFor="bi-question">
        {t('reports.form.label')}
      </label>
      <div className="bi-form__row">
        <textarea
          id="bi-question"
          ref={textarea}
          className={`bi-input${showingInterim ? ' bi-input--interim' : ''}`}
          rows={2}
          value={showingInterim ? dictation.interim : question}
          readOnly={dictating}
          maxLength={QUESTION_MAX + 50}
          placeholder={t('reports.form.placeholder')}
          aria-invalid={validation ? true : undefined}
          aria-describedby="bi-form-hint"
          onChange={(e) => {
            setCountdown(null);
            setQuestion(e.target.value);
          }}
          onFocus={cancelCountdown}
          onPointerDown={cancelCountdown}
        />
        <DictationButton dictation={dictation} disabled={busy} />
        <Button type="submit" variant="primary" busy={busy} disabled={busy || trimmed.length < QUESTION_MIN || Boolean(validation)}>
          {busy ? t('reports.form.submitting') : t('reports.form.submit')}
        </Button>
      </div>
      <p id="bi-form-hint" className="bi-hint">
        {validation ?? t('reports.form.hint', { language: t(`reports.form.language.${locale}`) })}
      </p>
      {dictating ? (
        <p className="bi-dictation-state" data-testid="dictation-state">
          <span className="bi-dictation-dot" aria-hidden="true" />
          {dictation.status === 'listening' ? t('reports.dictation.listening') : t('reports.dictation.transcribing')}
        </p>
      ) : null}
      {countdown !== null ? (
        <div className="bi-dictation-countdown" data-testid="dictation-countdown">
          <span aria-hidden="true">{t('reports.dictation.countdown', { seconds: Math.max(countdown, 0) })}</span>
          <button type="button" className="bi-btn bi-btn--secondary bi-btn--touch" onClick={cancelCountdown}>
            {t('reports.dictation.cancel')}
          </button>
          <button type="button" className="bi-btn bi-btn--secondary bi-btn--touch" onClick={editDictation}>
            {t('reports.dictation.edit')}
          </button>
        </div>
      ) : null}
      {dictation.error ? <p className="bi-hint bi-hint--error" role="alert">{t(`reports.dictation.errors.${dictation.error}`)}</p> : null}
      <p className="bi-hint bi-dictation-note">
        {dictation.supported
          ? t('reports.dictation.privacy', { shortcut: DICTATION_SHORTCUT })
          : t(`reports.dictation.unsupported.${dictation.unsupportedReason ?? 'browser'}`)}
      </p>
      <p className="bi-sr-only" role="status" aria-live="polite" data-testid="dictation-live">
        {liveStatus}
      </p>
      <div className="bi-chips" role="group" aria-label={t('reports.form.examplesLabel')}>
        <span className="bi-chips__label">{t('reports.form.examplesLabel')}</span>
        {EXAMPLE_KEYS.map((key) => (
          <button key={key} type="button" className="bi-chip" onClick={() => {
              setCountdown(null);
              setQuestion(t(key));
            }} disabled={busy}>
            {t(key)}
          </button>
        ))}
      </div>
      {problem ? <StateBox tone="error" role="alert" body={problem} /> : null}
    </form>
  );
}
