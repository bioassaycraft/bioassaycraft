# BioassayCraft Compact Mobile UI

BioassayCraft Compact Mobile UI is the mobile interaction and visual standard for Explorer and Tool pages. ANOVA Explorer is the first implementation of this standard.

## Definition

Compact Mobile UI is not a smaller desktop layout. It is a mobile product architecture for scientific tools where the most important decision, model state, and interaction stay visible while secondary explanation moves into details, accordions, Info controls, or tooltips.

It applies to:

- Explorer pages with model steps, visualizations, and statistical interpretation.
- Calculator and Tool pages that need compact input-result workspaces.
- Future mobile implementations for Sample Size, OOS Risk, Method Validation, and related modules.

## Core Principles

- Mobile is not desktop scaled down.
- Prioritize the core judgment and core interaction.
- Keep parameter controls and results as close to the same viewport as possible.
- Step navigation is fixed; content scrolls.
- Long explanations move into Info, tooltip, accordion, or detail cards.
- Chinese mode shows Chinese only; English mode shows English only.
- Preserve scientific rigor without creating a dashboard or back-office feel.
- Use compact spacing and typography before hiding important scientific state.
- Never rely on hover as the primary mobile interaction.

## Mobile Shell

Explorer pages use a three-layer sticky or fixed shell.

First layer:

- Left: model or tool selector.
- Right: language switch.
- Compact visual height.
- Width must stay stable when switching language.

Second layer:

- Primary workspace switch, such as `Model Fit` and `Decomposition`.
- Same visual height as the language switch where possible.
- The active state should be clear but quiet.

Third layer:

- Step controller.
- Previous button, current step title, next button.
- Progress dots.
- No redundant text such as `Step 3/5` when progress dots already communicate position.
- Previous and next buttons use true disabled states at the first and last step.

The shell remains fixed while the content below scrolls.

## Compact Tokens

Use these mobile-specific tokens or local aliases that map to them:

```css
--mobile-page-padding: 16px;
--mobile-card-padding: 14px;
--mobile-gap-xs: 4px;
--mobile-gap-sm: 6px;
--mobile-gap-md: 7px;
--mobile-section-gap: var(--mobile-gap-md);
--mobile-card-gap: var(--mobile-section-gap);
--mobile-card-radius: 16px;
--mobile-safe-top: max(env(safe-area-inset-top), 12px);
--mobile-control-height: 34px;
--mobile-segmented-height: 34px;
--mobile-step-height: 64px;
--mobile-header-gap: var(--mobile-section-gap);
--mobile-content-top: auto; /* measured from the fixed shell */
--mobile-chart-aspect-ratio: 16 / 9;
--mobile-slider-height: 24px;
--mobile-bar-gap: 0px;
--mobile-font-title: 16px;
--mobile-font-subtitle: 15px;
--mobile-font-body: 13px;
--mobile-font-caption: 11px;
--mobile-node-font: 12px;
--mobile-node-percent-font: 10px;
--mobile-border-light: rgba(0, 0, 0, 0.08);
--mobile-shadow-soft: 0 8px 24px rgba(0, 0, 0, 0.06);
```

Spacing scale:

- Use the page-level `--mobile-section-gap` for first-level modules.
- Main module gaps should usually be `7px` in compact Explorer pages.
- Card inner padding should usually be `12-14px`.
- Avoid ad hoc gaps such as `9px`, `10px`, or `11px`; use the mobile gap tokens.

Content offset:

- Measure the fixed shell height when the page has layered fixed controls.
- Set the content start to `fixed shell bottom + --mobile-section-gap`.
- Do not stack independent padding and margins to guess the first content offset.

## Components

Mobile implementations should use or mirror these component roles:

- `MobileShell`: fixed mobile shell and scrollable content rhythm.
- `MobileTopControls`: model/tool selector and language switch.
- `MobileSegmentedNavigation`: primary workspace switch.
- `MobileStepController`: fixed step navigation.
- `MobileModelFitPanel`: chart, existing parameter controls, model tip, and equation.
- `MobileVarianceTree`: mobile teaching SSbar visualization with fixed visual widths. The component name is retained for compatibility while the visual pattern is the mobile SSbar.
- `MobileAnovaSummary`: compact statistical conclusion.
- `MobileInfoCard`: selected item statistics and optional explanation.
- `MobileAccordion`: collapsed long-form details such as full ANOVA.

