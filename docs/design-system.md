# BioassayCraft Design System

This document turns the broader visual philosophy into reusable interface rules for current static pages and future Vite + Vue components.

Use it together with:

- [Brand Identity](brand-identity.md)
- [Content Principles](content-principles.md)
- [Coding Guidelines](coding-guidelines.md)
- [Design DNA](design-dna.md)
- [Information Architecture](information-architecture.md)
- [Manifesto](manifesto.md)
- [Product Philosophy](product-philosophy.md)
- [Project Structure](project-structure.md)
- [Website Design Guidelines](website-design-guidelines.md)

This document is the source of truth for visual style, interaction rhythm, page layout, reusable interface patterns, mobile behavior, and accessibility expectations.

## Design System Goal

BioassayCraft should feel like one coherent scientific learning platform as the number of tools, simulators, explorers, tutorials, journeys, and case studies grows.

The design system must preserve:

- Minimal visual language.
- Calm scientific tone.
- Low information density.
- Strong typography and spacing hierarchy.
- Quiet panels and controls.
- BioassayCraft brand colors, logo, favicon, and typography.

Do not redesign the site for each new page.

## Visual Temperament

BioassayCraft should feel like a carefully edited scientific notebook: calm, restrained, warm, precise, and quietly cared for.

Design keywords:

- Calm
- Restrained
- Warm precision
- Scientific notebook
- Gentle guidance
- Intellectual care
- Crafted, not manufactured

Rules:

- Prefer paper-like warmth over screen-like coldness.
- Use whitespace as structure, not empty decoration.
- Avoid visual pressure: no dense panels, aggressive contrast, oversized cards, loud colors, or excessive motion.
- Let users slow down and think.
- Important explanations should feel like mentor notes, not system alerts.
- Complexity should unfold progressively through details, steps, tabs, guided panels, or small focused sections.
- Do not use cuteness, playfulness, biotech clichés, or startup-style visual excitement to create warmth.
- Do not use decorative East Asian motifs such as ink wash, bamboo, landscapes, seals, or ornamental cultural references.
- Warmth should come from spacing, wording, hierarchy, and careful interaction.
- Warmth must not reduce scientific seriousness or professional clarity.

Before shipping a page, ask:

```text
Does this page make the user feel guided, respected,
and less alone in understanding a difficult bioassay concept?
```

If the answer is no, review the information hierarchy, explanation style, and interaction rhythm even when the feature works correctly.

## Reading Rhythm

BioassayCraft pages should be read comfortably rather than scanned quickly.

Avoid building pages as uninterrupted sequences of panels or controls.

Instead, create a natural reading rhythm through:

- Whitespace.
- Explanation.
- Interaction.
- Visualization.
- Reflection.

Scientific interfaces should give users moments to pause and think.

Reading rhythm is as important as visual hierarchy.

The interface should never feel rushed.

A page should feel less like software and more like a carefully annotated notebook.

## Scientific Consistency

BioassayCraft's design goal is not visual novelty. The design goal is to make scientific thinking consistent, predictable, auditable, and explainable.

Priorities:

- Scientific consistency.
- Predictability.
- Auditability.
- Explainability.
- Calm interaction.
- Long-term maintainability.

When adding a new page, prefer consistency with existing tools over a new visual idea.

Rules:

- Users should not need to relearn the interaction model for every tool.
- Similar tools should share similar layout logic.
- Similar results should appear in similar places.
- Similar formulas should be exposed with similar disclosure patterns.
- Regulatory notes should support the calculation, not dominate the page.
- A page should feel like another BioassayCraft artifact, not a standalone demo.

## Core Tokens

The source of truth is `assets/css/base.css`.

Current tokens:

```css
--bc-black: #171717;
--bc-blue: #2457B3;
--bc-blue-hover: #1E4B9C;
--bc-logo-light: #F2F0EA;
--bc-logo-dark: #4B5D6B;
--bc-bg: #FFFFFF;
--bc-bg-section: #F6F8FA;
--bc-text: #171717;
--bc-secondary: #6E7278;
--bc-border: #D0D7DE;
--bc-blue-soft: rgba(36, 86, 179, 0.08);
--bc-blue-border: rgba(36, 86, 179, 0.32);
--bc-focus-ring: rgba(36, 86, 179, 0.16);
```

