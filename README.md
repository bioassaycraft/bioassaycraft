# BioassayCraft

BioassayCraft is an interactive scientific learning platform for bioassay practitioners.

The homepage is now served by the Vite + Vue implementation at `/`. Existing scientific tools, simulators, learn pages, and journey pages remain deployable at their current static routes.

## Local Development

Recommended Node.js version:

```bash
nvm use
```

The project `.nvmrc` pins Node.js `24.18.0` for long-term maintenance.

Install dependencies:

```bash
npm install
```

Run the Vite development server:

```bash
npm run dev
```

Build static deployment output:

```bash
npm run build
```

Preview the built site:

```bash
npm run preview
```

## Current Entry Points

- Homepage: `/`
- Tools entry: `/tools/`
- Learn entry: `/learn/`
- Journeys entry: `/journeys/`

Existing `tools/` and `simulators/` routes are preserved. Calculators, converters, explorers, and simulators are product-classified as Tools even when some physical routes still live under `simulators/`.

The previous homepage is archived at `archive/legacy-homepage/` for historical reference only. It is not part of site navigation or the deployment build.

## Cloudflare Pages

Recommended settings:

```text
Build command: npm run build
Output directory: dist
Root directory: /
Node.js version: 24.18.0
```

The build runs Vite for the default homepage and then copies the existing static site directories into `dist/` so current tool and learning routes continue to deploy at their existing paths.

## Migration Boundary

Do not perform full Vue migration, route consolidation, backend setup, database setup, account system, or scientific calculation changes unless explicitly requested.

Scientific calculations should remain in pure modules and keep existing regression behavior.
