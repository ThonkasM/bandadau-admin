import { describe, expect, it } from 'vitest';

import { splitAnswer } from './answer';

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
