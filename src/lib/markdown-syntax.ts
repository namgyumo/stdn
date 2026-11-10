const FLOWCHART_START = /^(?:flowchart|graph)\s+(?:TB|TD|BT|LR|RL)\s*$/i;
const INDENTED_LINE = /^[ \t]+\S/;

// Notion exports can contain a standalone flowchart without a Markdown fence.
export function prepareMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  const output: string[] = [];
  let fence: { marker: string; length: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (match) {
      const marker = match[1][0];
      if (!fence) fence = { marker, length: match[1].length };
      else if (fence.marker === marker && match[1].length >= fence.length) fence = null;
      output.push(line);
      continue;
    }
    if (!fence && FLOWCHART_START.test(line.trim()) && INDENTED_LINE.test(lines[i + 1] || '')) {
      output.push('```mermaid', line);
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (INDENTED_LINE.test(next)) {
          output.push(next);
          i++;
        } else if (!next.trim() && INDENTED_LINE.test(lines[i + 2] || '')) {
          output.push(next);
          i++;
        } else break;
      }
      output.push('```');
      continue;
    }
    output.push(line);
  }
  return output.join('\n');
}

export function renderMermaidCodeBlocks(html: string): string {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    '<pre class="mermaid">$1</pre>',
  );
}
