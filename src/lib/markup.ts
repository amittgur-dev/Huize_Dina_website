// Minimal inline markup, after escaping HTML:
//   [word](url) -> <a href="url">word</a>  (inline link, styled via .inline-link in global.css)
//   *word*      -> <em>word</em>            (italics — book/podcast titles)
//   **word**    -> brightened text          (subtle emphasis without italics/bold)
// Links are matched first (distinct [] () delimiters, no overlap risk), then
// ** before * so a **bright** span isn't mistaken for two adjacent *italic* runs.
export function renderInline(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="inline-link">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<span style="color:rgba(224,219,212,0.9)">$1</span>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