Rules:

- Use `--bc-bg` for the page background and `--bc-bg-section` only for large, low-emphasis content groupings.
- Use `--bc-text` for primary text.
- Use `--bc-secondary` for helper text, labels, captions, and metadata.
- Use `--bc-border` for structural lines.
- Use `--bc-blue` for links, active states, primary values, and scientific highlight.
- Use `--bc-blue-soft` for selected backgrounds.
- Use `--bc-focus-ring` for focus outlines.
- Do not add a new brand color without updating this document and `base.css`.

Tool and simulator pages may define local aliases for readability, but those aliases must point back to `--bc-*` tokens.

## Typography

Fonts:

- Sans: `Inter`
- Mono: `IBM Plex Mono`

Rules:

- Use `Inter` for headings, body copy, labels, and interface text.
- Use `IBM Plex Mono` for numbers, formulas, code-like values, units, and tabular scientific output.
- Keep letter spacing at `0` except for small uppercase metadata labels.
- Use tabular numerals for aligned values.
- Do not use viewport-width-only font scaling.
- Keep section headings compact inside tools and panels.

Recommended hierarchy:

- Homepage title: brand-scale, restrained.
- Tool or simulator title: clear page title, no marketing phrasing.
- Section heading: functional, short, usually `0.9rem` to `1rem`.
- Body/help text: secondary color, readable line height.
- Numeric result: mono, larger than labels, aligned with related values.

## Layout

Global page rules:

- Use explicit content width, usually `width: min(var(--max-width), calc(100% - var(--bc-container-inline)))`.
- Keep page background consistent.
- Avoid horizontal overflow.
- Use grids for tool and simulator workspaces.
- Use compact but readable spacing.
- Avoid decorative layout elements that do not explain or structure content.

Homepage rules:

- The homepage is a scientific prologue, not a dashboard, marketing site, or tool catalog.
- Let users enter through a scientific question before seeing practice paths or artifacts.
- Use a small number of scroll scenes rather than feature grids or card stacks.
- Keep the homepage quiet, compact, and editorial.
- Keep artifacts visible only after the reasoning structure has been introduced.
- Do not add long tool descriptions, large feature cards, marketing sections, or strong CTA buttons.
- Homepage navigation may use `Learn`, `Journey`, and `Tools`, but it should feel like reading progress rather than a full product menu.

Subpage rules:

- Start with the shared subpage header.
- Use a concise hero or page heading.
- Put controls near the outputs they affect.
- Keep formulas and details available but not visually dominant.
- Prefer panels for actual tool regions, not decoration.

Calculator workspace rules:

- Lightweight calculator pages should feel like one scientific workspace, not a stack of unrelated cards.
- Use a two-pane desktop layout when the task has clear input and output sides: the input workspace should usually be slightly wider, around 58%, and the result workspace around 42%.
- Organize inputs, parameters, results, details, and notes as sections inside workspace panes. Use quiet dividers and spacing to show structure instead of separate heavy cards.
- Put the primary numeric result near the top of the result workspace, with a compact conversion or calculation relationship directly beneath it.
- Keep notes as a low-emphasis section inside the result workspace unless the concept genuinely needs a larger teaching panel.
- On mobile, collapse to a single reading order: hero, input workspace, parameter section, result workspace, notes, footer.
- Future calculator-style tools should reuse this workspace rhythm before inventing a new layout.

## Responsive Design

Responsive behavior is part of the design system, not a per-page fix. New pages must use the shared responsive tokens in `assets/css/base.css` and the same breakpoint model used by the homepage, module index pages, tools, and simulators.

Breakpoints:

- Desktop: `1200px` and wider.
- Tablet: `768px` to `1199px`.
- Mobile: below `768px`.

CSS custom properties document these values:

```css
--bc-breakpoint-desktop: 1200px;
--bc-breakpoint-tablet-min: 768px;
--bc-breakpoint-tablet-max: 1199px;
--bc-breakpoint-mobile-max: 767px;
```

