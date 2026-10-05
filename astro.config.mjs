import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://flx-oss.github.io',
  trailingSlash: 'always',
  output: 'static',
  redirects: {
    '/docs/': '/docs/getting_started/',
    '/docs/model-recipes/': '/docs/model-recipes/llada/',
    '/docs/llada2.0-flash/': '/docs/model-recipes/llada/',
    '/docs/model-recipes/llada2.0-flash/': '/docs/model-recipes/llada/',
  },
  cacheDir: './.astro/cache',
  integrations: [starlight({
    title: 'FluxServe',
    description: 'A serving engine for diffusion language models.',
    favicon: '/new_logo.png',
    customCss: ['./src/styles/site.css', './src/styles/controls.css'],
    credits: false,
    disable404Route: true,
    components: {
      Header: './src/components/Header.astro',
      PageTitle: './src/components/PageTitle.astro',
      PageSidebar: './src/components/PageSidebar.astro',
      Footer: './src/components/Footer.astro',
    },
    sidebar: [
      { label: 'Getting Started', slug: 'docs/getting_started' },
      { label: 'Configuration', slug: 'docs/configuration' },
      {
        label: 'Model Recipes',
        items: [
          { label: 'LLaDA', slug: 'docs/model-recipes/llada' },
          { label: 'Diffusion-Gemma', slug: 'docs/model-recipes/diffusion-gemma' },
          { label: 'Nemotron-Labs-Diffusion', slug: 'docs/model-recipes/nemotron-labs-diffusion' },
        ],
      },
      { label: 'Benchmark Guide', slug: 'docs/benchmark-guide' },
    ],
  })],
});
