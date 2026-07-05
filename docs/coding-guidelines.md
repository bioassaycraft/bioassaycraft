# BioassayCraft Coding Guidelines

This document defines the engineering baseline for BioassayCraft as it grows from a static prototype site into a maintainable interactive learning platform.

Use it together with:

- [Brand Identity](brand-identity.md)
- [Content Principles](content-principles.md)
- [Development Roadmap](development-roadmap.md)
- [Design System](design-system.md)
- [Information Architecture](information-architecture.md)
- [Manifesto](manifesto.md)
- [Product Philosophy](product-philosophy.md)
- [Project Structure](project-structure.md)
- [Technical Direction](technical-direction.md)
- [Website Design Guidelines](website-design-guidelines.md)

This document is the source of truth for engineering rules, Scientific Engine separation, code organization, tests, deployment expectations, and AI modification boundaries.

## Current Project Audit

The current site is a pure static HTML/CSS/JavaScript project. That is appropriate for the current launch stage and should not be replaced by a large application stack before the content model stabilizes.

Current strengths:

- Routes already follow a clear category pattern: `tools/<name>/index.html` and `simulators/<name>/index.html`.
- Shared brand tokens exist in `assets/css/base.css`.
- Newer tools have better separation between HTML, page CSS, page JavaScript, and reusable calculation modules.
- Validation calculation logic has started moving into reusable modules under `assets/js/lib/validation/`.
- Basic calculation tests exist in `tests/`.
- The homepage remains concise and aligned with the coming-soon landing page direction.

Current problems:

- Some simulator pages are still very large single HTML files with embedded CSS and JavaScript.
- Shared page chrome styles are duplicated across page-specific stylesheets.
- Panel, metric card, chart, form, table, footer, and header patterns are repeated with small variations.
- Some interactive pages mix rendering, state handling, SVG drawing, and domain logic in large page scripts.
- There is no build tool, package metadata, lint command, formatting command, or standard local preview command.
- Deployment expectations for Cloudflare Workers static assets are documented through `wrangler.jsonc`.
- Mobile behavior is handled page by page, which creates a risk of inconsistent breakpoints and chart readability.
- `learn/` is the formal home for future interactive pharmacopoeia learning. `lessons/` exists only as a legacy placeholder and should not receive new content.
- Existing files are not yet consistently tracked and reviewed as one coherent app surface.

## Engineering Direction

Recommended long-term route:

```text
Static HTML/CSS/JS
  -> Vite + Vue
  -> Vite + Vue + D3.js for complex interactive artifacts
  -> Cloudflare Workers static asset deployment
```

Vite + Vue + D3.js is the preferred migration direction because it supports fast local iteration, componentized scientific interfaces, and custom statistical visualization while preserving static deployment.

This is a future direction, not an instruction to migrate the current static site all at once.

Do not introduce a backend until there is a concrete requirement that cannot be served by static generation and client-side computation.

Avoid:

- Backend services without a clear product need.
- Databases for content that can live in Markdown, JSON, or static files.
- Electron or desktop packaging.
- Complex state management libraries.
- Large UI frameworks or component libraries that override BioassayCraft's visual language.
- Next.js, Nuxt, or other full-stack frameworks before a clear need exists.

Acceptable future additions:

- Vite for local development and static builds.
- Vue for componentized scientific artifact pages.
- D3.js for complex custom scientific visualizations.
- TypeScript for calculation modules, chart helpers, and page component contracts.
- Plain CSS, CSS modules, or scoped Vue styles.
- Small statistical or math utilities only when hand-written approximations become a maintenance risk.
- Playwright or a small browser test layer when visual regressions become frequent.

## Scientific Architecture

BioassayCraft's core asset is not the webpage. The core asset is the Scientific Engine: the references, formulas, statistical models, pure calculation functions, and verified examples that make each interactive artifact trustworthy.

Every scientific tool should follow this data flow:

```text
Scientific References
  -> Scientific Formula / Statistical Model
  -> Pure Calculation Functions
  -> Validation & Tests
  -> Rendering Layer
  -> User Interface
```

Rules:

- Scientific formulas must not be written directly inside DOM events, button clicks, or UI callbacks.
- UI code must not own scientific calculation responsibilities.
- Every scientific calculation should first exist as a pure function.
- Rendering code should turn calculated data into visual output; it should not implement the scientific model.
- DOM code should handle input, state synchronization, event binding, and accessibility.
- A tool's scientific model should be able to run and be tested outside the browser.
- Formula changes should be treated as scientific changes, not UI refactors.