Media queries must use `@media (max-width: 1199px)` for tablet-and-smaller changes and `@media (max-width: 767px)` for mobile changes. Do not introduce isolated breakpoints such as `640px`, `700px`, `820px`, or `980px` unless a specific component has a measured, documented need.

Typography scaling:

- Use `clamp()` through shared tokens rather than fixed viewport-width-only sizing.
- Homepage brand title uses `--bc-home-title`.
- Page, tool, and simulator titles use `--bc-hero-title`.
- Major section headings use `--bc-h2-size`.
- Keep `letter-spacing: 0` for large headings.
- On mobile, large headings should use a slightly looser line-height, usually `0.98` to `1`, so long words do not appear clipped.
- Mobile homepage title should read at roughly 55-65% of the desktop visual scale and must fit inside the content container on common phone widths.

Hero layout:

- Desktop heroes may use two-column editorial layouts.
- Tablet heroes may keep two columns only when both columns remain readable without squeezing copy.
- Mobile heroes collapse to one column and reduce vertical padding instead of simply shrinking the desktop layout.
- The Hero title must have `max-width: 100%` or a container-limited width and must never cause horizontal overflow.
- Homepage Hero should keep visual focus on the title, but mobile spacing should be compact enough that the first viewport is not mostly empty.
- Mobile homepage Hero should reduce top padding, keep the title centered, and reserve only a small lower cue area.

Navigation:

- Desktop navigation can use wider gaps and full-size labels.
- Tablet navigation compresses gap before changing structure.
- Mobile navigation remains visible because there are only three primary entries.
- Do not add a hamburger menu for the current `Learn`, `Journey`, and `Tools` navigation.
- Mobile navigation should use smaller type, reduced gap, and at least `38px` effective height per link.
- Header logo, brand text, and nav must be vertically compressed on mobile while preserving the minimal style.

Spacing:

- Use `--bc-container-inline`, `--bc-page-padding-block`, `--bc-header-padding-block`, and `--bc-section-gap`.
- Desktop containers usually use `calc(100% - 48px)`.
- Tablet containers use `calc(100% - 40px)`.
- Mobile containers use `calc(100% - 32px)`.
- Reduce mobile Hero and header vertical padding before reducing content readability.
- Keep whitespace generous, but avoid empty first-screen space that pushes the main message out of view.

Viewport units:

- Do not use traditional `100vh` for primary page or Hero height.
- Use `100svh` for stable mobile viewport sizing.
- Use `100dvh` only when a component intentionally needs to respond to browser chrome expansion and collapse.
- Fallbacks may be used for older browsers, but the modern `svh` or `dvh` rule must be the effective rule.

Overflow and tap targets:

- `body` should prevent page-level horizontal scrolling with `overflow-x: hidden`, but this is not a substitute for fixing overflowing components.
- Use `minmax(0, 1fr)` in grids that contain text, charts, forms, or scientific output.
- Tables and matrices may use component-level horizontal scrolling when preserving columns is clearer than forcing them into unreadable cards.
- Buttons, links, inputs, and segmented controls must remain comfortably tappable on mobile.
- Before shipping, check `320px`, `375px`, `390px`, `768px`, and desktop widths for title clipping, text overlap, horizontal scroll, and unusable controls.

## Scientific User Experience

Scientific artifacts should use a consistent reasoning flow whenever possible:

```text
Scientific Question
  -> Scientific Idea
  -> Interaction
  -> Visualization
  -> Scientific Result
  -> Interpretation
  -> Reflection
  -> Formula Audit
  -> Scientific Reference
```

This flow helps users understand what changed, what was calculated, why the result matters, and where the scientific basis comes from.

Rules:

- Inputs should make assumptions visible.
- Calculation results should update predictably.
- Visualizations should explain the model rather than decorate the page.
- Interpretation should be short, objective, and tied to the current inputs.
- Scientific references should be available without overwhelming the primary workflow.
- Different tools may vary in layout, but they should not use completely different information logic without a reason.

## Result Hierarchy

Any scientific tool should prioritize information in this order:

1. Scientific Result
2. Visualization
3. Interpretation
4. Formula
5. Regulatory Notes

