import assert from 'node:assert/strict';
import test from 'node:test';
import { marked } from 'marked';
import katex from 'katex';
import { prepareMarkdown, renderMermaidCodeBlocks } from './markdown-syntax.ts';

test('wraps a standalone flowchart and keeps a fenced one intact', () => {
  const bare = 'flowchart LR\n    Client["클라이언트"] --> Server["서버"]';
  const prepared = prepareMarkdown(bare);
  assert.equal(prepared, `\`\`\`mermaid\n${bare}\n\`\`\``);
  assert.equal(prepareMarkdown(prepared), prepared);
  assert.match(renderMermaidCodeBlocks(marked.parse(prepared)), /<pre class="mermaid">flowchart LR/);
});

test('preserves display math for KaTeX rendering', () => {
  const formula = '$$ Q = N \\times D + N \\times D \\times H + H \\times V $$';
  const html = marked.parse(prepareMarkdown(formula));
  assert.match(html, /\$\$ Q = N \\times D/);
  assert.match(katex.renderToString('Q = N \\times D', { displayMode: true }), /class="katex-display"/);
});
