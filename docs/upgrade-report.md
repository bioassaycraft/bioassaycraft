# BioassayCraft Infrastructure Upgrade Report

Date: 2026-07-03

This report records the first frontend infrastructure modernization pass after the Vue homepage became the default site entry.

## Scope

This was an infrastructure upgrade only.

It did not change:

- Page design.
- Scientific calculations.
- Tool behavior.
- Journey or artifact content.
- Static route structure.

## Technology Stack Audit

| Area | Before | After | Latest Checked | Decision | Risk |
| --- | --- | --- | --- | --- | --- |
| Node.js | 23.11.0 local | `.nvmrc` 24.18.0 | 24.18.0 LTS, 26.4.0 latest release | Recommend 24 LTS | Low |
| npm | 10.9.2 local | packageManager 11.18.0 | 11.18.0 | Use with Node 24 | Low |
| Vite | 5.4.21 | 8.1.3 | 8.1.3 | Upgraded | Medium |
| @vitejs/plugin-vue | 5.2.4 | 6.0.7 | 6.0.7 | Upgraded | Medium |
| Vue | 3.5.39 | 3.5.39 | 3.5.39 | Kept current | Low |
| D3 | 7.9.0 | 7.9.0 | 7.9.0 | Kept current | Low |
| Vue Router | not installed | not installed | 5.1.0 | Not needed now | Low |
| TypeScript | not installed | not installed | 6.0.3 | Defer | Medium |
| ESLint | not installed | 10.6.0 | 10.6.0 | Added | Low |
| @eslint/js | not installed | 10.0.1 | 10.0.1 | Added | Low |
| eslint-plugin-vue | not installed | 10.9.2 | 10.9.2 | Added | Low |
| Prettier | not installed | 3.9.4 | 3.9.4 | Added | Low |
| PostCSS | transitive only | transitive only | 8.5.16 | No direct config | Low |
| Autoprefixer | not installed | not installed | 10.5.2 | Not needed now | Low |
| Wrangler | not installed | not installed | 4.107.0 | Not needed | Low |

Latest versions were checked from the npm registry. Node.js LTS status was checked from the official Node.js website.

## Node.js Recommendation

Use Node.js `24.18.0` LTS.

The local audit machine used Node.js `23.11.0`, which is not the recommended project version. ESLint 10 and related packages require:

```text
^20.19.0 || ^22.13.0 || >=24
```

Because Node 23 is outside that support range, `npm install` on the audit machine produced `EBADENGINE` warnings. These are expected to disappear when using the `.nvmrc` version.

## Cloudflare Deployment

BioassayCraft should deploy to Cloudflare Pages.

Recommended settings:

```text
Build command: npm run build
Output directory: dist
Root directory: /
Node.js version: 24.18.0
```

Cloudflare Workers is not needed because the project currently produces static assets and has no server runtime, API handlers, KV, queues, Durable Objects, or SSR requirement.

Wrangler is not installed and should not be added unless the project later introduces Worker-specific infrastructure.

## Dependencies Upgraded

- `vite`: `^5.4.0` -> `^8.1.3`
- `@vitejs/plugin-vue`: `^5.2.0` -> `^6.0.7`

## Dependencies Added

- `@eslint/js`
- `eslint`
- `eslint-plugin-vue`
- `globals`
- `prettier`

## Dependencies Kept

- `vue`: already current at `3.5.39`.
- `d3`: already current at `7.9.0`.

D3 is currently reserved for scientific visualization work. It is not imported by the current homepage after the retired constellation prototype was removed, but it remains aligned with the planned visualization direction.

## Dependencies Not Added

- `vue-router`: not needed while the homepage is a single Vue entry and existing pages remain static routes.
- `typescript`: useful later, but adding it now would expand migration scope.
- `postcss`: already present transitively through Vite and Vue tooling.
- `autoprefixer`: not needed without a custom PostCSS pipeline.
- `wrangler`: not needed for Cloudflare Pages static deployment.

## Compatibility Fixes

- Updated Vite build input to the root homepage.
- Kept `scripts/copy-static-site.mjs` for static route preservation.
- Added `.nvmrc`.
- Added ESLint flat config.
- Added Prettier config.
- Scoped lint and format scripts to modern source, scripts, tests, and root config files.
- Removed `.DS_Store` files from active project directories.

## Removed Legacy Code

The retired homepage had already been moved to `archive/legacy-homepage/`.

This pass confirmed there are no active references to:

- `assets/css/home.css`
- `assets/js/home-reasoning-constellation.js`
- `/app/` homepage entry
- old homepage constellation code
- Wrangler configuration

## Validation

Completed successfully:

```bash
npm run lint
npm run format
npm test
npm run build
npm run dev
```

Route checks returned `200 OK` for:

- `/`
- `/learn/`
- `/journeys/`
- `/tools/`
- `/tools/oos-risk-explorer/`
- `/tools/validation-sample-size-calculator/`
- `/tools/concentration-converter/`
- `/simulators/anova-model-comparison/`
- `/simulators/validation-simulator/`

Security check:

```bash
npm audit --audit-level=moderate
```

Result:

```text
found 0 vulnerabilities
```

## Breaking Changes

No application-level breaking changes were observed.

Vite 5 -> Vite 8 is a major-version upgrade and should be treated as medium-risk infrastructure work, but the current configuration remained compatible after validation.

The main operational requirement is to use the recommended Node.js LTS version.

## Future Considerations

Consider later, not now:

- TypeScript for scientific engine modules.
- Vue Router only if the Vue app expands beyond the homepage into multiple Vue-owned routes.
- D3 extraction patterns once new scientific visualizations are added.
- Direct PostCSS/Autoprefixer only if browser support requirements demand it.
- More complete static-page linting only after old HTML/CSS pages are migrated or normalized.