Rules:

- The main scientific result should be the first clear visual answer.
- Visualization should help users understand the result, not compete with it.
- Interpretation should explain the current state in plain scientific language.
- Formula details should usually be collapsed by default with `details`/`summary`.
- Regulatory notes should remain concise and supporting.
- Do not let regulatory exposition cover or precede the result unless the page is specifically a reference page.

## Homepage Artifact Entries

Homepage artifact entries should be restrained and text-led.

Use them to show scientific objects that support reasoning:

- Explorers: help users examine a concept.
- Calculators: answer a practical scientific question.
- Converters: clarify unit or representation changes.
- Simulators: make design assumptions visible.

Rules:

- Keep copy short.
- Emphasize the reasoning each artifact supports.
- Do not make cards feel like SaaS feature marketing.
- Prefer text-led links over large cards.
- Do not use icons unless they clarify meaning.
- Do not use heavy shadows or saturated backgrounds.

## Visualization Rules

Visualizations must serve understanding.

Rules:

- Each visualization should answer one clear scientific question.
- Put parameter controls and result interpretation near the chart they affect.
- Use restrained colors.
- Keep axes, labels, units, and annotations readable.
- Ensure mobile views remain legible.
- Prefer interactive parameters when interaction improves understanding.
- Reuse chart, parameter, result, and explanation patterns when possible.
- Do not add static decoration that does not explain a scientific idea.

## Shared Page Chrome

Every non-homepage page should use the shared subpage header:

```html
<header class="site-header">
  <a class="brand-link" href="../../" aria-label="BioassayCraft home">
    <img class="brand-mark" src="../../assets/brand/logo.svg" alt="" aria-hidden="true">
    <span class="brand-name">bioassaycraft</span>
  </a>
  <a class="back-link" href="../../">Back to home</a>
</header>
```

Rules:

- The brand link and the back link both return home.
- Keep the wordmark lowercase: `bioassaycraft`.
- Do not add a full site-wide nav bar to subpages yet.
- This does not conflict with the homepage using minimal anchors such as Learn, Journey, and Tools.
- Revisit full subpage navigation only when Learn, Journeys, and Tools contain enough content to require it.
- Use the same spacing, radius, border, and hover behavior across all subpages.
- Reserve a stable width for the back-home action so localized labels such as `返回首页` and `Back to home` do not shift adjacent controls.
- Adjust relative paths only as needed by route depth.

Site footer:

```html
<footer class="site-footer">
  <span class="footer-belief">BioassayCraft is the craft of understanding.</span>
  <span class="footer-domain">bioassaycraft.com</span>
</footer>
```

Rules:

- Keep `BioassayCraft is the craft of understanding.` exactly as the left-side footer belief statement.
- Keep `bioassaycraft.com` lowercase.
- Keep both footer texts subtle and below a quiet rule.
- On desktop, align the belief statement left and the domain right.
- On narrow screens, stack them in normal reading order.
- Do not add social links, legal menus, or navigation while the site is in its minimal early form.

## Core Components

These are conceptual components today and should become reusable Vue components during migration.

### Page Shell

Purpose: outer width, page padding, background, and top-level flow.

Rules:

- Keep page width explicit.
- Keep background `--bc-bg`.
- Do not add full-page gradients or decorative color washes.

### Subpage Header

Purpose: consistent brand return and home navigation.

Rules:

- Use favicon mark plus lowercase wordmark.
- Use outlined blue `Back to home`.
- No extra nav items unless approved.

### Panel

Purpose: group a meaningful tool, chart, table, formula, or explanation region.

Rules:

- Border: `1px solid var(--bc-border)` or a quiet derived border.
- Radius: `8px` or less.
- Background: subtly different from page background, often `rgba(255, 255, 255, 0.44)`.
- No heavy shadows.
- Do not nest cards inside cards unless the inner elements are repeated data items.

### Metric Card

Purpose: show live result values.

Rules:

- Small label.
- Mono numeric value where possible.
- Short explanatory note.
- Use blue sparingly for primary results.
- Do not make every value a primary result.

### Control Block

