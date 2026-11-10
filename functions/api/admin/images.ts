import { requireAdmin, json } from '../../_lib/auth';

interface Env {
  BLOG_IMAGES?: R2Bucket;
  SESSION_SECRET?: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_CACHE = 'public, max-age=31536000, immutable';

function allowedNotionImageUrl(value: string): URL | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const notionHost = ['notion.so', 'notion.site', 'notionusercontent.com', 'notion-static.com']
    .some((domain) => host === domain || host.endsWith(`.${domain}`));
  const notionS3 = host === 'prod-files-secure.s3.us-west-2.amazonaws.com'
    || (host === 's3.us-west-2.amazonaws.com' && url.pathname.startsWith('/secure.notion-static.com/'));
  return notionHost || notionS3 ? url : null;
}

async function fetchNotionImage(value: string): Promise<ArrayBuffer | Response> {
  let url = allowedNotionImageUrl(value);
  if (!url) return json({ ok: false, error: 'unsupported_image_url' }, 400);
  for (let redirects = 0; redirects <= 3; redirects++) {
    let response: Response;
    try {
      response = await fetch(url.toString(), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    } catch {
      return json({ ok: false, error: 'image_fetch_failed' }, 502);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      try { url = location ? allowedNotionImageUrl(new URL(location, url).toString()) : null; }
      catch { url = null; }
      if (!url) return json({ ok: false, error: 'unsupported_image_url' }, 400);
      continue;
    }
    if (!response.ok || !response.body) return json({ ok: false, error: 'image_fetch_failed' }, 502);
    if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) {
      await response.body.cancel();
      return json({ ok: false, error: 'file_too_large' }, 413);
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_IMAGE_BYTES) {
          await reader.cancel();
          return json({ ok: false, error: 'file_too_large' }, 413);
        }
        chunks.push(value);
      }
    } catch {
      return json({ ok: false, error: 'image_fetch_failed' }, 502);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes.buffer;
  }
  return json({ ok: false, error: 'image_fetch_failed' }, 502);
}

function imageFormat(bytes: Uint8Array): { contentType: string; extension: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) {
    return { contentType: 'image/png', extension: 'png' };
  }
  const text = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
  if (bytes.length >= 12 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    return { contentType: 'image/webp', extension: 'webp' };
  }
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(text(0, 6))) {
    return { contentType: 'image/gif', extension: 'gif' };
  }
  if (bytes.length >= 16 && text(4, 4) === 'ftyp' && ['avif', 'avis'].includes(text(8, 4))) {
    return { contentType: 'image/avif', extension: 'avif' };
  }
  return null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await requireAdmin(request, env.SESSION_SECRET);
  if (auth instanceof Response) return auth;
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return json({ ok: false, error: 'invalid_origin' }, 403);
  }
  if (!env.BLOG_IMAGES) return json({ ok: false, error: 'storage_unavailable' }, 503);

  let body: ArrayBuffer;
  if (request.headers.get('content-type')?.startsWith('application/json')) {
    let url: unknown;
    try { url = (await request.json() as { url?: unknown }).url; } catch { return json({ ok: false, error: 'invalid_body' }, 400); }
    if (typeof url !== 'string' || url.length > 4096) return json({ ok: false, error: 'invalid_body' }, 400);
    const fetched = await fetchNotionImage(url);
    if (fetched instanceof Response) return fetched;
    body = fetched;
  } else {
    const declaredSize = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_BYTES) {
      return json({ ok: false, error: 'file_too_large' }, 413);
    }
    try { body = await request.arrayBuffer(); } catch { return json({ ok: false, error: 'invalid_body' }, 400); }
  }
  if (body.byteLength > MAX_IMAGE_BYTES) return json({ ok: false, error: 'file_too_large' }, 413);
  const format = imageFormat(new Uint8Array(body));
  if (!format) return json({ ok: false, error: 'unsupported_image' }, 415);

  const filename = `${crypto.randomUUID()}.${format.extension}`;
  try {
    await env.BLOG_IMAGES.put(`images/${filename}`, body, {
      httpMetadata: { contentType: format.contentType, cacheControl: IMAGE_CACHE },
    });
  } catch {
    return json({ ok: false, error: 'upload_failed' }, 502);
  }
  return json({ ok: true, url: `/blog-images/${filename}` }, 201);
};
