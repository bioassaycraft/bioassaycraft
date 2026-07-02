# BioassayCraft Technical Direction

Use it together with:

- [Coding Guidelines](coding-guidelines.md)
- [Development Roadmap](development-roadmap.md)
- [Project Structure](project-structure.md)

This document is the source of truth for technology choices, the Vite + Vue + D3.js migration direction, and Cloudflare Pages deployment principles.

BioassayCraft is currently a static HTML/CSS/JavaScript site. That remains appropriate for the current stage.

Vite + Vue + D3.js infrastructure has now been introduced in parallel. This is an infrastructure step, not a full-site migration.

The long-term technical direction is:

```text
Static HTML/CSS/JS
  -> Vite + Vue
  -> Vite + Vue + D3.js for complex interactive artifacts
  -> Cloudflare Pages static deployment
```

This direction should be adopted gradually.

## Why Vite

Vite is a good fit because it provides:

- Fast local development.
- Hot module replacement.
- Simple static builds.
- A small mental model compared with heavier full-stack frameworks.
- A migration path from current static pages.

## Why Vue

Vue is a good fit because it provides:

- Clear component organization.
- Manageable learning cost.
- Good fit for form-heavy scientific interfaces.
- Easy separation of state, computed results, and rendering.
- A practical path to reusable page patterns.

Vue should organize UI, not own scientific formulas.

Scientific calculation should remain in pure modules that can be tested outside components.

## Why D3.js

D3.js is a good fit for:

- Statistical visualizations.
- Interactive simulation graphics.
- Custom axes, annotations, and scientific diagrams.
- Bioassay teaching visuals that common chart libraries cannot express cleanly.

D3 should be used for visual encoding and interaction, not as a place to hide scientific calculation logic.

## Current Stage

Do now:

- Keep static deployment working.
- Stabilize information architecture.
- Maintain clear routes.
- Extract calculation modules where useful.
- Improve docs and product language.
- Avoid breaking current tools.
- Use the Vite + Vue homepage at `/` as the default site entry.
- Keep existing tool, simulator, learn, and journey routes stable while migration continues gradually.

Do not do now:

- Full Vue migration.
- Database setup.
- Account system.
- Backend services.
- Next.js or Nuxt migration.
- Large state-management libraries.
- Heavy UI component libraries.
- Traditional Articles section.
- Route cleanup that breaks existing deployed links.
- Scientific calculation changes without clear scientific basis and regression testing.

## Future Structure Direction

Possible future structure:

```text
src/
  pages/
    Home.vue
    Learn.vue
    Journeys.vue
    Tools.vue
  components/
    SiteHeader.vue
    SiteFooter.vue
    ModuleCard.vue
    ToolCard.vue
    LearningCard.vue
    JourneyCard.vue
    ParameterPanel.vue
    ResultPanel.vue
    ExplanationBlock.vue
    CaseDataTable.vue
  lib/
    statistics/
    validation/
    bioassay/
    units/
    charts/
    formatting/
  styles/
    tokens.css
    layout.css
    components.css
  content/
    learn/
      pharmacopoeia/
      tutorials/
      case-data/
    journeys/
    tools/
    case-studies/
```

This is a direction, not an immediate migration requirement.

## Current Vite Infrastructure

Current commands:

```bash
npm install
npm run dev
npm run build
npm run preview
```

Current strategy:

- Existing static pages remain in place.
- The Vue homepage lives at `/`.
- `src/` contains early layout, card, panel, visualization, style, and domain-module folders.
- `assets/` remains at the project root so current static pages keep their existing asset references.
- `npm run build` runs Vite and then copies the existing static site directories into `dist/`.

This keeps `/`, `/learn/`, `/journeys/`, `/tools/`, and `/simulators/` available while Vue migration continues page by page.

## Cloudflare Pages

The site should continue to deploy as static files.

Any future build step should produce static output suitable for Cloudflare Pages.

Current Cloudflare Pages settings:

```text
Build command: npm run build
Output directory: dist
```

Avoid server-only features unless a later product need clearly requires them.
