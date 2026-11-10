function textContent(node) {
  if (node.type === 'text') return node.value;
  return Array.isArray(node.children) ? node.children.map(textContent).join('') : '';
}

function walk(node, transform) {
  if (!Array.isArray(node.children)) return;
  node.children = node.children.map((child) => {
    const replacement = transform(child);
    walk(replacement, transform);
    return replacement;
  });
}

export function rehypeMermaid() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'pre') return node;
      const code = node.children?.find((child) => child.type === 'element' && child.tagName === 'code');
      const classes = code?.properties?.className;
      const language = node.properties?.dataLanguage ?? node.properties?.['data-language'];
      if (language !== 'mermaid' && (!Array.isArray(classes) || !classes.includes('language-mermaid'))) return node;
      return {
        type: 'element',
        tagName: 'pre',
        properties: { className: ['mermaid'] },
        children: [{ type: 'text', value: textContent(code) }],
      };
    });
  };
}

const alertLabels = {
  NOTE: '참고',
  TIP: '팁',
  IMPORTANT: '중요',
  WARNING: '주의',
  CAUTION: '경고',
};

export function rehypeAlerts() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'blockquote') return node;
      const paragraph = node.children?.find((child) => child.type === 'element' && child.tagName === 'p');
      const first = paragraph?.children?.[0];
      if (first?.type !== 'text') return node;
      const match = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*\n?|$)/.exec(first.value);
      if (!match) return node;

      first.value = first.value.slice(match[0].length);
      if (paragraph.children[1]?.type === 'element' && paragraph.children[1].tagName === 'br') {
        paragraph.children.splice(1, 1);
      }
      paragraph.children.unshift({
        type: 'element',
        tagName: 'strong',
        properties: { className: ['markdown-alert-title'] },
        children: [{ type: 'text', value: alertLabels[match[1]] }],
      });
      node.properties ??= {};
      node.properties.className = ['markdown-alert', `markdown-alert-${match[1].toLowerCase()}`];
      return node;
    });
  };
}
