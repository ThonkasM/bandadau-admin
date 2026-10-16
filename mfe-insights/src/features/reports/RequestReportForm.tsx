import { type FormEvent,useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useErrorMessage, useHost, useServices } from '../../app/services';
import { Button, StateBox } from '../../components/ui';
import type { Report } from '../../lib/types';

export const QUESTION_MIN = 5;
export const QUESTION_MAX = 500;
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || trimmed.length < QUESTION_MIN || validation) return;
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

  return (
    <form className="bi-card bi-form" onSubmit={(e) => void submit(e)} aria-labelledby="bi-form-title" noValidate>
      <h2 id="bi-form-title" className="bi-card__title">
        {t('reports.form.title')}
      </h2>
      <label className="bi-label" htmlFor="bi-question">
        {t('reports.form.label')}
      </label>
      <div className="bi-form__row">
        <textarea
          id="bi-question"
          className="bi-input"
          rows={2}
          value={question}
          maxLength={QUESTION_MAX + 50}
          placeholder={t('reports.form.placeholder')}
          aria-invalid={validation ? true : undefined}
          aria-describedby="bi-form-hint"
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" variant="primary" busy={busy} disabled={busy || trimmed.length < QUESTION_MIN || Boolean(validation)}>
          {busy ? t('reports.form.submitting') : t('reports.form.submit')}
        </Button>
      </div>
      <p id="bi-form-hint" className="bi-hint">
        {validation ?? t('reports.form.hint', { language: t(`reports.form.language.${locale}`) })}
      </p>
      <div className="bi-chips" role="group" aria-label={t('reports.form.examplesLabel')}>
        <span className="bi-chips__label">{t('reports.form.examplesLabel')}</span>
        {EXAMPLE_KEYS.map((key) => (
          <button key={key} type="button" className="bi-chip" onClick={() => setQuestion(t(key))} disabled={busy}>
            {t(key)}
          </button>
        ))}
      </div>
      {problem ? <StateBox tone="error" role="alert" body={problem} /> : null}
    </form>
  );
}
