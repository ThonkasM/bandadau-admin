import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Enlaces externos: siempre con rel seguro (el Markdown viene de un LLM: no es de confianza).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node instanceof Element && node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
  }
});

/** Markdown (LLM) → HTML sanitizado. Sin imágenes, estilos, formularios ni iframes. */
export function renderMarkdown(markdown: string): string {
  const raw = marked.parse(markdown, { async: false, gfm: true, breaks: false });
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['img', 'picture', 'source', 'style', 'iframe', 'form', 'input', 'button', 'svg', 'math', 'video', 'audio'],
    FORBID_ATTR: ['style', 'srcset'],
  });
}
