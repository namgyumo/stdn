interface Env {
  BLOG_IMAGES?: R2Bucket;
}

const IMAGE_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp|gif|avif)$/;

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const filename = String(params.key ?? '');
  if (!IMAGE_KEY.test(filename)) return new Response('Not found', { status: 404 });
  if (!env.BLOG_IMAGES) return new Response('Image storage unavailable', { status: 503 });

  const object = await env.BLOG_IMAGES.get(`images/${filename}`);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(object.body, { headers });
};
