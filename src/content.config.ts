import { defineCollection } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const blogFiles = glob({ pattern: '**/*.md', base: './src/content/blog' });
// Astro's glob loader returns early for an empty directory. Clear stale entries
// so removing the last article cannot leave it published from a previous build.
const blogLoader: Loader = {
  ...blogFiles,
  async load(context) {
    context.store.clear();
    await blogFiles.load(context);
  },
};

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  blog: defineCollection({
    loader: blogLoader,
    schema: z.object({
      title: z.string(), description: z.string(), date: z.coerce.date(),
      author: z.string(), draft: z.boolean().default(false),
    }),
  }),
};
