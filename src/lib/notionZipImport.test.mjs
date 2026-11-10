import assert from 'node:assert/strict';
import test from 'node:test';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { openNotionZip, NotionZipError } from './notionZipImport.ts';

async function makeZip(files) {
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
  for (const [path, content] of Object.entries(files)) {
    await writer.add(path, new TextReader(content));
  }
  return writer.close();
}

test('imports a Notion Markdown page and uploads each referenced image once', async () => {
  const id = '0123456789abcdef0123456789abcdef';
  const folder = `Word meanings ${id}`;
  const zip = await makeZip({
    [`${folder}.md`]: `# Word meanings\n\nFirst ![diagram](${folder.replaceAll(' ', '%20')}/image%201.png)\n\nAgain ![diagram](${folder.replaceAll(' ', '%20')}/image%201.png)`,
    [`${folder}/image 1.png`]: 'image bytes',
  });
  const archive = await openNotionZip(zip);
  try {
    assert.deepEqual(archive.markdownFiles, [`${folder}.md`]);
    let uploaded = 0;
    const article = await archive.readArticle(archive.markdownFiles[0], async (blob) => {
      uploaded++;
      assert.equal(await blob.text(), 'image bytes');
      return '/blog-images/example.png';
    });
    assert.equal(article.title, 'Word meanings');
    assert.equal(article.imageCount, 1);
    assert.equal(uploaded, 1);
    assert.equal(article.markdown, 'First ![diagram](/blog-images/example.png)\n\nAgain ![diagram](/blog-images/example.png)');
  } finally {
    await archive.close();
  }
});

test('resolves nested paths and lets the editor select among multiple pages', async () => {
  const zip = await makeZip({
    'Root.md': '# Root\n\nHello',
    'Nested/Child.md': '# Child\n\n![photo](../photo.png)',
    'photo.png': 'photo bytes',
  });
  const archive = await openNotionZip(zip);
  try {
    assert.deepEqual(archive.markdownFiles, ['Nested/Child.md', 'Root.md']);
    const article = await archive.readArticle('Nested/Child.md', async () => '/blog-images/photo.png');
    assert.equal(article.markdown, '![photo](/blog-images/photo.png)');
  } finally {
    await archive.close();
  }
});

test('reports a missing asset before uploading anything', async () => {
  const zip = await makeZip({ 'Page.md': '# Page\n\n![lost](missing.png)' });
  const archive = await openNotionZip(zip);
  try {
    let uploads = 0;
    await assert.rejects(
      archive.readArticle('Page.md', async () => { uploads++; return '/unused.png'; }),
      (error) => error instanceof NotionZipError && error.message.includes('missing.png'),
    );
    assert.equal(uploads, 0);
  } finally {
    await archive.close();
  }
});

test('resolves Korean filenames and HTML image tags', async () => {
  const zip = await makeZip({
    '글.md': '# 컴퓨터는 단어를 어떻게 학습했을까?\n\n<img alt="그림" src="그림%201.png">',
    '그림 1.png': 'picture',
  });
  const archive = await openNotionZip(zip);
  try {
    const article = await archive.readArticle('글.md', async () => '/blog-images/korean.png');
    assert.equal(article.title, '컴퓨터는 단어를 어떻게 학습했을까?');
    assert.equal(article.markdown, '<img alt="그림" src="/blog-images/korean.png">');
  } finally {
    await archive.close();
  }
});
