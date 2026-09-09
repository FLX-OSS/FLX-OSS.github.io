import { getCollection, type CollectionEntry } from 'astro:content';
import type { APIRoute } from 'astro';

export async function getStaticPaths() {
  return (await getCollection('docs')).map(page => ({ params: { slug: page.id }, props: { page } }));
}

export const GET: APIRoute = ({ props }) => {
  const page = props.page as CollectionEntry<'docs'>;
  return new Response(`# ${page.data.title}\n\n${page.body ?? ''}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
