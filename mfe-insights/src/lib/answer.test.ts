import { describe, expect, it } from 'vitest';

import { answerMeta, splitAnswer } from './answer';

describe('splitAnswer', () => {
  it('takes the first line as the direct answer and returns the rest', () => {
    expect(splitAnswer('Hoy se gastaron 815 créditos en inscripciones.\n\n## Detalle\n\n- x')).toEqual({ answer: 'Hoy se gastaron 815 créditos en inscripciones.', rest: '## Detalle\n\n- x' });
  });
  it('strips inline markdown of the answer', () => {
    expect(splitAnswer('El último ticket lo compró **Diego Flores**.').answer).toBe('El último ticket lo compró Diego Flores.');
  });
  it.each(['## Resumen de la plataforma\n\ntexto', '- viñeta', '1. punto', '', '> cita'])('has no direct answer when the markdown starts with %j', (md) => {
    expect(splitAnswer(md).answer).toBeNull();
  });
  it('handles undefined', () => {
    expect(splitAnswer(undefined)).toEqual({ answer: null, rest: '' });
  });
});

describe('answerMeta', () => {
  const base = { createdAt: '2026-10-16T10:00:00Z', completedAt: '2026-10-16T10:00:09Z' };
  it('gives the model and the seconds between request and completion', () => {
    expect(answerMeta({ ...base, model: 'deepseek-v4.1-flash' })).toEqual({ model: 'deepseek-v4.1-flash', tags: [], seconds: 9 });
  });
  it('turns +retry and +stub-fallback into tags', () => {
    expect(answerMeta({ ...base, model: 'deepseek-v4.1-flash+retry' })?.tags).toEqual(['retry']);
    expect(answerMeta({ ...base, model: 'deepseek-v4.1-flash+stub-fallback' })?.tags).toEqual(['stubFallback']);
  });
  it('is null without a model and has no seconds while the report is not complete', () => {
    expect(answerMeta({ ...base, model: null })).toBeNull();
    expect(answerMeta({ createdAt: base.createdAt, completedAt: null, model: 'm' })?.seconds).toBeNull();
  });
});
