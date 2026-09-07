import { readFile, writeFile, mkdir, rm, cp, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import { load } from 'cheerio';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkStringify, { bullet: '-', fences: true });
const textOf = (node) => node.value ?? node.children?.map(textOf).join('') ?? '';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function validateManifest(manifest) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(manifest.repository) || !/^[a-f0-9]{40}$/.test(manifest.revision))
    throw new Error('Expected a GitHub repository and a full pinned commit SHA.');
  const sources = new Set(), slugs = new Set();
  for (const page of manifest.pages) {
    if (!/^(docs|guides)(\/[a-z0-9-]+)*$/.test(page.slug) || sources.has(page.source) || slugs.has(page.slug))
      throw new Error('Invalid or duplicate page in manifest: ' + page.slug);
    sources.add(page.source); slugs.add(page.slug);
  }
}

function within(rootDir, relative) {
  const resolved = path.resolve(rootDir, relative);
  if (!resolved.startsWith(path.resolve(rootDir) + path.sep))
    throw new Error('Source path escapes repository: ' + relative);
  return resolved;
}

export async function importDocs({ sourceDir, outputDir, publicDir, manifest, local = false }) {
  validateManifest(manifest);
  const sourceURL = 'https://github.com/' + manifest.repository;
  const pages = new Map(manifest.pages.map(page => [page.source, page]));
  const trees = new Map(), headings = new Map(), topHeadings = new Map();
  const assets = new Set(manifest.assets ?? []);
  for (const page of manifest.pages) {
    const tree = processor.parse(await readFile(within(sourceDir, page.source), 'utf8'));
    const first = tree.children[0];
    if (first?.type === 'heading' && first.depth === 1) {
      topHeadings.set(page.source, new GithubSlugger().slug(textOf(first)));
      tree.children.shift();
    }
    const ids = new Set(['_top']), slugger = new GithubSlugger();
    visit(tree, 'heading', node => ids.add(slugger.slug(textOf(node))));
    headings.set(page.source, ids);
    trees.set(page.source, tree);
  }

  async function rewrite(url, source, image = false) {
    if (/^(https?:|mailto:|tel:|data:|\/\/)/i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) throw new Error('Unsupported link in ' + source + ': ' + url);
    const match = url.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    if (!match) throw new Error('Invalid link: ' + url);
    const [, pathname, query = '', hash = ''] = match;
    const target = pathname
      ? path.posix.normalize(pathname.startsWith('/') ? pathname.slice(1) : path.posix.join(path.posix.dirname(source), decodeURIComponent(pathname)))
      : source;
    const diskPath = within(sourceDir, target);
    let info;
    try { info = await stat(diskPath); } catch { throw new Error('Missing link target in ' + source + ': ' + url); }
    if (pages.has(target) && !image) {
      let anchor = decodeURIComponent(hash.slice(1));
      if (anchor === topHeadings.get(target)) anchor = '_top';
      if (anchor && !headings.get(target).has(anchor))
        throw new Error('Missing anchor in ' + source + ': ' + url);
      return '/' + pages.get(target).slug + '/' + query + (anchor ? '#' + anchor : '');
    }
    if (image || /\.(png|jpe?g|svg|webp|gif|avif|pdf)$/i.test(target)) {
      if (!info.isFile()) throw new Error('Asset must be a file: ' + target);
      assets.add(target);
      return '/fluxserve/' + target.split('/').map(encodeURIComponent).join('/') + query + hash;
    }
    return sourceURL + '/' + (info.isDirectory() ? 'tree' : 'blob') + '/' + manifest.revision + '/' +
      target.split('/').map(encodeURIComponent).join('/') + query + hash;
  }

  const rendered = [];
  for (const page of manifest.pages) {
    const tree = trees.get(page.source);
    const nodes = [];
    visit(tree, node => { if (['link', 'image', 'definition', 'html'].includes(node.type)) nodes.push(node); });
    for (const node of nodes) {
      if (node.type === 'html') {
        const $ = load(node.value, {}, false);
        for (const element of $('a[href],img[src]').toArray()) {
          const attribute = element.tagName === 'img' ? 'src' : 'href';
          $(element).attr(attribute, await rewrite($(element).attr(attribute), page.source, attribute === 'src'));
        }
        node.value = $.html();
      } else node.url = await rewrite(node.url, page.source, node.type === 'image');
    }
    const frontmatter = {
      title: page.title, description: page.description,
      editUrl: sourceURL + '/edit/' + encodeURIComponent(manifest.editBranch ?? 'main') + '/' + page.source,
    };
    const metadata = Object.entries(frontmatter).map(([key, value]) => key + ': ' + JSON.stringify(value)).join('\n');
    const provenance = local ? 'Local documentation preview' : 'Source revision';
    rendered.push({
      file: page.slug + '/index.md',
      content: '---\n' + metadata + '\n---\n\n' + processor.stringify(tree) +
        '\n---\n\n' + provenance + ': [' + manifest.revision.slice(0, 7) + '](' + sourceURL + '/tree/' + manifest.revision + ').\n',
    });
  }
  // Validate everything before replacing the generated output.
  for (const asset of assets) await stat(within(sourceDir, asset));
  await rm(outputDir, { recursive: true, force: true });
  await rm(publicDir, { recursive: true, force: true });
  for (const page of rendered) {
    const dest = within(outputDir, page.file);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, page.content);
  }
  for (const asset of assets) {
    const dest = within(publicDir, asset);
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(within(sourceDir, asset), dest);
  }
  return { pages: rendered.length, assets: assets.size };
}

async function main() {
  const manifest = JSON.parse(await readFile(path.join(root, 'fluxserve-docs.json'), 'utf8'));
  validateManifest(manifest);
  const local = process.argv.includes('--local');
  if (process.env.FLUXSERVE_SOURCE && !local)
    throw new Error('FLUXSERVE_SOURCE is only allowed with --local. Production requires the pinned revision.');
  let sourceDir;
  if (local) {
    sourceDir = path.resolve(process.env.FLUXSERVE_SOURCE ?? path.join(root, '../FluxServe'));
  } else {
    sourceDir = path.join(root, '.cache/fluxserve', manifest.revision);
    await mkdir(sourceDir, { recursive: true });
    const git = (...args) => execFileSync('git', args, { cwd: sourceDir, stdio: 'pipe' });
    let current = '';
    try { current = git('rev-parse', 'HEAD').toString().trim(); } catch {}
    if (current !== manifest.revision) {
      git('init');
      git('fetch', '--depth=1', 'https://github.com/' + manifest.repository + '.git', manifest.revision);
      git('checkout', '--detach', 'FETCH_HEAD');
    }
    // Restore only this disposable cache, never the author's checkout.
    git('reset', '--hard', manifest.revision);
    git('clean', '-fd');
  }
  const result = await importDocs({
    sourceDir, manifest, local,
    outputDir: path.join(root, 'src/content/docs'),
    publicDir: path.join(root, 'public/fluxserve'),
  });
  console.log('Imported ' + result.pages + ' pages and ' + result.assets + ' assets' + (local ? ' (local preview).' : '.'));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
