# FluxServe website

The FluxServe product website, documentation, deployment guides, and blog. Built with Astro and Starlight; published at https://flx-oss.github.io.

## Local development

Use Node.js 24 and npm 10.8.2 or newer.

```sh
npm ci
npm run dev
```

Development reads documentation directly from `src/content/docs/` in this repository.

Search indexes are built for production, so use the static preview to test search:

```sh
npm run build:local
npm run preview
```

`build:local` uses the same checked-in content and validation as the production build.

## Production build and verification

```sh
npm ci
npm run build
npm run check
npm test
npm run preview
```

Production builds use the documentation committed to this repository. They do not fetch documentation from the FluxServe repository and do not require a sibling checkout or network access beyond dependency installation.

The build validates page titles, descriptions, canonical URLs, local links, heading anchors, assets, sitemap, and search output. Tests cover import failures, URL rewriting, stale-page removal, and blog publication. Blog integration tests create an isolated temporary site and verify that draft articles appear in neither routes nor search.

Browser verification covers responsive navigation, theme selection and persistence, keyboard access, search, and code copying. GPU examples are checked against FluxServe's source definitions; website checks do not execute GPU inference.

## Updating documentation

Technical content is maintained directly in `src/content/docs/` in this repository.

1. Edit or add the Markdown under `src/content/docs/docs/`.
2. Preview changes with `npm run dev`, or use `npm run build:local` followed by `npm run preview` to verify the production output.
3. Commit the documentation changes with the website changes. A successful push to `main` deploys that committed snapshot.

The directory beneath the content root determines the public route. For example, `src/content/docs/docs/configuration.md` is published at `/docs/configuration/`. Each page supplies its title, description, sidebar metadata, and optional edit link in YAML frontmatter.

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

The canonical origin is `https://flx-oss.github.io` with no repository-name prefix. No custom domain is configured. To roll back documentation or website code, revert the relevant commit in this repository and rebuild the website.

## Structure

- `scripts/`: build validation and maintenance utilities.
- `src/pages/`: custom homepage, blog, and 404 pages.
- `src/components/`, `src/styles/`: shared navigation and FluxServe styling.
- `src/content/blog/`: authored blog Markdown.
- `src/content/docs/`: locally authored and tracked documentation Markdown.

The site is English-only and publishes one documentation revision at a time. There is no server, CMS, analytics, account system, or runtime dependency on a running FluxServe engine.
