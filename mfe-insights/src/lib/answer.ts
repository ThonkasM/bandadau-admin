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

/** Quién redactó y cuánto tardó: `deepseek-v4.1-flash+retry` → modelo + etiquetas; el tiempo sale de createdAt → completedAt. */
export function answerMeta(report: { model?: string | null; createdAt: string; completedAt: string | null }): { model: string; tags: ('retry' | 'stubFallback')[]; seconds: number | null } | null {
  if (!report.model) return null;
  const [model = '', ...rest] = report.model.split('+');
  const tags = rest.flatMap((t) => (t === 'retry' ? ['retry' as const] : t === 'stub-fallback' ? ['stubFallback' as const] : []));
  const ms = report.completedAt ? Date.parse(report.completedAt) - Date.parse(report.createdAt) : NaN;
  return { model, tags, seconds: Number.isFinite(ms) && ms >= 0 ? Math.max(1, Math.round(ms / 1000)) : null };
}
