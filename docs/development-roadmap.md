# BioassayCraft Development Roadmap

Use it together with:

- [Information Architecture](information-architecture.md)
- [Technical Direction](technical-direction.md)
- [Coding Guidelines](coding-guidelines.md)
- [Design System](design-system.md)

This document is the source of truth for the Phase 0-5 roadmap, including what each phase should and should not do.

BioassayCraft should evolve gradually. Each phase should be small enough to review and roll back.

## Phase 0: Project Organization

Goals:

- Organize docs.
- Clarify the three core modules: Learn, Journeys, Tools.
- Classify current pages.
- Update homepage entry structure.
- Preserve current static functionality.

Do not:

- Rewrite all tools.
- Introduce a database.
- Add accounts.
- Add backend services.
- Replace the static site with a framework.
- Create a traditional Articles section.
- Move routes only for directory purity.
- Change scientific formulas without explicit scientific review.

## Phase 1: Homepage and Navigation

Goals:

- Homepage presents Learn / Journeys / Tools as the three entry points.
- Existing tools remain easy to access.
- Basic `/learn/`, `/journeys/`, and `/tools/` entry pages exist.
- Visual language remains calm, restrained, and paper-like.

Do not:

- Turn the homepage into a full portal.
- Create a complete navigation system before content volume requires it.
- Add marketing sections.

Navigation boundary:

- The homepage may show Learn / Journeys / Tools as light navigation and entry modules.
- Subpages should keep the minimal brand link plus `Back to home` header until content volume justifies full navigation.

## Phase 2: Tools Stabilization

Goals:

- Check existing tool calculation logic.
- Unify tool page structure: concept lead, interaction, result, interpretation, formula audit, scientific reference.
- Improve mobile layout and chart readability.
- Extract duplicated page chrome when the pattern stabilizes.

Priority:

1. Concentration Converter.
2. Validation Sample Size Calculator.
3. OOS Risk Explorer.
4. ANOVA Explorer.
5. Method Validation Simulator.

Do not:

- Change scientific formulas without explicit scientific reason and regression review.
- Hide assumptions behind opaque UI.

## Phase 3: First Learn Artifacts

Priority:

1. USP `<1033>` validation runs / sample size.
2. USP `<1033>` accuracy and precision acceptance criteria.
3. USP `<1034>` ANOVA and model comparison.
4. USP `<1032>` ATP and method development logic.

Minimum quality:

- One clear scientific question.
- One interactive or visual core.
- Mentor notes.
- Scientific reference and scope.
- No long copied pharmacopoeial text.

## Phase 4: First Journeys

Priority:

1. Method Validation Journey.
2. Method Development Journey.
3. Data Analysis Journey.

Minimum viable Journey:

- Step-based page.
- Inputs at each meaningful stage.
- Explanation for each decision.
- Interim output or recommendation.
- Links to supporting Learn artifacts and Tools.
- No login or saved data requirement.

## Phase 5: Vite + Vue + D3.js Migration

Goals:

- Componentize repeated page structures.
- Componentize complex visualizations.
- Improve local hot-reload development.
- Preserve static deployment through Cloudflare Workers static assets.
- Move reusable scientific code toward typed modules.

Current status:

- Infrastructure preparation has started.
- The Vite + Vue homepage is now the default entry at `/`.
- Existing static tools, simulators, learn pages, and journey pages remain available at their current routes.
- Page migration should still happen one page or component at a time.

Likely components:

- SiteHeader.
- SiteFooter.
- ModuleCard.
- ToolCard.
- LearningCard.
- JourneyCard.
- ParameterPanel.
- ResultPanel.
- ExplanationBlock.
- CaseDataTable.
- Chart components.

Do not start this phase by rewriting everything.

Begin with one reference page or one new Learn artifact.

## Not Yet

Avoid until there is a concrete product need:

- User accounts.
- Databases.
- Backend calculation services.
- Membership systems.
- Multi-user collaboration.
- Next.js / Nuxt migration.
- Large UI framework adoption.
- Top-level Articles module.
- Route consolidation that would break existing deployed links.
