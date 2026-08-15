// 정적으로 생성된 태그 페이지(/blog/tags/:tag)가 없으면 D1 에서 찾아 렌더.
// D1 에만 존재하는 태그 (새로 admin 에서 만든 태그) 지원용.

interface Env {
  DB?: D1Database;
}

interface PostRow {
  slug: string;
  title: string;
  description: string | null;
  tags: string;
  published_at: string | null;
  updated_at: string;
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

function renderTagHtml(tag: string, posts: PostRow[]): string {
  const title = escapeHtml(tag);
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#080808">
  <title>#${title} · std::N</title>
  <meta name="description" content="태그 &quot;${title}&quot; 로 분류된 ${posts.length}개의 글.">
  <link rel="alternate" type="application/rss+xml" title="std::N RSS" href="/rss.xml">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/global.css">
</head>
<body>
  <header class="top">
    <div class="top-inner">
      <a href="/" aria-label="std::N 홈" class="logo-link" style="display:inline-block;margin-left:4px">
        <div class="logo"><h1>std::N</h1></div>
      </a>
      <nav aria-label="주요 메뉴">
        <ul class="nav">
          <li><a href="/about">About</a></li>
          <li><a href="/skills">Skills</a></li>
          <li><a href="/blog" aria-current="page">Blog</a></li>
          <li><a href="/projects">Projects</a></li>
          <li><a href="/bank">Solved Bank</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </div>
    <hr class="line">
  </header>

  <main id="main">
    <section class="container container-narrow" style="padding-top:60px">
      <header class="center" style="margin-bottom:40px">
        <p class="eyebrow">// tag</p>
        <h1 class="h1">#${title}</h1>
        <p style="margin-top:10px;color:var(--color-fg-dim);font-family:var(--font-mono)">
          ${posts.length}개의 글
        </p>
        <p style="margin-top:20px">
          <a href="/blog" class="btntext">← 전체 블로그로</a>
        </p>
      </header>
      <ul class="post-list">
        ${posts.map((p) => {
          const tags = safeJsonArray(p.tags);
          const when = p.published_at ?? p.updated_at;
          const desc = p.description ? `<p class="post-excerpt">${escapeHtml(p.description)}</p>` : '';
          const tagList = tags.length
            ? `<div class="post-tags">${tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>`
            : '';
          return `<li>
            <a class="post-item" href="/blog/${encodeURIComponent(p.slug)}">
              <span class="post-date">${formatKoDate(when)}</span>
              <div>
                <h2 class="post-title">${escapeHtml(p.title)}</h2>
                ${desc}
                ${tagList}
              </div>
            </a>
          </li>`;
        }).join('')}
      </ul>
    </section>
  </main>

  <footer class="site-footer">
    <div>© ${new Date().getFullYear()} std::N. All rights reserved.</div>
    <div class="footer-links" style="margin-top:10px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;font-family:var(--font-mono);font-size:.85rem">
      <a href="/rss.xml">RSS</a>
      <span aria-hidden="true">·</span>
      <a href="https://github.com/namgyumo" target="_blank" rel="noopener">GitHub</a>
      <span aria-hidden="true">·</span>
      <a href="mailto:n.gyumo13@gmail.com">Email</a>
      <span aria-hidden="true">·</span>
      <a href="/sitemap-index.xml">Sitemap</a>
    </div>
  </footer>
</body>
</html>`;
}

export const onRequest: PagesFunction<Env> = async ({ env, params, next }) => {
  // 먼저 정적 파일 시도
  const staticRes = await next();
  if (staticRes.status !== 404) return staticRes;
  if (!env.DB) return staticRes;

  const tag = String(params.tag ?? '');
  if (!tag) return staticRes;

  // D1 에서 해당 태그를 포함하는 글 찾기 (tags 컬럼은 JSON string)
  let results: PostRow[] = [];
  try {
    ({ results } = await env.DB.prepare(
      `SELECT slug, title, description, tags, published_at, updated_at
       FROM posts
       WHERE draft = 0
       ORDER BY COALESCE(published_at, updated_at) DESC
       LIMIT 500`,
    ).all<PostRow>());
  } catch {
    // posts 테이블 미생성 등 D1 오류 시 정적 결과로 fall-through
    return staticRes;
  }

  const matches = results.filter((r) => safeJsonArray(r.tags).includes(tag));
  if (matches.length === 0) return staticRes;

  return new Response(renderTagHtml(tag, matches), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=60',
    },
  });
};
