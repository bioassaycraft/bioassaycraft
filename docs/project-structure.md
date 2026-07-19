# Project Structure

This document is the source of truth for the current directory structure, route conventions, file naming, and static-site organization.

BioassayCraft is organized by product responsibility rather than by the current number of pages.

```text
.
├── archive/                Historical pages and retired prototypes, not deployed
├── assets/
│   ├── brand/              Brand source artwork and explorations
│   ├── css/                Shared and remaining static page stylesheets
│   │   └── tools/          Tool-specific stylesheets for non-migrated static tools
│   ├── icons/              Favicons, app icons, and web manifest
│   └── js/                 Shared and remaining static page JavaScript
│       └── tools/          Tool-specific JavaScript for non-migrated static tools
├── docs/                   Platform and brand documentation
├── learn/                  Interactive pharmacopoeia learning entry and pages
├── journey/                Structured practice workflow entry and pages
├── scripts/                Build and migration helper scripts
├── src/                    Vite + Vue source for the homepage and gradual migration
├── tools/                  Interactive calculators, converters, and utilities
├── index.html              Vite entry for the default homepage
├── package.json            Vite + Vue + D3.js scripts and dependencies
└── vite.config.js          Vite configuration
```

## Conventions

- Put reusable brand and typography primitives in `assets/css/base.css`.
- Keep the default homepage at `index.html` as the Vite entry.
- Put homepage Vue implementation and gradual migration source files under `src/`.
- Put retired homepage versions under `archive/`, outside navigation and deployment copying.
- Put small build helpers under `scripts/`.
- Put static tool-specific CSS in `assets/css/tools/<tool-name>.css` only for tools that have not moved to Vue.
- Put static tool-specific JavaScript in `assets/js/tools/<tool-name>.js` only for tools that have not moved to Vue.
- Put public icon files and the web manifest in `assets/icons/`.
- Put each interactive tool in `tools/<tool-name>/`.
- Put each simulation or simulator in `tools/<simulator-name>/`.
- Product classification groups calculators, converters, and simulators under Tools. Learning explorers such as ANOVA Explorer live under `learn/`.
- Every route should use the directory + `index.html` pattern, for example `tools/converter/index.html`, `learn/anova-explorer/index.html`, `learn/index.html`, and `journey/index.html`.
- Vite-managed routes keep their public `index.html` as the Vite entry and their implementation under `src/`. Current Vite-managed routes include `/learn/anova-explorer/` and `/tools/converter/`.
- Put interactive pharmacopoeia learning pages under `learn/`.
- Put structured practice workflow pages under `journey/`.
- Keep legacy routes as thin redirects only when an existing URL needs to remain valid.
- Keep retired route directories out of the build; map historical URLs to canonical paths at the Worker edge.
- Keep long-form notes, brand rules, and architecture notes in `docs/`.
- `npm run build` outputs to `dist/`, then copies existing static routes into that build output. Vite-managed routes listed in `scripts/copy-static-site.mjs` are not overwritten by the static copy step.

Avoid ambiguous filenames such as `style.css`, `styles.css`, `script.js`, or `main.js` once a file has a clear responsibility.

Highest-level product, design, engineering, and content decisions should follow the [Manifesto](manifesto.md).

Product and platform decisions should follow [Product Philosophy](product-philosophy.md).

Information architecture should follow [Information Architecture](information-architecture.md).

Content writing and pharmacopoeial handling should follow [Content Principles](content-principles.md).

Engineering decisions should follow [Coding Guidelines](coding-guidelines.md).

Design tokens, reusable interface patterns, and future component extraction should follow [Design System](design-system.md).

Design philosophy and page-level decisions should follow [Website Design Guidelines](website-design-guidelines.md).

Technical migration decisions should follow [Technical Direction](technical-direction.md) and [Development Roadmap](development-roadmap.md).
