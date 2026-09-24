import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(process.argv[2] ?? 'dist');
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    files.push(...(entry.isDirectory() ? await walk(file) : [file]));
  }
  return files;
}
const files = await walk(root);
const html = new Map();
for (const file of files.filter(file => file.endsWith('.html'))) {
  html.set(file, load(await readFile(file, 'utf8')));
}
const failures = [];
for (const [file, $] of html) {
  const pathname = '/' + path.relative(root, file).replace(/index\.html$/, '');
  const isRedirect = $('meta[http-equiv="refresh"]').length > 0;
  if (!isRedirect) {
  if ($('h1').length !== 1) failures.push(pathname + ': expected one h1');
  if (!$('title').text() || !$('meta[name="description"]').attr('content'))
    failures.push(pathname + ': missing title or description');
  if (!$('link[rel="canonical"]').attr('href')?.startsWith('https://flx-oss.github.io/'))
    failures.push(pathname + ': missing canonical URL');
  }
  for (const element of $('a[href],img[src],script[src],link[rel="stylesheet"][href]').toArray()) {
    const url = $(element).attr('href') ?? $(element).attr('src');
    if (!url || /^(https?:|mailto:|tel:|data:|\/\/)/i.test(url)) continue;
    const parsed = new URL(url, 'https://flx-oss.github.io' + pathname);
    let target = path.join(root, decodeURIComponent(parsed.pathname));
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      await stat(target);
      const anchor = decodeURIComponent(parsed.hash.slice(1));
      if (anchor && html.has(target) && !html.get(target)('[id]').toArray().some(el => html.get(target)(el).attr('id') === anchor))
        failures.push(pathname + ': broken anchor ' + url);
    } catch { failures.push(pathname + ': missing target ' + url); }
  }
}
for (const required of ['pagefind/pagefind.js', 'sitemap-index.xml', '404.html']) {
  try { await stat(path.join(root, required)); } catch { failures.push('Missing ' + required); }
}
if (failures.length) throw new Error(failures.join('\n'));
console.log('Verified metadata, headings, assets, links, and anchors across ' + html.size + ' pages.');
