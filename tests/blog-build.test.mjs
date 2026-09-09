import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, symlink, writeFile, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

test('production fixtures exclude drafts from routes, blog index, sitemap and search', {timeout: 120000}, async t => {
  await mkdir('.cache', {recursive:true});
  const dir=await mkdtemp(path.resolve('.cache/blog-test-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  for(const item of ['src','public','astro.config.mjs','tsconfig.json','package.json'])
    await cp(item,path.join(dir,item),{recursive:true});
  await symlink(path.resolve('node_modules'),path.join(dir,'node_modules'),'dir');
  const blog=path.join(dir,'src/content/blog');
  await mkdir(blog,{recursive:true});
  const post=(title,draft)=>'---\ntitle: '+title+'\ndescription: Fixture article\nauthor: Test author\ndate: 2026-01-01\ndraft: '+draft+'\n---\n\n## Example heading\n\n'+title+' searchable body.\n';
  await writeFile(path.join(blog,'published-fixture.md'),post('PublishedCanary',false));
  await writeFile(path.join(blog,'draft-fixture.md'),post('SecretDraftCanary',true));
  execFileSync(process.execPath,[path.resolve('node_modules/.bin/astro'),'build'],{cwd:dir,stdio:'pipe',timeout:100000});
  const dist=path.join(dir,'dist');
  assert.match(await readFile(path.join(dist,'blog/published-fixture/index.html'),'utf8'),/PublishedCanary/);
  await assert.rejects(readFile(path.join(dist,'blog/draft-fixture/index.html')));
  assert.doesNotMatch(await readFile(path.join(dist,'blog/index.html'),'utf8'),/SecretDraftCanary/);
  assert.doesNotMatch(await readFile(path.join(dist,'sitemap-0.xml'),'utf8'),/draft-fixture/);
  const fragments=path.join(dist,'pagefind/fragment');
  let searchable='';
  for(const name of await readdir(fragments)) {
    const bytes=await readFile(path.join(fragments,name));
    searchable+=gunzipSync(bytes).toString('utf8');
  }
  assert.match(searchable,/PublishedCanary/);
  assert.doesNotMatch(searchable,/SecretDraftCanary/);
  // Rebuild with no articles and the same cache: removed content must disappear.
  await rm(path.join(blog,'published-fixture.md'));
  await rm(path.join(blog,'draft-fixture.md'));
  execFileSync(process.execPath,[path.resolve('node_modules/.bin/astro'),'build'],{cwd:dir,stdio:'pipe',timeout:100000});
  await assert.rejects(readFile(path.join(dist,'blog/published-fixture/index.html')));
  assert.match(await readFile(path.join(dist,'blog/index.html'),'utf8'),/No posts yet/);
  assert.doesNotMatch(await readFile(path.join(dist,'sitemap-0.xml'),'utf8'),/published-fixture/);
});
