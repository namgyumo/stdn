import { enhanceMarkdownElement } from './enhance-markdown';

const content = document.querySelector<HTMLElement>('.blog-post > .prose');
if (content) void enhanceMarkdownElement(content);
