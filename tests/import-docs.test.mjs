import test from 'node:test';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { importDocs, validateSource, fetchMain } from '../scripts/import-docs.mjs';

async function fixture(t, markdown = '# Intro\n\n[Other](other.md#details)\n\n![Plot](../assets/plot.png)\n\n[Code](../runtime.js)\n') {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'flux-docs-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const sourceDir = path.join(dir, 'source');
  await mkdir(path.join(sourceDir, 'docs'), { recursive: true });
  await mkdir(path.join(sourceDir, 'assets'));
  await writeFile(path.join(sourceDir, 'docs/index.md'), markdown);
  await writeFile(path.join(sourceDir, 'docs/other.md'), '# Other\n\n## Details\n\nContent\n');
  await writeFile(path.join(sourceDir, 'assets/plot.png'), 'fixture');
  await writeFile(path.join(sourceDir, 'runtime.js'), '// source');
  const config = {repository:'FLX-OSS/FluxServe', revision:'a'.repeat(40)};
  return {sourceDir,config,outputDir:path.join(dir,'out'),publicDir:path.join(dir,'public')};
}
test('rewrites docs, anchors, assets and source references; removes stale output', async t => {
  const opts = await fixture(t);
  await importDocs(opts);
  const output = await readFile(path.join(opts.outputDir,'docs/index.md'),'utf8');
  assert.match(output, /\/docs\/other\/#details/);
  assert.match(output, /\/fluxserve\/assets\/plot.png/);
  assert.match(output, new RegExp('blob/' + 'a'.repeat(40) + '/runtime.js'));
  await stat(path.join(opts.publicDir,'assets/plot.png'));
  await writeFile(path.join(opts.outputDir,'stale.md'),'old');
  await importDocs(opts);
  await assert.rejects(stat(path.join(opts.outputDir,'stale.md')));
});
test('fails on a missing source', async t => {
  const opts = await fixture(t);
  await rm(path.join(opts.sourceDir, 'docs/index.md'));
  await assert.rejects(importDocs(opts), /Missing docs\/index.md/);
});
test('fails on missing relative link targets', async t => {
  await assert.rejects(importDocs(await fixture(t,'# Intro\n\n[Missing](missing.md)')), /Missing link target/);
});
test('fails on missing anchors', async t => {
  await assert.rejects(importDocs(await fixture(t,'# Intro\n\n[Other](other.md#absent)')), /Missing anchor/);
});
test('rewrites reference links, HTML assets, and links to removed title headings', async t => {
  const opts=await fixture(t,'# Intro\n\n[Other][ref]\n\n[ref]: other.md#other\n\n<img src="../assets/plot.png" alt="Plot">');
  await importDocs(opts);
  const content=await readFile(path.join(opts.outputDir,'docs/index.md'),'utf8');
  assert.match(content,/\/docs\/other\/#_top/);
  assert.match(content,/src="\/fluxserve\/assets\/plot.png"/);
});
test('rejects escaping source paths and invalid repository names', async t => {
  const opts=await fixture(t, '# Intro\n\n[Escape](../../outside.md)');
  await assert.rejects(importDocs(opts),/escapes repository/);
  assert.throws(()=>validateSource({...opts.config,repository:'../outside'}),/GitHub repository/);
});

test('discovers nested pages, preserves filenames, and resolves folder indexes', async t => {
  const opts = await fixture(t, '# Intro\n\n[Serving](serving/)\n\n[Model](serving/custom_model.v2.md)');
  await mkdir(path.join(opts.sourceDir, 'docs/serving'));
  await writeFile(path.join(opts.sourceDir, 'docs/serving/index.md'), '# Serving\n\nServe models.');
  await writeFile(path.join(opts.sourceDir, 'docs/serving/custom_model.v2.md'), '# Custom Model\n\nModel instructions.');
  assert.equal((await importDocs(opts)).pages, 4);
  const root = await readFile(path.join(opts.outputDir, 'docs/index.md'), 'utf8');
  assert.match(root, /\/docs\/serving\//);
  assert.match(root, /\/docs\/serving\/custom_model\.v2\//);
  assert.match(await readFile(path.join(opts.outputDir, 'docs/serving/custom_model.v2.md'), 'utf8'), /title: "Custom Model"/);
  await writeFile(path.join(opts.sourceDir, 'docs/index.md'), '# Intro');
  await rm(path.join(opts.sourceDir, 'docs/serving/custom_model.v2.md'));
  await importDocs(opts);
  await assert.rejects(stat(path.join(opts.outputDir, 'docs/serving/custom_model.v2.md')));
});
test('rejects colliding page and folder routes', async t => {
  const opts = await fixture(t);
  await mkdir(path.join(opts.sourceDir, 'docs/other'));
  await writeFile(path.join(opts.sourceDir, 'docs/other/index.md'), '# Duplicate');
  await assert.rejects(importDocs(opts), /Duplicate documentation route/);
});

test('fetches new main commits even with an existing cache and fails when unavailable', async t => {
  const opts = await fixture(t);
  const git = (...args) => execFileSync('git', args, { cwd: opts.sourceDir, stdio: 'pipe' }).toString().trim();
  git('init', '-b', 'main');
  git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.com', 'commit', '-m', 'Initial');
  const cache = path.join(opts.outputDir, 'cache');
  const first = await fetchMain(cache, opts.sourceDir);
  await writeFile(path.join(opts.sourceDir, 'docs/index.md'), '# Updated');
  git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.com', 'commit', '-m', 'Update');
  const second = await fetchMain(cache, opts.sourceDir);
  assert.notEqual(second, first);
  assert.equal(second, git('rev-parse', 'HEAD'));
  assert.equal(await readFile(path.join(cache, 'docs/index.md'), 'utf8'), '# Updated');
  await assert.rejects(fetchMain(cache, path.join(opts.sourceDir, 'missing-repository')));
});
