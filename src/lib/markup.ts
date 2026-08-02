// Minimal inline markup, after escaping HTML:
//   *word*   -> <em>word</em>            (italics — book/podcast titles)
//   **word** -> brightened text          (subtle emphasis without italics/bold)
// The ** case is matched first so a **bright** span isn't mistaken for two
// adjacent *italic* runs.
export function renderInline(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<span style="color:rgba(224,219,212,0.9)">$1</span>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
