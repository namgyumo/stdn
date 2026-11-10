// 어드민에서 쓴 D1 기반 포스트를 /blog/:slug 에서 서빙.
// D1 에 해당 slug 없으면 next() 로 정적 MD 포스트에 fall-through.

import { renderMarkdown } from '../_lib/md';

interface Env {
  DB?: D1Database;
}

interface PostRow {
  slug: string;
  title: string;
  description: string | null;
  body_md: string;
  tags: string;
  published_at: string | null;
  updated_at: string;
  created_at: string;
}

function safeJsonArray(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

function formatKoDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function renderPostHtml(post: PostRow, siteUrl: string): string {
  const tags = safeJsonArray(post.tags);
  const title = escapeHtml(post.title);
  const desc = post.description ? escapeHtml(post.description) : '';
  const published = post.published_at ?? post.created_at;
  const updated = post.updated_at;
  const canonical = `${siteUrl}/blog/${post.slug}`;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#fbfaf8">
  <title>${title} · std::N</title>
  ${desc ? `<meta name="description" content="${desc}">` : ''}
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="std::N">
  <meta property="og:title" content="${title}">
  ${desc ? `<meta property="og:description" content="${desc}">` : ''}
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${siteUrl}/og-default.svg">
  <meta property="og:locale" content="ko_KR">
  <meta property="article:published_time" content="${published}">
  <meta property="article:modified_time" content="${updated}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  ${desc ? `<meta name="twitter:description" content="${desc}">` : ''}
  <meta name="twitter:image" content="${siteUrl}/og-default.svg">
  <link rel="alternate" type="application/rss+xml" title="std::N RSS" href="/rss.xml">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/plain-blog.css">
  <link rel="stylesheet" href="/blog-enhance.css?v=math-mermaid-1">
</head>
<body>
  <a class="skip-link" href="#content">본문으로 건너뛰기</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="std::N 홈">std::N<span>.</span></a>
      <nav aria-label="주요 메뉴">
        <a class="current" href="/blog" aria-current="page">글</a>
        <a href="/projects">프로젝트</a>
        <a href="/about">소개</a>
        <a href="/search">검색 ↗</a>
      </nav>
    </div>
  </header>

  <main id="content" class="page-shell">
    <article class="blog-post">
      <header class="post-header">
        <p class="eyebrow">글</p>
        <h1>${title}</h1>
        ${desc ? `<p class="post-description">${desc}</p>` : ''}
        <div class="post-meta">
          <time datetime="${published}">${formatKoDate(published)}</time>
          ${updated && updated !== published ? `<span>수정 ${formatKoDate(updated)}</span>` : ''}
        </div>
        ${tags.length ? `<div class="post-tags">${tags.map((t) => `<a class="tag" href="/blog/tags/${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`).join('')}</div>` : ''}
      </header>

      <aside class="toc" aria-label="블로그 이동">
        <div class="toc-title">글</div>
        <a href="/blog">← 전체 글</a>
      </aside>
      <div class="prose">
        ${renderMarkdown(post.body_md)}
      </div>
    </article>
  </main>

  <footer class="site-footer"><div><span>© ${new Date().getFullYear()} std::N</span></div></footer>

  <script>
    // 조회수 증가 (실패해도 무시)
    fetch('/api/views/' + ${JSON.stringify(post.slug)}, { method: 'POST' }).catch(() => {});

    // 코드 블록 copy 버튼
    document.querySelectorAll('.prose pre:not(.mermaid)').forEach((pre) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-code-btn';
      btn.textContent = 'copy';
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = 'copied';
          setTimeout(() => (btn.textContent = 'copy'), 1200);
        } catch {
          btn.textContent = 'fail';
        }
      });
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
  </script>
  <script type="module" src="/blog-enhance.js?v=math-mermaid-1"></script>
</body>
</html>`;
}

export const onRequest: PagesFunction<Env> = async ({ env, params, next, request }) => {
  if (!env.DB) return next();

  // params.slug 가 못 잡히는 경우 대비해 URL 에서 직접 추출
  const url = new URL(request.url);
  const pathSlug = decodeURIComponent(
    url.pathname.replace(/^\/blog\//, '').replace(/\/$/, ''),
  );
  const rawSlug = String(params.slug ?? '') || pathSlug;
  if (!rawSlug || rawSlug === 'tags') return next();

  // 한글 등 유니코드 정규화 형태가 다를 수 있어 NFC/NFD 둘 다 시도
  const candidates = Array.from(new Set([
    rawSlug,
    rawSlug.normalize('NFC'),
    rawSlug.normalize('NFD'),
    pathSlug,
    pathSlug.normalize('NFC'),
    pathSlug.normalize('NFD'),
  ].filter(Boolean)));

  let row: PostRow | null = null;
  try {
    for (const c of candidates) {
      row = await env.DB.prepare(
        `SELECT slug, title, description, body_md, tags,
                published_at, updated_at, created_at
         FROM posts
         WHERE slug = ? AND draft = 0
         LIMIT 1`,
      ).bind(c).first<PostRow>();
      if (row) break;
    }
  } catch {
    // posts 테이블 미생성 등 D1 오류 시 정적 MD 포스트로 fall-through
    return next();
  }

  if (!row) return next();

  const siteUrl = `${url.protocol}//${url.host}`;

  return new Response(renderPostHtml(row, siteUrl), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=60',
    },
  });
};
