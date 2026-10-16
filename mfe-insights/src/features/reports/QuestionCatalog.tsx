import { type KeyboardEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { QUESTION_TOPICS, questionKeys,type QuestionTopicId } from './question-catalog';

/** Preguntas sugeridas por tema: pestañas accesibles (flechas, Inicio/Fin) y un panel con 4–6 ejemplos que rellenan la pregunta. */
export function QuestionCatalog({ onPick, disabled }: { onPick: (question: string) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const [topic, setTopic] = useState<QuestionTopicId>('users');
  const refs = useRef<Partial<Record<QuestionTopicId, HTMLButtonElement | null>>>({});

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = QUESTION_TOPICS.length - 1;
    const next = event.key === 'ArrowRight' ? (index + 1) % (last + 1) : event.key === 'ArrowLeft' ? (index + last) % (last + 1) : event.key === 'Home' ? 0 : event.key === 'End' ? last : null;
    if (next === null) return;
    event.preventDefault();
    const id = (QUESTION_TOPICS[next] as (typeof QUESTION_TOPICS)[number]).id;
    setTopic(id);
    refs.current[id]?.focus();
  };

  const active = QUESTION_TOPICS.find((x) => x.id === topic) ?? QUESTION_TOPICS[0];
  return (
    <div className="bi-catalog" data-testid="question-catalog">
      <span className="bi-chips__label" id="bi-catalog-label">
        {t('reports.form.examplesLabel')}
      </span>
      <div className="bi-tabs bi-tabs--topics" role="tablist" aria-labelledby="bi-catalog-label">
        {QUESTION_TOPICS.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            id={`bi-topic-${item.id}`}
            type="button"
            role="tab"
            className="bi-tab"
            aria-selected={topic === item.id}
            aria-controls={`bi-topic-panel-${item.id}`}
            tabIndex={topic === item.id ? 0 : -1}
            onClick={() => setTopic(item.id)}
            onKeyDown={(e) => onKey(e, index)}
          >
            {t(`reports.catalog.topics.${item.id}`)}
          </button>
        ))}
      </div>
      <div id={`bi-topic-panel-${active.id}`} role="tabpanel" aria-labelledby={`bi-topic-${active.id}`} className="bi-chips">
        {questionKeys(active).map((key) => (
          <button key={key} type="button" className="bi-chip" disabled={disabled} onClick={() => onPick(t(key))}>
            {t(key)}
          </button>
        ))}
      </div>
    </div>
  );
}