This separation is what lets BioassayCraft remain a long-term scientific learning platform rather than a set of fragile interactive pages.

## Scientific References

Every calculation module should document its scientific basis near the top of the file.

Reference sources may include:

- USP `<1032>`
- USP `<1033>`
- USP `<1034>`
- Chinese Pharmacopoeia 9401
- EP 5.3
- ICH Q2 / Q14
- Peer-reviewed publications
- Other clearly identified regulatory or statistical sources

Each calculation module should record:

- Referenced chapter, appendix, section, table, or example where possible.
- Formula or statistical model used.
- Assumptions made by the implementation.
- Scope of applicability.
- Known limitations.
- Any simplifications made for learning or design exploration.

Do not use AI-derived formulas whose source cannot be traced.

Any calculation logic should be traceable from code back to a scientific or statistical source. When an implementation intentionally differs from a source, the reason must be documented.

Suggested file header pattern:

```js
/**
 * Scientific references:
 * - USP <1033>, Appendix ..., formula ...
 * - Chinese Pharmacopoeia 9401, second public draft, formula ...
 *
 * Assumptions:
 * - ...
 *
 * Scope:
 * - ...
 *
 * Known limitations:
 * - ...
 */
```

## Versioned Scientific Models

Regulatory text, drafts, examples, and statistical practice can change. BioassayCraft should allow scientific models to coexist by version instead of overwriting older behavior.

Prefer versioned modules such as:

```text
lib/
  validation/
    usp1033_2026.ts
    cp9401_second_draft.ts
    ep53.ts
```

Rules:

- New regulatory versions should usually add new modules rather than overwrite old modules.
- Historical calculators should continue to reproduce historical results.
- Versioning belongs to the Scientific Engine, not to the UI.
- UI may expose a terminology or standard selector, but the selected option should map to an explicit scientific model.
- When a model is superseded, keep the old model available until all dependent pages are intentionally migrated.

This is especially important for validation tools, where a calculator may be used to understand a draft, a final chapter, or a historical example.

## Page Classification

Keep static:

- Homepage.
- Brand or simple directory pages.
- Future case studies and learning notes that do not need interaction.
- Pages whose only behavior is ordinary links, details/summary, or simple copy.

Do not create a top-level Articles module. Text-led learning content should live under `learn/` or a more specific future content type such as `case-studies/`.

Good candidates for shared layouts first:

- Homepage.
- Tool pages that share the same header, footer, hero, controls, panels, formulas, and chart regions.
- Simulator pages with repeated page chrome and content sections.

Good candidates for componentization:

- `tools/oos-risk-explorer/`
- `tools/validation-sample-size-calculator/`
- `tools/converter/`
- `simulators/anova-model-comparison/`
- `simulators/validation-simulator/`

Good candidates for TypeScript modules:

- OOS risk calculations.
- Validation sample size calculations.
- Concentration conversion logic.
- ANOVA and model-comparison calculations.
- Shared SVG chart helpers.
- Formatting helpers for percent, scientific values, and tabular numbers.

## File Organization Rules

Current static structure:

```text
assets/
  css/
  js/
    lib/
    tools/
docs/
learn/
journeys/
lessons/   # legacy placeholder only
simulators/
tools/
tests/
index.html
```

Rules while the site remains static:

- Use directory routes with `index.html`.
- Put tool pages under `tools/<tool-name>/index.html`.
- Put simulator pages under `simulators/<simulator-name>/index.html`.
- Treat calculators, converters, utilities, and simulators as Tools in product classification, even when a current route remains under `simulators/`. Learning explorers such as ANOVA Explorer belong under `learn/`.
- Keep `learn/` as the formal directory for interactive pharmacopoeia learning.
- Do not add new content to `lessons/`; keep it only for legacy compatibility if needed.
- Keep reusable calculations under `assets/js/lib/<domain>/`.
- Keep page orchestration scripts under `assets/js/tools/` or `assets/js/simulators/` when simulator scripts are extracted.
- Keep page-specific CSS under `assets/css/tools/` or `assets/css/simulators/` until a shared component stylesheet exists.
- Do not create vague files such as `script.js`, `main.js`, `style.css`, or `new.html`.
- Do not duplicate legacy routes unless an existing deployed URL must remain valid.
- Do not move `simulators/` pages into `tools/` only for naming purity. If routes are consolidated later, update old links, redirects, and Cloudflare Workers static asset deployment behavior deliberately.

