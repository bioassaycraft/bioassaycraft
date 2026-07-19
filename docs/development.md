# Development

This document is the working reference for Codex, developers, and future maintainers. The root `README.md` is the public project introduction and should not carry detailed build or deployment instructions.

Use this document together with:

- [Deployment](deployment.md)
- [Project Structure](project-structure.md)
- [Technical Direction](technical-direction.md)
- [Coding Guidelines](coding-guidelines.md)

## Runtime

Recommended Node.js version:

```bash
nvm use
```

The project `.nvmrc` pins:

```text
24.18.0
```

The `package.json` engine range is:

```text
^20.19.0 || ^22.13.0 || >=24
```

## Install

Install dependencies:

```bash
npm install
```

For CI-style installs, use:

```bash
npm ci
```

## Local Development

Run the Vite development server:

```bash
npm run dev
```

The dev server is configured with:

```text
vite --host 127.0.0.1
```

## Build

Build static deployment output:

```bash
npm run build
```

The build command runs:

```text
vite build && node scripts/copy-static-site.mjs
```

Vite builds the current Vue homepage into `dist/`. The copy script then copies the preserved static site directories into `dist/` so existing tool, simulator, learning, and journey routes continue to deploy at their current paths.

## Preview

Preview the built site:

```bash
npm run preview
```

The preview server is configured with:

```text
vite preview --host 127.0.0.1
```

## Quality Checks

Run unit tests:

```bash
npm run test
```

Run lint:

```bash
npm run lint
```

Check formatting:

```bash
npm run format
```

## Current Entry Points

- Homepage: `/`
- Tools entry: `/tools/`
- Learn entry: `/learn/`
- Journey entry: `/journey/`

Calculators, converters, and simulators use `/tools/`; learning explorers use `/learn/`. Historical route aliases are permanently redirected by the Cloudflare Worker.

Vite-managed routes:

- `/learn/anova-explorer/`
- `/tools/converter/`

These routes keep a public `index.html` entry but implement the page in `src/`. The static copy step in `scripts/copy-static-site.mjs` skips Vite-managed route folders so the bundled output is not overwritten.

The previous homepage archive has been removed from the active repository. It is not part of site navigation or the deployment build.

## Deployment

Production deploys through GitHub Actions to Cloudflare Workers static assets.

```text
Build command: npm run build
Deploy command: npx wrangler deploy
GitHub workflow: .github/workflows/deploy.yml
```

Wrangler deploys `./dist` as Worker static assets using:

```text
wrangler.jsonc
```

Required GitHub secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

See [Deployment](deployment.md) for the full deployment workflow.

## Migration Boundary

Do not perform full Vue migration, route consolidation, backend setup, database setup, account system, or scientific calculation changes unless explicitly requested.

Scientific calculations should remain in pure modules and keep existing regression behavior.

When moving static pages into Vue, keep route compatibility and scientific behavior stable unless the task explicitly says otherwise.
