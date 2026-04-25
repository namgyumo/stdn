// GET  /api/views/:slug  → { ok: true, count }
// POST /api/views/:slug  → { ok: true, count }
// D1 바인딩(DB) 이 있을 때만 동작.
//   CREATE TABLE IF NOT EXISTS views (
//     slug TEXT PRIMARY KEY,
//     count INTEGER NOT NULL DEFAULT 0
//   );

interface Env {
  DB?: D1Database;
}

interface ViewRow {
  count: number;
}

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const resolveSlug = (raw: string): string => {
  // 항상 NFC 로 정규화 — 쓰기/읽기 모두 동일 키로 동작.
  let s = raw;
  try {
    s = decodeURIComponent(s);
  } catch {}
  return s.normalize('NFC');
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  if (!env.DB) return json({ ok: false, error: 'db_not_configured' }, 503);
  const slug = resolveSlug(String(params.slug ?? ''));
  if (!slug) return json({ ok: false, error: 'no_slug' }, 400);
  const row = await env.DB
    .prepare('SELECT count FROM views WHERE slug = ?')
    .bind(slug)
    .first<ViewRow>();
  return json({ ok: true, count: row?.count ?? 0 });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, params }) => {
  if (!env.DB) return json({ ok: false, error: 'db_not_configured' }, 503);
  const slug = resolveSlug(String(params.slug ?? ''));
  if (!slug) return json({ ok: false, error: 'no_slug' }, 400);
  await env.DB
    .prepare(
      'INSERT INTO views (slug, count) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1',
    )
    .bind(slug)
    .run();
  const row = await env.DB
    .prepare('SELECT count FROM views WHERE slug = ?')
    .bind(slug)
    .first<ViewRow>();
  return json({ ok: true, count: row?.count ?? 0 });
};
