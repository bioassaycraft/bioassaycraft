# CI Explorer V2 Spec

## Problem Statement

The existing CI Explorer does not match the new mobile-first cognitive path for confidence intervals. The new page must teach why confidence intervals become necessary by moving from known population parameters, to unknown population parameters, to a quality decision made from finite sample data.

## Solution

Build a three-section CI Explorer with shared statistical state:

- `Intuition`: three sequential pages showing known truth, unknown truth, and quality decision with a t confidence interval.
- `Applications`: an extensible application shell with a fully interactive mean confidence interval scenario and coming-soon placeholders for unsupported CI families.
- `Questions`: question cards for advanced conceptual issues, with thinking cues but no answers.

The implementation is mobile-first. Desktop adds formula panels, tables, sensitivity views, and hover/focus linking without changing the mobile task path.

## User Stories

1. As a mobile learner, I want to see population mean, sample mean, bias, and precision on one horizontal axis, so that I can build intuition without formulas first.
2. As a learner, I want changing precision to spread points around the same sample mean, so that I can distinguish deviation from bias.
3. As a learner, I want changing accuracy to shift the group without changing residual structure, so that I can see bias separately from precision.
4. As a learner, I want the unknown-population page to hide the true parameter completely, so that I do not confuse hidden truth with observable data.
5. As a learner, I want to answer a quality-decision prompt before seeing the interval, so that the need for uncertainty is motivated.
6. As a desktop learner, I want formulas and current substitutions beside the graph, so that I can audit calculations.
7. As a quality scientist, I want the CI and specification range visually distinct from the precision envelope, so that sample spread is not confused with uncertainty in the mean.
8. As a user, I want section state in the URL, so that refresh and sharing preserve the selected module.
9. As a bilingual user, I want the existing language switch to preserve simulation state, so that translation does not reset learning progress.
10. As a keyboard user, I want handles, controls, sample marks, and disclosures to be focusable and labeled, so that the page is operable without a pointer.

## Implementation Decisions

- Use Vue for state, layout, events, accessibility, and SVG DOM ownership.
- Use D3 only for `scaleLinear` and axis tick calculation in bespoke SVG visualizations.
- Reuse `ToolTopbar`, `BcTooltip`, `useLocale`, and shared motion utilities.
- Keep all statistical calculations in `src/lib/ci/statistics.ts`.
- Implement Student t quantiles with a regularized incomplete beta CDF plus bounded inverse search, validated against reference critical values.
- Use deterministic seeded normal residuals for the six-point intuition sample.
- Preserve the same sample, residual structure, bias, spread, language, and theme while moving between intuition pages.
- Store the primary section in `?section=intuition|applications|questions`.

## Testing Decisions

- Test at the public statistics module seam, not component internals.
- Cover deterministic sampling, summary statistics, Student t critical values, confidence interval shape, invalid input defense, and decision classification helpers.
- Component behavior is validated through build/lint and accessible markup review in the Vue template.

## Out of Scope

- Full RSD CI, relative potency CI, Fieller CI, bootstrap CI, regression CI, prediction interval, tolerance interval, data export, and regulatory pass/fail automation.
- New global visual tokens, a new theme system, a new localization store, or changes to Home, Converter, or ANOVA Explorer.

## Task Checklist

1. Strengthen statistics pure functions and tests.
2. Replace the CI Explorer page with the requested mobile-first section layout.
3. Add the three intuition steps with shared simulation state.
4. Add the Page 3 decision prompt, specification band, and t CI.
5. Add desktop formula, sample table, and sensitivity panels.
6. Add the Applications shell with a complete Mean CI scenario and coming-soon cards.
7. Add the Questions cards with expandable thinking cues only.
8. Run Vitest, lint, build, and inspect bundle output.