Possible future Vite + Vue target structure:

```text
src/
  components/
    charts/
    forms/
    layout/
    panels/
  content/
    learn/
      pharmacopoeia/
      tutorials/
      case-data/
    journeys/
    tools/
    case-studies/
  layouts/
  lib/
    validation/
    statistics/
    units/
  pages/
    Home.vue
    Learn.vue
    Journeys.vue
    Tools.vue
    tools/
      concentration-converter.vue
      oos-risk-explorer.vue
      validation-sample-size-calculator.vue
    simulators/
      anova-explorer.vue
      validation-simulator.vue
public/
  assets/
```

This target is a direction, not an immediate rewrite requirement.

## Domain Module Design

Future reusable modules should be organized by scientific responsibility rather than by page.

Recommended library areas:

```text
lib/
  statistics/
  validation/
  bioassay/
  units/
  charts/
  formatting/
```

Responsibilities:

- `statistics/`: statistical distributions, quantiles, transforms, regression helpers, and general mathematical utilities.
- `validation/`: USP `<1033>`, ChP 9401, EP 5.3, OOS risk, validation sample size, accuracy, precision, and reportable-result models.
- `bioassay/`: assay-specific concepts such as potency, relative potency, dose response, parallelism, similarity, and model comparison.
- `units/`: concentration, mass, molarity, dilution, and unit conversion logic.
- `charts/`: reusable chart scaling, axes, SVG helpers, and plot data preparation.
- `formatting/`: percent, significant figures, scientific notation, tabular numbers, and display-only value formatting.

Rules:

- Keep each module's responsibility narrow.
- Do not copy scientific formulas across modules.
- If two tools need the same formula, move it to a shared scientific module.
- Do not put validation formulas in chart modules.
- Do not put UI formatting inside scientific calculation modules.
- Do not let page scripts become the only place where a scientific concept exists.

## JavaScript And TypeScript Rules

Separate responsibilities:

- Calculation modules should be pure functions.
- Page scripts should manage DOM state, event wiring, rendering, and accessibility.
- SVG or canvas chart helpers should accept data and return drawing output; they should not own scientific formulas.
- Formatting helpers should be shared when multiple pages format the same type of value.

Calculation modules:

- No DOM access.
- No implicit global state.
- No direct reads from form controls.
- No mutation of input objects unless documented.
- Use internal unrounded values; round only in display functions.
- Export named functions.
- Keep unit conventions explicit in parameter names, for example `gcvPercent` instead of `gcv`.

Page scripts:

- Keep top-level state small and serializable.
- Keep event handlers short.
- Prefer named render functions over large inline callbacks.
- Avoid writing formulas directly inside DOM handlers.
- Avoid hidden dependencies between controls and calculations.
- Preserve slider + numeric input pairs where precision matters.

TypeScript migration:

- Migrate reusable calculation modules before page DOM scripts.
- Add types for input/output objects.
- Keep browser-facing page components simple.
- Do not let framework component state replace clear domain functions.

## CSS Rules

Use `assets/css/base.css` as the source of brand tokens.

Page-specific styles may define aliases such as:

```css
--background: var(--bc-bg);
--text: var(--bc-text);
--muted: var(--bc-secondary);
--rule: var(--bc-border);
--accent: var(--bc-blue);
```

Rules:

- Do not change brand colors inside page CSS.
- Do not introduce page-specific visual systems.
- Prefer shared classes for page chrome, panels, controls, metrics, tables, and charts.
- Avoid heavy shadows, gradients, glow effects, and large decorative backgrounds.
- Keep border radius at `8px` or less unless a component has a strong reason.
- Use responsive grids with explicit breakpoints.
- Prevent horizontal overflow.
- Keep chart labels readable on mobile.

Shared CSS extraction should happen gradually. Do not extract a shared class until at least two pages use the same pattern and the pattern is stable.

## Testing Expectations

Minimum for calculation-heavy tools:

- Add or update a test file under `tests/`.
- Test known examples from source references where possible.
- Test monotonic or boundary behavior when there is inverse solving.
- Test formatting only when it affects scientific interpretation.

## Scientific Regression Tests

For calculators and simulators, code style is not the highest priority. Scientific consistency is the highest priority.

Every core calculator should include regression tests for:

- Official examples from the referenced chapter, draft, appendix, or publication.
- Independently verified cases.
- Boundary values.
- Extreme values that remain inside the intended model scope.
- Inverse calculation checks where applicable.
- Known limitations where the tool should fail clearly or return a documented result.

