import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://flx-oss.github.io',
  trailingSlash: 'always',
  output: 'static',
  cacheDir: './.astro/cache',
  integrations: [starlight({
    title: 'FluxServe',
    description: 'A serving engine for diffusion language models.',
    favicon: '/favicon.svg',
    customCss: ['./src/styles/site.css'],
    credits: false,
    disable404Route: true,
    components: {
      Header: './src/components/Header.astro',
      PageTitle: './src/components/PageTitle.astro',
      Footer: './src/components/Footer.astro',
    },
    sidebar: [
      { label: 'Documentation', items: [
        { label: 'Introduction', slug: 'docs' },
        { label: 'Quickstart', slug: 'docs/quickstart' },
        { label: 'Architecture', slug: 'docs/architecture' },
        { label: 'Benchmarking', slug: 'docs/benchmarking' },
      ] },
      { label: 'Deployment guides', items: [
        { label: 'Docker installation', slug: 'guides/docker' },
        { label: 'LLaDA2.0-mini · 1 GPU', slug: 'guides/llada2-mini' },
        { label: 'LLaDA2.0-flash · 4 GPUs', slug: 'guides/llada2-flash' },
        { label: 'LLaDA2.1', slug: 'guides/llada2-1' },
      ] },
    ],
  })],
});
