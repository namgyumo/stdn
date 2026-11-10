import { build } from 'esbuild';

await build({
  entryPoints: ['src/lib/dynamic-blog.ts'],
  bundle: true,
  format: 'esm',
  splitting: true,
  minify: true,
  target: ['es2022'],
  outdir: 'dist',
  entryNames: 'blog-enhance',
  chunkNames: 'blog-chunks/[name]-[hash]',
  assetNames: 'blog-assets/[name]-[hash]',
  loader: { '.woff': 'file', '.woff2': 'file', '.ttf': 'file' },
});
