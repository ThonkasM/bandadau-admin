/**
 * Contrato del reporte (agentes-y-reportes-generativos.md): si la pregunta es concreta, la PRIMERA línea del markdown es la respuesta directa
 * («Hoy se gastaron 815 créditos en inscripciones.»); si es abierta, el markdown empieza con un título (`## …`) y no hay respuesta destacada.
 */
export function splitAnswer(markdown: string | null | undefined): { answer: string | null; rest: string } {
  if (!markdown) return { answer: null, rest: '' };
  const lines = markdown.split('\n');
  const first = (lines[0] ?? '').trim();
  if (first.length === 0 || /^(#|[-*+>|]|\d+\.|```)/.test(first)) return { answer: null, rest: markdown };
  const answer = first.replace(/[*_`]/g, '').slice(0, 500);
  return { answer, rest: lines.slice(1).join('\n').replace(/^\s+/, '') };
}
