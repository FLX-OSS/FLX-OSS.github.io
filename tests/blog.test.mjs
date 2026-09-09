import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedPosts } from '../src/lib/blog.mjs';
test('blog excludes drafts, sorts dates newest first, and does not mutate its input', () => {
  const posts=[
    {id:'older',data:{date:new Date('2026-01-01'),draft:false}},
    {id:'draft-secret',data:{date:new Date('2026-03-01'),draft:true}},
    {id:'newer',data:{date:new Date('2026-02-01'),draft:false}},
  ];
  assert.deepEqual(publishedPosts(posts).map(p=>p.id),['newer','older']);
  assert.equal(posts[0].id,'older');
  assert.deepEqual(publishedPosts([]),[]);
});
