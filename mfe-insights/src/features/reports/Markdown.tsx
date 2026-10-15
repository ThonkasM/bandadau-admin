import { useMemo } from 'react';

import { renderMarkdown } from '../../lib/markdown';

/** Markdown del LLM, siempre sanitizado con DOMPurify (ver `lib/markdown.ts`). */
export function Markdown({ source }: { source: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
   
  return <div className="bi-md" dangerouslySetInnerHTML={{ __html: html }} />;
}