Regression principle:

```text
same input
  -> same scientific result
```

If the same input produces a different result after a change, the change must explain:

- Why the result changed.
- Which scientific reference or assumption changed.
- Whether the old result remains available through a versioned model.
- Which regression tests were updated or added.

Tests should prefer scientific examples and model properties over superficial UI snapshots. Visual tests are useful, but they cannot replace scientific regression tests.

Recommended commands while static:

```bash
node --check assets/js/tools/<page>.js
node --check assets/js/lib/<domain>/<module>.js
node tests/<module>.test.mjs
python3 -m http.server 4173 --bind 127.0.0.1
```

When Vite + Vue is introduced, define a single documented command set such as:

```bash
npm run dev
npm run build
npm run preview
npm run test
```

## Deployment Guidelines

Current deployment model:

- Static files are deployed through Cloudflare Workers static assets.
- Directory routes must contain `index.html`.
- Asset links should work from deployed root paths.
- Avoid server-only assumptions.

Future Vite + Vue deployment:

- Use static build output.
- Use Wrangler to deploy `./dist`.
- Add Worker script logic only if a specific feature requires server-side execution.
- Keep public assets stable so existing icon and brand URLs remain valid.

## Migration Plan

Each phase should be small, reversible, and independently deployable.

### Phase 0: Documentation And Inventory

- Keep the current static site.
- Document page types, route conventions, component patterns, and migration constraints.
- Add a basic local preview and test section to the README when ready.
- No visual changes.

### Phase 1: Static Cleanup

- Extract duplicated subpage header and footer CSS into shared static styles.
- Create `assets/css/components.css` only after confirming shared class names.
- Move simulator-specific CSS and JavaScript out of inline `<style>` and `<script>` blocks one page at a time.
- Keep every route and visible behavior unchanged.

### Phase 2: Calculation Module Hardening

- Move remaining formulas out of page scripts.
- Add pure function modules for ANOVA and validation simulator logic.
- Add tests for known examples and edge cases.
- Keep UI unchanged.

### Phase 3: Establish Vite + Vue Homepage

- Add Vite + Vue with static output.
- Keep the Vite + Vue homepage as the default root entry.
- Recreate shared layout components: `SiteHead`, `SubpageHeader`, `SiteFooter`, `ToolShell`, `Panel`, `MetricCard`.
- Continue migrating pages one at a time without breaking existing routes.

### Phase 4: Port Low-Risk Tools

- Port Concentration Converter first.
- Port OOS Risk Explorer and Validation Sample Size Calculator after their calculation modules are typed and tested.
- Preserve routes, metadata, and visual output.
- Use TypeScript for calculation modules and chart data contracts.

### Phase 5: Port Simulators

- Split large simulator files into layout, calculation, rendering, and content modules.
- Port one simulator at a time.
- Keep existing simulator behavior as the regression baseline.
- Add visual smoke tests after each port.

### Phase 6: Content Platform Growth

- Add `learn/`, `journeys/`, tutorials, case data, and case studies as static content.
- Use content collections only when metadata becomes meaningful.
- Keep homepage concise and avoid turning it into a dashboard.
- Do not introduce a traditional Articles section as a top-level product area.

## Change Control

Before a large migration:

- Confirm the target route map.
- Confirm whether old static files remain as redirects or are removed.
- Confirm Cloudflare Workers build and deploy settings.
- Confirm preview URL behavior.
- Confirm tests and smoke checks.

Do not perform a full framework migration, route rewrite, or visual redesign without explicit approval.

## AI Modification Rules

BioassayCraft treats AI as an engineering collaborator, not as a scientific decision maker.

AI tools, including Codex, must not change the following unless the prompt explicitly asks for it:

- Scientific formulas.
- Statistical models.
- Regulatory basis.
- Calculation logic.
- Scientific references.
- Historical example behavior.

AI tools may modify:

- UI.
- Layout.
- CSS.
- Accessibility.
- Rendering.
- Code structure.
- Performance.
- Documentation.
- Tests that verify existing scientific behavior.

When an AI change touches the Scientific Engine, the response or change note must state:

- The reason for the change.
- The scientific source or engineering basis.
- Whether historical results are affected.
- Whether a regression test is required or was updated.

If a request is ambiguous, preserve existing scientific behavior and limit changes to presentation, structure, or documentation. Scientific uncertainty should be surfaced rather than silently resolved in code.
