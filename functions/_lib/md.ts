// 마크다운 → HTML. `marked` 를 쓰되 간단한 새니타이즈 규칙 적용.
// Workers 런타임 호환 (순수 JS).

import { marked } from 'marked';
import { prepareMarkdown, renderMermaidCodeBlocks } from '../../src/lib/markdown-syntax';

marked.use({
  gfm: true,
  breaks: false,
  async: false,
});

const SCRIPT_TAG_RE = /<script[\s\S]*?<\/script>/gi;
const ON_ATTR_RE = /\son\w+="[^"]*"/gi;
const JAVASCRIPT_URL_RE = /javascript:/gi;

export function renderMarkdown(md: string): string {
  const html = renderMermaidCodeBlocks(marked.parse(prepareMarkdown(md)) as string);
  return html
    .replace(SCRIPT_TAG_RE, '')
    .replace(ON_ATTR_RE, '')
    .replace(JAVASCRIPT_URL_RE, '');
}

// 제목 자동 슬러그 (간단 버전)
export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || `post-${Date.now().toString(36)}`;
}
