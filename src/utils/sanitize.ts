import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Strips stray template variable placeholders (e.g. `{{var}}`) or raw script artifacts
 * and sanitizes HTML with DOMPurify before rendering.
 */
export function sanitizeHtml(rawHtml: string): string {
  const cleaned = rawHtml.replace(/\{\{\s*[\w.]+\s*\}\}/g, '').trim();
  return DOMPurify.sanitize(cleaned, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}

/**
 * Converts Markdown text into sanitized HTML. Optionally highlights a cited clause
 * (such as "Điều 4") with `<mark class="doc-highlight">`.
 */
export function renderSafeMarkdown(markdown: string, highlightClause?: string): string {
  const normalized = markdown.replace(/\{\{\s*[\w.]+\s*\}\}/g, '').trim();
  let html = marked.parse(normalized, { async: false }) as string;

  if (highlightClause && highlightClause.trim()) {
    const clauseToken = highlightClause.split(',')[0].trim();
    if (clauseToken.length >= 3) {
      const escaped = clauseToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      // Only highlight inside text nodes, avoiding HTML tag attributes.
      html = html.replace(/>([^<]+)</g, (_, text: string) => `>${text.replace(regex, '<mark class="doc-highlight">$1</mark>')}<`);
    }
  }

  return sanitizeHtml(html);
}

/**
 * Cleans plain text fields from template artifacts or stray HTML tags for safe card display.
 */
export function cleanDisplayText(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/\{\{\s*[\w.]+\s*\}\}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
