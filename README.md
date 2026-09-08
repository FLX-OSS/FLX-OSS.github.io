# FluxServe website

The FluxServe product website, documentation, deployment guides, and blog. Built with Astro and Starlight; published at https://flx-oss.github.io.

## Local development

Use Node.js 24 and npm 10.8.2 or newer.

```sh
npm ci
npm run dev
```

Development imports documentation from the sibling `../FluxServe` checkout, including uncommitted documentation edits. To use another checkout:

```sh
FLUXSERVE_SOURCE=/absolute/path/to/FluxServe npm run dev
```

Search indexes are built for production, so use the static preview to test search:

```sh
npm run build:local
npm run preview
```

`build:local` is a preview only. Do not upload its output to production.

## Production build and verification

```sh
npm ci
npm run build
npm run check
npm test
npm run preview
```

The production build fetches the exact FluxServe commit in `fluxserve-docs.json`. It does not need a sibling checkout and rejects `FLUXSERVE_SOURCE`. Generated pages, imported assets, source caches, and build outputs are ignored by Git.

The build validates page titles, descriptions, canonical URLs, local links, heading anchors, assets, sitemap, and search output. Tests cover import failures, URL rewriting, stale-page removal, and blog publication. Blog integration tests create an isolated temporary site and verify that draft articles appear in neither routes nor search.

Browser verification covers responsive navigation, theme selection and persistence, keyboard access, search, and code copying. GPU examples are checked against FluxServe's source definitions; website checks do not execute GPU inference.

## Updating documentation

Technical content belongs in **FLX-OSS/FluxServe**, not this repository.

1. Edit the Markdown in FluxServe and preview it using `npm run dev` or `npm run build:local`.
2. Commit and publish the reviewed FluxServe documentation changes.
3. Set `revision` in `fluxserve-docs.json` to the complete 40-character published commit SHA.
4. Set `editBranch` to the branch where documentation edits belong (normally `main`). The initial website uses `codex/docs-site-source` while its documentation PR awaits review; update the pin and edit branch after that PR merges.
5. Run the production checks and review the website change before merging.

Every Markdown file in FluxServe’s `docs/` folder is published automatically, preserving folders and filenames: `docs/serving/llada2.1.md` becomes `/docs/serving/llada2.1/`. An `index.md` becomes its folder’s entry page; `docs/index.md` is required. Titles come from the first level-one heading and descriptions from the first paragraph. The sidebar follows the folders. Keep internal planning notes outside `docs/`; there is no website page allowlist.

The importer rewrites links between public docs, copies referenced image/PDF assets, and points other repository-file links to the pinned GitHub revision. Missing source files, asset files, and imported-page anchors fail the build. Each imported page links to its exact source revision.

The disposable source cache is under `.cache/fluxserve/<revision>`. The importer only resets this cache; it never resets the local FluxServe checkout.

## Writing a blog post

Create `src/content/blog/your-post.md`. The filename becomes `/blog/your-post/`. Use lowercase, hyphenated filenames.

```md
---
title: Your article title
description: A concise summary.
date: 2026-09-07
author: Your name
draft: true
---

Write the article in Markdown, starting with introductory text.
Use level-two headings for sections; the layout supplies the title.
```

Set `draft: false` when ready to publish. Drafts are excluded from the blog index, routes, sitemap, and search in all builds. Published posts are ordered newest first. The public blog starts empty; no placeholder posts are shipped.

## Deployment

GitHub Pages must use **GitHub Actions** as its build source. The workflow checks pull requests without deploying and publishes successful `main` builds; it can also be started manually from Actions. It uses the built-in GitHub token, with Pages write permissions limited to the deployment job.

The canonical origin is `https://flx-oss.github.io` with no repository-name prefix. No custom domain is configured. To roll back, revert the website commit (including the documentation pin if changed) and let the normal workflow redeploy.

## Structure

- `fluxserve-docs.json`: pinned source revision, edit branch, and shared brand assets.
- `scripts/`: Markdown importer and built-site link/metadata validation.
- `src/pages/`: custom homepage, blog, and 404; all documentation, including deployment guides, is imported under `/docs/`.
- `src/components/`, `src/styles/`: shared navigation and FluxServe styling.
- `src/content/blog/`: authored blog Markdown.
- `src/content/docs/`, `public/fluxserve/`: generated and untracked.

The site is English-only and publishes one documentation revision at a time. There is no server, CMS, analytics, account system, or runtime dependency on a running FluxServe engine.
