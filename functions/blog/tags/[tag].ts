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
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#fbfaf8">
  <title>#${title} · std::N</title>
  <meta name="description" content="태그 &quot;${title}&quot; 로 분류된 ${posts.length}개의 글.">
  <link rel="alternate" type="application/rss+xml" title="std::N RSS" href="/rss.xml">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/plain-blog.css">
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
    <div class="tag-page">
      <section class="intro" aria-labelledby="tag-title">
        <p class="eyebrow">태그</p>
        <h1 id="tag-title">#${title}<span>.</span></h1>
        <p><a href="/blog">← 전체 글</a></p>
      </section>
      <div class="content-grid">
        <aside class="sidebar" aria-label="태그 안내"><div><h2>글</h2><p><a href="/blog">전체 글 보기</a></p></div></aside>
        <section class="writing" aria-labelledby="tag-writing-title">
          <div class="section-heading"><h2 id="tag-writing-title">#${title}</h2><span>${String(posts.length).padStart(2, '0')}개의 글</span></div>
          <ol class="post-list">
        ${posts.map((p) => {
          const tags = safeJsonArray(p.tags);
          const when = p.published_at ?? p.updated_at;
          const desc = p.description ? `<p>${escapeHtml(p.description)}</p>` : '';
          return `<li>
            <a class="post" href="/blog/${encodeURIComponent(p.slug)}">
              <div class="meta"><time datetime="${when}">${formatKoDate(when)}</time><span>${escapeHtml(tags[0] ?? '기록')}</span></div>
              <h3>${escapeHtml(p.title)}<span class="arrow" aria-hidden="true">↗</span></h3>
              ${desc}
            </a>
          </li>`;
        }).join('')}
          </ol>
        </section>
      </div>
    </div>
  </main>

  <footer class="site-footer"><div><span>© ${new Date().getFullYear()} std::N</span></div></footer>
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
