// 어드민에서 쓴 D1 기반 포스트를 /blog/:slug 에서 서빙.
// D1 에 해당 slug 없으면 next() 로 정적 MD 포스트에 fall-through.

interface Env {
  DB?: D1Database;
}

interface PostRow {
  slug: string;
  title: string;
  description: string | null;
  body_html: string;
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
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#080808">
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
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </div>
    <hr class="line">
  </header>

  <main id="main">
    <article>
      <header class="post-header">
        <h1>${title}</h1>
        <div class="post-meta">
          <time datetime="${published}">${formatKoDate(published)}</time>
          ${updated && updated !== published ? `<span>· 수정 ${formatKoDate(updated)}</span>` : ''}
        </div>
        ${tags.length ? `<div class="post-tags" style="margin-top:14px">${tags.map((t) => `<a class="tag" href="/blog/tags/${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`).join('')}</div>` : ''}
      </header>

      <div class="blog-layout">
        <div class="prose">
          ${post.body_html}
        </div>
      </div>
    </article>
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

  <script>
    // 조회수 증가 (실패해도 무시)
    fetch('/api/views/' + ${JSON.stringify(post.slug)}, { method: 'POST' }).catch(() => {});

    // 코드 블록 copy 버튼
    document.querySelectorAll('.prose pre').forEach((pre) => {
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
  for (const c of candidates) {
    row = await env.DB.prepare(
      `SELECT slug, title, description, body_html, tags,
              published_at, updated_at, created_at
       FROM posts
       WHERE slug = ? AND draft = 0
       LIMIT 1`,
    ).bind(c).first<PostRow>();
    if (row) break;
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
