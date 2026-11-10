import { BlobReader, BlobWriter, TextWriter, ZipReader, type FileEntry } from '@zip.js/zip.js';

const MAX_ZIP_BYTES = 80 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;
const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_ENTRIES = 500;
const MAX_IMAGES = 50;
const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif|avif)$/i;
const MARKDOWN_IMAGE = /!\[([^\]\r\n]*)\]\((<[^>\r\n]+>|(?:\\.|[^()\r\n]|\([^()\r\n]*\))+)(?:\s+(?:"[^"\r\n]*"|'[^'\r\n]*'))?\)/g;
const HTML_IMAGE = /<img\b[^>]*?\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;

export class NotionZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotionZipError';
  }
}

function archivePath(value: string): string {
  const path = value.replace(/\\/g, '/');
  if (!path || path.startsWith('/') || /^[a-z]:/i.test(path) || path.includes('\0')) {
    throw new NotionZipError('ZIP 안에 올바르지 않은 파일 경로가 있습니다.');
  }
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') throw new NotionZipError('ZIP 안에 올바르지 않은 파일 경로가 있습니다.');
    parts.push(part);
  }
  return parts.join('/');
}

function linkedPath(markdownPath: string, href: string): string | null {
  let value = href.trim().replace(/^<|>$/g, '').replace(/\\([() ])/g, '$1');
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return null;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) {
    throw new NotionZipError(`지원하지 않는 이미지 주소: ${value}`);
  }
  value = value.split(/[?#]/, 1)[0];
  try { value = decodeURIComponent(value); } catch { /* Some exports contain literal percent signs. */ }
  const parts = value.startsWith('/') ? [] : markdownPath.split('/').slice(0, -1);
  for (const part of value.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) throw new NotionZipError(`ZIP 밖을 가리키는 이미지 경로: ${href}`);
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
}

function entryForPath(path: string, files: Map<string, FileEntry>): FileEntry | undefined {
  const exact = files.get(path);
  if (exact) return exact;
  const lower = path.toLocaleLowerCase();
  const caseMatches = [...files].filter(([name]) => name.toLocaleLowerCase() === lower);
  if (caseMatches.length === 1) return caseMatches[0][1];
  const basename = path.split('/').pop()?.toLocaleLowerCase();
  const nameMatches = [...files].filter(([name]) => name.split('/').pop()?.toLocaleLowerCase() === basename);
  return nameMatches.length === 1 ? nameMatches[0][1] : undefined;
}

function imageLinks(markdown: string): string[] {
  const links = [...markdown.matchAll(MARKDOWN_IMAGE)].map((match) => match[2]);
  for (const match of markdown.matchAll(HTML_IMAGE)) links.push(match[2]);
  return links;
}

function articleTitle(path: string, markdown: string): { title: string; body: string } {
  const filename = path.split('/').pop()!.replace(/\.md$/i, '')
    .replace(/\s+(?:[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i, '');
  const heading = /^\uFEFF?(?:[ \t]*\r?\n)*#\s+(.+?)\s*#*[ \t]*(?:\r?\n|$)/.exec(markdown);
  return heading
    ? { title: heading[1].trim(), body: markdown.slice(heading[0].length).replace(/^\r?\n/, '') }
    : { title: filename, body: markdown.replace(/^\uFEFF/, '') };
}

export async function openNotionZip(file: Blob) {
  if (file.size > MAX_ZIP_BYTES) throw new NotionZipError('ZIP 파일은 80MB 이하만 불러올 수 있습니다.');
  const reader = new ZipReader(new BlobReader(file), { useWebWorkers: false });
  try {
    const entries = await reader.getEntries();
    if (entries.length > MAX_ENTRIES) throw new NotionZipError('ZIP에 파일이 너무 많습니다. 글 한 개씩 내보내 주세요.');
    const files = new Map<string, FileEntry>();
    let total = 0;
    for (const entry of entries) {
      if (entry.directory) continue;
      const path = archivePath(entry.filename);
      if (files.has(path)) throw new NotionZipError(`ZIP에 같은 이름의 파일이 중복되어 있습니다: ${path}`);
      if (!Number.isSafeInteger(entry.uncompressedSize) || entry.uncompressedSize < 0) {
        throw new NotionZipError('ZIP 파일 크기를 확인할 수 없습니다.');
      }
      total += entry.uncompressedSize;
      if (total > MAX_ARCHIVE_BYTES) throw new NotionZipError('ZIP의 압축 해제 크기가 200MB를 넘습니다.');
      files.set(path, entry);
    }
    const markdownFiles = [...files.keys()].filter((path) => /\.md$/i.test(path) && !path.startsWith('__MACOSX/'));
    if (!markdownFiles.length) throw new NotionZipError('ZIP에서 Markdown(.md) 파일을 찾지 못했습니다.');
    markdownFiles.sort((a, b) => a.localeCompare(b, 'ko'));

    return {
      markdownFiles,
      close: () => reader.close(),
      async readArticle(
        path: string,
        upload: (image: Blob) => Promise<string>,
        onProgress?: (done: number, total: number) => void,
      ) {
        const markdownEntry = files.get(path);
        if (!markdownEntry || !markdownFiles.includes(path)) throw new NotionZipError('선택한 Markdown 파일을 찾지 못했습니다.');
        if (markdownEntry.uncompressedSize > MAX_MARKDOWN_BYTES) throw new NotionZipError('Markdown 파일은 2MB 이하만 불러올 수 있습니다.');
        const original = await markdownEntry.getData(new TextWriter());
        const { title, body } = articleTitle(path, original);
        const links = imageLinks(body);
        const sources = new Map<string, FileEntry>();
        const resolved = new Map<string, string>();
        for (const href of links) {
          const target = linkedPath(path, href);
          if (target === null) continue;
          const entry = entryForPath(target, files);
          if (!entry) throw new NotionZipError(`ZIP에서 이미지를 찾지 못했습니다: ${href}`);
          if (!IMAGE_EXTENSION.test(entry.filename)) throw new NotionZipError(`지원하지 않는 이미지 형식입니다: ${entry.filename}`);
          if (entry.uncompressedSize > MAX_IMAGE_BYTES) throw new NotionZipError(`10MB를 넘는 이미지가 있습니다: ${entry.filename}`);
          sources.set(entry.filename, entry);
          resolved.set(href, entry.filename);
        }
        if (sources.size > MAX_IMAGES) throw new NotionZipError('한 글에서 이미지는 50개까지 가져올 수 있습니다.');
        const uploaded = new Map<string, string>();
        let done = 0;
        for (const [filename, entry] of sources) {
          onProgress?.(done, sources.size);
          const blob = await entry.getData(new BlobWriter());
          if (blob.size > MAX_IMAGE_BYTES) throw new NotionZipError(`10MB를 넘는 이미지가 있습니다: ${filename}`);
          uploaded.set(filename, await upload(blob));
          done++;
        }
        onProgress?.(done, sources.size);
        const imageUrl = (href: string) => uploaded.get(resolved.get(href) || '');
        const markdown = body
          .replace(MARKDOWN_IMAGE, (match, alt: string, href: string) => {
            const url = imageUrl(href);
            return url ? `![${alt}](${url})` : match;
          })
          .replace(HTML_IMAGE, (match, quote: string, href: string) => {
            const url = imageUrl(href);
            return url ? match.replace(`${quote}${href}${quote}`, `${quote}${url}${quote}`) : match;
          });
        return { title, markdown, imageCount: sources.size };
      },
    };
  } catch (error) {
    await reader.close();
    throw error;
  }
}
