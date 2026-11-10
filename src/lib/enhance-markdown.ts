import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

let mermaidInitialized = false;

export async function enhanceMarkdownElement(root: HTMLElement, isCurrent: () => boolean = () => true) {
  renderMathInElement(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  });

  for (const code of root.querySelectorAll<HTMLElement>('pre > code.language-mermaid')) {
    const pre = code.parentElement;
    if (!pre) continue;
    pre.classList.add('mermaid');
    pre.textContent = code.textContent;
  }
  const diagrams = [...root.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')];
  if (!diagrams.length) return;

  const { default: mermaid } = await import('mermaid');
  if (!isCurrent()) return;
  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
    mermaidInitialized = true;
  }
  await mermaid.run({ nodes: diagrams.filter((node) => node.isConnected), suppressErrors: true });
}