Components may own mobile-specific layout and typography, but they must share the same source data, state, calculation logic, and i18n as desktop.

## Information Hierarchy

Primary:

- Model Fit.
- Mobile teaching SSbar.
- Current step controller.

Secondary:

- Parameter controls.
- ANOVA Summary.
- Current node statistics.

Tertiary:

- Model Equation.
- Tip.
- Full ANOVA.
- Long explanatory text.

Tertiary content should not permanently occupy the first mobile viewport.

## Mobile Variance Decomposition

The mobile variance decomposition uses a teaching SSbar, not a shrunken desktop SSbar and not a true-width proportional chart.

Rules:

- Rows follow the same decomposition order as desktop.
- Each row shows the model or layer name.
- Segments show short name and true percent.
- Segment widths use a constrained proportional layout.
- Use the most complete model row as the single width baseline.
- Compute each final segment's theoretical width from real SS percentages.
- Apply a minimum readable width only when the real width is too small to read.
- Redistribute remaining width proportionally across the other segments.
- Reuse the same segment width map in every row so repeated components keep stable widths.
- Use no internal gap between segments when exact cross-row width comparison matters.
- Let the width dictionary, not CSS min-width, enforce readability so widths remain comparable.
- Numeric SS, df, MS, F, and p-value belong in the selected component card.
- A note must clarify that mobile segment widths are optimized for teaching while percentages remain computed results.
- Chinese segment labels should be short and complete, such as `非平行` and `非线性`.
- English segment labels should use compact abbreviations: `Prep`, `Reg`, `NP`, `NL`, `Res`, `LOF`, `PE`.
- Full names belong in the detail card.
- Segment labels should stay on one line.
- Prefer responsive font sizing and reduced padding over ellipsis.
- Do not show `非...`, wrapped labels, or overflowing labels.

Legacy tree rules:

- Future Explorer pages may use a tree only when the scientific structure is better represented as parent-child branching.
- If using a tree, connectors must be SVG paths, light, rounded, and non-interactive.

Deprecated:

- Do not use real SS proportions as mobile segment widths when small components become unreadable.
- Do not use desktop SSbar SVG directly on mobile.

Former tree node guidance, if a future page needs it:

- SS, df, MS, F, and p-value belong in the selected node card.

Node font sizing:

- Wide node: `14px`.
- Medium node: `13px`.
- Narrow node: `12px`.
- Very narrow or three-character Chinese node: `10-11px`.
- Percent: `9-10px`.

Connectors:

- Use SVG paths for tree connectors only.
- D3 may be used for path generation and coordinate helpers.
- Stroke should be about `1px`, light gray, and rounded.
- Recalculate after resize, language switch, model switch, and step switch.
- SVG connector layers should not capture pointer events.

## Decomposition Order

Default mobile decomposition order:

1. Mobile teaching SSbar.
2. ANOVA Summary.
3. Current node Information.
4. Full ANOVA Accordion.

The summary appears before detailed node statistics so users first see the statistical conclusion, then inspect one part of the decomposition.

## Interaction Rules

- Do not use hover as a core mobile interaction.
- Use compact text step controls on mobile; disabled states must be semantic and visible.
- Tap a segment to select it.
- Tap an ANOVA summary row or full row card to sync with the decomposition component when possible.
- Tap Info to reveal explanatory text.
- Full tables are collapsed by default.
- Avoid permanent long text in the primary viewport.
- Keep all interactive targets practically tappable even when visual chrome is compact.
- Mobile sliders should place label and current value on one line, with the slider directly below.

## Language Rules

Chinese mode:

- Chinese text only, except standard scientific abbreviations such as `SRA`, `PLA`, `4PL`, `SS`, `df`, `MS`, `F`, and `p-value`.

English mode:

- English text only.
- Use compact tree abbreviations in nodes and full names in detail views.

Never mix bilingual labels in the same mobile node or mobile control.

## Desktop Boundary

Compact Mobile UI rules apply only to the mobile breakpoint used by the page, currently `max-width: 768px` for ANOVA Explorer.

Desktop and large tablet layouts must not change when applying Compact Mobile UI.
