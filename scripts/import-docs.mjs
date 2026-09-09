import { readFile, writeFile, mkdir, rm, cp, stat, readdir } from 'node:fs/promises';
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

export function validateSource(config) {
  if (!/^[\w][\w.-]*\/[\w][\w.-]*$/.test(config.repository))
    throw new Error('Expected a GitHub repository.');
}

function within(rootDir, relative) {
  const resolved = path.resolve(rootDir, relative);
  if (!resolved.startsWith(path.resolve(rootDir) + path.sep))
    throw new Error('Source path escapes repository: ' + relative);
  return resolved;
}

export async function importDocs({ sourceDir, outputDir, publicDir, config, local = false }) {
  validateSource(config);
  if (!/^[a-f0-9]{40}$/.test(config.revision)) throw new Error('Expected a resolved commit SHA.');
  const sourceURL = 'https://github.com/' + config.repository;
  const entries = await readdir(path.join(sourceDir, 'docs'), { recursive: true, withFileTypes: true });
  const sources = entries.filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.relative(sourceDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')).sort();
  if (!sources.includes('docs/index.md'))
    throw new Error('Missing docs/index.md. Merge the docs cleanup into FluxServe main before a production build.');
  const pages = new Map(), slugs = new Set();
  const trees = new Map(), headings = new Map(), topHeadings = new Map();
  const assets = new Set(config.assets ?? []);
  for (const source of sources) {
    const tree = processor.parse(await readFile(within(sourceDir, source), 'utf8'));
    const titleHeading = tree.children.find(node => node.type === 'heading' && node.depth === 1);
    const title = titleHeading ? textOf(titleHeading) : path.posix.basename(source, '.md').replace(/[-_]/g, ' ');
    const description = textOf(tree.children.find(node => node.type === 'paragraph') ?? {}).replace(/\s+/g, ' ').slice(0, 180) || title;
    const slug = source.slice(0, -3).replace(/\/index$/, '');
    if (slugs.has(slug)) throw new Error('Duplicate documentation route: ' + slug);
    slugs.add(slug);
    const page = { source, slug, title, description };
    pages.set(source, page);
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
    let target = pathname
      ? path.posix.normalize(pathname.startsWith('/') ? pathname.slice(1) : path.posix.join(path.posix.dirname(source), decodeURIComponent(pathname)))
      : source;
    const diskPath = within(sourceDir, target);
    let info;
    try { info = await stat(diskPath); } catch { throw new Error('Missing link target in ' + source + ': ' + url); }
    if (info.isDirectory() && pages.has(path.posix.join(target, 'index.md')))
      target = path.posix.join(target, 'index.md');
    if (pages.has(target) && !image) {
      let anchor = decodeURIComponent(hash.slice(1));
      if (anchor === topHeadings.get(target)) anchor = '_top';
      if (anchor && !headings.get(target).has(anchor))
        throw new Error('Missing anchor in ' + source + ': ' + url);
      return '/' + pages.get(target).slug.split('/').map(encodeURIComponent).join('/') + '/' + query + (anchor ? '#' + anchor : '');
    }
    if (image || /\.(png|jpe?g|svg|webp|gif|avif|pdf)$/i.test(target)) {
      if (!info.isFile()) throw new Error('Asset must be a file: ' + target);
      assets.add(target);
      return '/fluxserve/' + target.split('/').map(encodeURIComponent).join('/') + query + hash;
    }
    return sourceURL + '/' + (info.isDirectory() ? 'tree' : 'blob') + '/' + config.revision + '/' +
      target.split('/').map(encodeURIComponent).join('/') + query + hash;
  }

  const rendered = [];
  for (const page of pages.values()) {
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
      editUrl: sourceURL + '/edit/' + 'main' + '/' + page.source,
    };
    const metadata = Object.entries(frontmatter).map(([key, value]) => key + ': ' + JSON.stringify(value)).join('\n');
    const provenance = local ? 'Local documentation preview' : 'Source revision';
    rendered.push({
      file: page.source,
      content: '---\n' + metadata + '\n---\n\n' + processor.stringify(tree) +
        '\n---\n\n' + provenance + ': [' + config.revision.slice(0, 7) + '](' + sourceURL + '/tree/' + config.revision + ').\n',
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

export async function fetchMain(sourceDir, repositoryURL) {
  await mkdir(sourceDir, { recursive: true });
  const git = (...args) => execFileSync('git', args, { cwd: sourceDir, stdio: 'pipe' }).toString().trim();
  git('init');
  // Fetch every time; a failed fetch must never silently reuse stale documentation.
  git('fetch', '--depth=1', repositoryURL, 'refs/heads/main');
  git('checkout', '--detach', '--force', 'FETCH_HEAD');
  git('clean', '-fd');
  return git('rev-parse', 'HEAD');
}

async function main() {
  const config = JSON.parse(await readFile(path.join(root, 'fluxserve-docs.json'), 'utf8'));
  validateSource(config);
  const local = process.argv.includes('--local');
  if (process.env.FLUXSERVE_SOURCE && !local)
    throw new Error('FLUXSERVE_SOURCE is only allowed with --local. Production fetches FluxServe main.');
  let sourceDir;
  if (local) {
    sourceDir = path.resolve(process.env.FLUXSERVE_SOURCE ?? path.join(root, '../FluxServe'));
    config.revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceDir, encoding: 'utf8' }).trim();
  } else {
    sourceDir = path.join(root, '.cache/fluxserve/main');
    config.revision = await fetchMain(sourceDir, 'https://github.com/' + config.repository + '.git');
  }

  const result = await importDocs({
    sourceDir, config, local,
    outputDir: path.join(root, 'src/content/docs'),
    publicDir: path.join(root, 'public/fluxserve'),
  });
  console.log('Imported ' + result.pages + ' pages and ' + result.assets + ' assets' + (local ? ' (local preview).' : '.'));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
