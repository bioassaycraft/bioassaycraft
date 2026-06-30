# Project Structure

BioassayCraft is organized by product responsibility rather than by the current number of pages.

```text
.
├── assets/
│   ├── brand/              Brand source artwork and explorations
│   ├── css/                Shared and page-specific stylesheets
│   │   └── tools/          Tool-specific stylesheets
│   ├── icons/              Favicons, app icons, and web manifest
│   └── js/                 Shared and page-specific JavaScript
│       └── tools/          Tool-specific JavaScript
├── docs/                   Platform and brand documentation
├── learn/                  Future educational learning pages
├── lessons/                Legacy lesson placeholder
├── simulators/             Interactive simulator pages
├── tools/                  Interactive calculators, converters, and utilities
└── index.html              Homepage
```

## Conventions

- Put reusable brand and typography primitives in `assets/css/base.css`.
- Put homepage-only styles in `assets/css/home.css`.
- Put tool-specific CSS in `assets/css/tools/<tool-name>.css`.
- Put tool-specific JavaScript in `assets/js/tools/<tool-name>.js`.
- Put public icon files and the web manifest in `assets/icons/`.
- Put each interactive tool in `tools/<tool-name>/`.
- Put each simulation or simulator in `simulators/<simulator-name>/`.
- Every tool and simulator route should use the directory + `index.html` pattern, for example `tools/concentration-converter/index.html` and `simulators/anova-model-comparison/index.html`.
- Put future learning pages under `learn/`.
- Keep legacy routes as thin redirects only when an existing URL needs to remain valid.
- Keep long-form notes, brand rules, and architecture notes in `docs/`.

Avoid ambiguous filenames such as `style.css`, `styles.css`, `script.js`, or `main.js` once a file has a clear responsibility.

Design and interface decisions should follow [Website Design Guidelines](website-design-guidelines.md).
