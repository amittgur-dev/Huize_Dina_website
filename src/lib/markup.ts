// Minimal inline markup: turns *word* into <em>word</em> after escaping HTML.
// Used for the few places CMS-edited copy needs italics (book/podcast titles).
export function renderInline(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
}