Purpose: labeled input group.

Rules:

- Label is required.
- Unit must be visible when relevant.
- Slider controls should have a paired numeric input when direct entry matters.
- Selects are acceptable for modes and option sets.
- Segmented controls are acceptable for small mutually exclusive choices.
- Focus states must be visible.

### Chart Panel

Purpose: explain a model, distribution, sensitivity curve, map, or simulation.

Rules:

- Use SVG or canvas generated from data.
- Label axes and units.
- Keep chart labels readable on mobile.
- Do not use high-saturation red/green status palettes.
- Prefer low-saturation scientific color scales.
- Add legends when color encodes magnitude.
- Do not communicate pass/fail only through color.

### Formula Details

Purpose: provide auditability without overwhelming the main workflow.

Rules:

- Use `details`/`summary` by default for dense formulas.
- Keep formulas concise.
- Show live substitution values when helpful.
- Avoid long regulatory exposition inside tool pages.

## Interaction

Allowed motion:

- Subtle link color changes.
- Arrow movement of `2px` to `4px`.
- Quiet button hover.
- Tooltip reveal.
- Local chart update.
- Expand/collapse.

Avoid:

- Hover shadows.
- Glow effects.
- Bounce.
- Rotation.
- Large scale changes.
- Whole-page entrance animations on tools and simulators.

Every interactive state should remain calm and professional.

## Color For Scientific Visualizations

Scientific plots may use additional colors only when the meaning requires them.

Rules:

- Use BioassayCraft blue as the primary model or current-selection color.
- Use muted gray/slate for axes, references, helper lines, and secondary models.
- Use low-opacity warm rose or muted slate for risk/tail areas.
- Avoid large orange/brown areas unless scientifically necessary.
- Avoid saturated red/green pass/fail systems.
- Add legends for continuous heatmaps.
- Ensure current-point markers have enough contrast, often dark fill plus white stroke.

Acceptable low-saturation risk ramp:

```text
low:      #EEF4F3
moderate: #F3E5C4
high:     #C98274
```

## Mobile Rules

Mobile pages must be readable and usable, not merely squeezed.

Rules:

- No horizontal overflow.
- Stack workspaces into a single column.
- Stack form rows when cramped.
- Keep touch targets at least `44px`.
- Use single-column concept cards on phones.
- Keep heatmaps and charts tall enough to read; avoid chart panels below roughly `320px` when dense labels are present.
- Keep the back link full-width only when header space is constrained.
- Do not let decorative SVGs or diagrams cross text.

## Accessibility

Minimum requirements:

- Logical heading order.
- Form labels for every input.
- Visible focus states.
- Sufficient contrast.
- No information encoded only by color.
- Meaningful SVGs include `title`, `aria-label`, or equivalent context.
- Decorative images use `alt=""`.
- Motion respects `prefers-reduced-motion`.

## Naming System

Use consistent product language:

- `Explorer`: helps understand a concept through interaction.
- `Simulator`: simulates a validation, model, or experimental design scenario.
- `Converter`: transforms units or values.
- `Calculator`: estimates a design quantity from assumptions.

Examples:

- `ANOVA Explorer`
- `Method Validation Simulator`
- `OOS Risk Explorer`
- `Concentration Converter`
- `Validation Sample Size Calculator`

Do not rename existing public-facing artifacts casually. Naming changes should improve conceptual clarity and route consistency.

## Future Vite + Vue Component Map

When Vite + Vue migration begins, extract components in this order:

1. `SiteHead`
2. `SubpageHeader`
3. `SiteFooter`
4. `PageShell`
5. `ModuleCard`
6. `Panel`
7. `MetricCard`
8. `ControlBlock`
9. `FormulaDetails`
10. `ChartPanel`
11. Tool-specific Vue components

Do not extract components just to abstract. Extract when it reduces repeated code across at least two stable pages.

## Non-Goals

The design system should not become:

- A generic UI kit.
- A Bootstrap-like component catalog.
- A marketing design language.
- A reason to redesign current pages.
- A dependency on a large external UI library.

BioassayCraft should stay quiet, precise, and scientific as it becomes more maintainable.
