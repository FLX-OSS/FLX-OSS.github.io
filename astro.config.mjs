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
    favicon: '/fluxserve-icon.png',
    customCss: ['./src/styles/site.css'],
    credits: false,
    disable404Route: true,
    components: {
      Header: './src/components/Header.astro',
      PageTitle: './src/components/PageTitle.astro',
      Footer: './src/components/Footer.astro',
    },
    sidebar: [{ autogenerate: { directory: 'docs' } }],
  })],
});
