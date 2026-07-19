# BioassayCraft Website Design Guidelines

This document defines the design baseline for future BioassayCraft pages, tools, Learn artifacts, simulations, and documentation.

Use it together with:

- [Brand Identity](brand-identity.md)
- [Design DNA](design-dna.md)
- [Design System](design-system.md)
- [Manifesto](manifesto.md)
- [Product Philosophy](product-philosophy.md)
- [Project Structure](project-structure.md)

## Design Philosophy

BioassayCraft is not a product marketing site and not a collection of isolated utilities. It is an interactive learning platform around bioassay thinking, quantitative reasoning, simulation, and practical calculation.

Every page should help users build understanding first, then offer interaction.

Principles:

- Clarity first.
- Understanding before interaction.
- Less is more.
- Calm and professional.
- Scientific instead of commercial.
- Learning before feature density.

BioassayCraft should feel like a precise educational platform for scientific thinking and engineering craft.

The site should communicate:

- Precision
- Scientific rigor
- Quantitative reasoning
- Engineering craftsmanship
- Simplicity
- Calm confidence
- Interactive learning
- Long-term trust

The design language is closer to an engineering notebook than a biotech brochure. It should feel more like a thoughtful scientific platform than a commercial SaaS landing page.

References:

- Apple Human Interface Guidelines
- IBM Design Language
- Braun / Dieter Rams
- Leica and Muji restraint
- Nature journal typography discipline
- Swiss International Style
- Seeing Theory-style conceptual clarity
- East Asian editorial restraint
- Japanese / Chinese scientific notebook feeling
- Careful margin and spacing discipline
- Quiet paper-like surfaces
- Restrained but warm educational artifacts

## Core Principles

1. Reduce before decorating.
2. Make hierarchy obvious through type, spacing, and alignment.
3. Prefer useful structure over visual ornament.
4. Treat interactive tools as instruments, not marketing widgets.
5. Let scientific ideas become visible through models, controls, plots, and explanation.
6. Use motion only when it clarifies state or interaction.
7. Design every page so it can sit comfortably beside future Learn artifacts, tools, and simulations.
8. Do not add content simply to fill space.
9. Prefer a quiet artifact or learning object over a feature pitch.

## Information Architecture

Keep information density low across the site.

Rules:

- Avoid explaining too much at once.
- Use pages to establish a clear hierarchy of understanding.
- Prefer an additional click over a crowded page.
- Put detailed explanation on the relevant tool, simulator, Learn artifact, journey, or case-study page, not on the homepage.
- Let the homepage establish brand impression, show content direction, and provide a small number of entry points.
- Treat lower homepage links as a content library or directory, not as product feature cards.

Future content areas may include:

- Learn artifacts
- Journeys
- Practical tools
- Interactive tutorials
- Case-data explanations
- Case studies

Articles should not become a top-level product section. Text-led content should live under a specific learning, journey, tool, or case-study purpose.

Design the homepage and subpage patterns so these areas can grow without changing the visual language.

## Visual Tone

The interface should be:

- Minimal
- Quiet
- Constructed
- Editorial
- Precise
- Slightly technical
- Warm enough for learning

The interface should not be:

- Glossy
- Playful
- Futuristic
- Corporate SaaS-like
- Biotech-themed
- Illustration-heavy
- Decorative for its own sake

BioassayCraft should feel less like a dashboard and more like a thoughtfully annotated scientific notebook.

It should not feel like:

- A SaaS control panel.
- A biotech marketing site.
- A flashy AI product.
- A generic calculator dashboard.

It should feel like:

- A scientific notebook.
- A careful mentor's marginal notes.
- A quiet interactive textbook.
- A practical bridge from theory to laboratory reality.

Warmth should come from margin, pacing, language, hierarchy, and careful interaction. Do not create warmth through decorative East Asian motifs, cuteness, biotech symbolism, or surface-level cultural styling.

## Mentor Notes

Every BioassayCraft page should feel like a carefully annotated notebook left by an experienced mentor.

Explanations should anticipate common misunderstandings.

Notes should explain:

- Why.
- When.
- Assumptions.
- Limitations.
- Practical implications.

Avoid sounding like regulatory text.

Avoid sounding like software documentation.

The tone should remain objective, calm, and scientifically careful.

## Color System

All color usage should reference the shared variables in `assets/css/base.css`.

Current brand variables:

```css
--bc-black: #171717;
--bc-blue: #2457B3;
--bc-blue-hover: #1E4B9C;
--bc-bg: #F7F5F0;
--bc-text: #171717;
--bc-secondary: #6E7278;
--bc-border: #D6D9DE;
--bc-blue-soft: rgba(36, 86, 179, 0.08);
--bc-blue-border: rgba(36, 86, 179, 0.32);
--bc-focus-ring: rgba(36, 86, 179, 0.16);
```

Rules:

- Use `--bc-bg` as the default page background.
- Use `--bc-text` for primary copy.
- Use `--bc-secondary` for explanatory text, metadata, hints, and subtle labels.
- Use `--bc-border` for quiet rules and structural separation.
- Use `--bc-blue` only for primary emphasis, active states, links, and scientific accents.
- Use `--bc-blue-soft` for selected or active backgrounds.
- Do not introduce new brand colors without updating this document and `base.css`.
- Do not use gradients, glow effects, glossy surfaces, or decorative color washes.

## Typography

Primary typefaces:

- Sans: `Inter`
- Mono: `IBM Plex Mono`

Rules:

- Use `Inter` for interface, headings, and body copy.
- Use `IBM Plex Mono` for numeric values, formulas, code, units, and tabular scientific data.
- Keep letter spacing at `0` except for rare small metadata labels.
- Do not scale font size directly with viewport width alone.
- Use tabular numerals for values, tables, formulas, and outputs.
- Prefer clear hierarchy over excessive font weights.

Suggested hierarchy:

- Page title: strong, concise, rarely more than one line on desktop.
- Section heading: compact and functional.
- Body text: calm, readable, not oversized.
- Metadata and hints: small, secondary, but still legible.
- Numeric output: mono, tabular, aligned.

## Layout System

Use restrained, predictable layout.

Rules:

- Keep content widths explicit with `min()` or `max-width`.
- Prefer full-width page bands or unframed layouts over nested cards.
- Use cards only for repeated items, tool panels, result rows, and modals.
- Do not place cards inside cards.
- Use grid for tool layouts, result panels, comparison views, and Learn artifact structures.
- Use flex for small alignment problems such as button rows and headers.
- Preserve generous whitespace, but avoid empty decorative space.
- Avoid horizontal scrolling at every viewport.

Homepage rules:

- The homepage should remain concise and first-screen readable.
- The homepage is a coming-soon landing page, not a product introduction page.
- The brand mark, title, slogan, explanation, status, and compact content-directory links are the hierarchy.
- Do not add long explanations of individual tools on the homepage.
- Do not make homepage entries feel like large feature cards.
- Use short artifact-style names and very short descriptors.
- Decorative elements must never intersect text or buttons on mobile.
- Mobile may remove decorative linework entirely.

Tools rules:

- Tools should feel like instruments.
- Inputs, units, outputs, formulas, and validation messages should be visible and legible.
- Results should update predictably and avoid layout shifts.
- Numeric output should use mono/tabular styling.
- Each tool should have a clear page title, short purpose, input area, output area, and formula or reasoning note when useful.

Learn artifact rules:

- Learn artifacts should prioritize reading flow and conceptual clarity.
- Use diagrams and simulations only when they explain something.
- Avoid long hero introductions.
- Prefer stepwise explanation with visible examples.

Simulations rules:

- Simulations should expose meaningful parameters.
- Controls should be close to the visual result they affect.
- Keep plots and visualizations legible at mobile sizes.
- Always provide a fallback explanation for what the simulation demonstrates.

## Shared Page Chrome

Use these patterns consistently so new pages feel like part of BioassayCraft instead of isolated prototypes.

### Subpage Header

Every non-homepage page should start with the shared subpage header:

- Left side: favicon mark plus the lowercase wordmark `bioassaycraft`.
- Right side: outlined `Back to home` link.
- Both links return to the homepage.
- Keep the header sparse; do not add a full navigation bar yet.
- Use the same spacing, typography, border radius, and hover behavior as existing tool and simulator pages.

Reference structure:

```html
<header class="site-header">
  <a class="brand-link" href="../../" aria-label="BioassayCraft home">
    <img class="brand-mark" src="../../assets/brand/logo.svg" alt="" aria-hidden="true">
    <span class="brand-name">bioassaycraft</span>
  </a>
  <a class="back-link" href="../../">Back to home</a>
</header>
```

Adjust relative paths by page depth. For pages that are served from root-level routes, absolute `/assets/...` paths are also acceptable for deployed pages.

Reference CSS values:

```css
.site-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  padding: 18px 0 42px;
}

.brand-link,
.back-link {
  display: inline-flex;
  align-items: center;
  color: var(--bc-text);
  text-decoration: none;
}

.brand-link {
  gap: 12px;
  font-size: 0.78rem;
  font-weight: 600;
}

.brand-mark {
  display: block;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
}

.back-link {
  min-height: 40px;
  padding: 0 14px;
  color: var(--bc-blue);
  border: 1px solid var(--bc-blue-border);
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 500;
}

.back-link:hover {
  border-color: var(--bc-blue);
  background: var(--bc-blue-soft);
  transform: translateY(-1px);
}
```

### Site Footer

The site footer should remain minimal and use a two-part footer line:

```html
<footer class="site-footer">
  <span class="footer-belief">BioassayCraft is the craft of understanding.</span>
  <span class="footer-domain">bioassaycraft.com</span>
</footer>
```

Footer rules:

- Keep the belief statement exactly: `BioassayCraft is the craft of understanding.`
- Keep the text `bioassaycraft.com` in lowercase.
- Align the belief statement to the left and the domain to the right on desktop.
- Place it below a quiet top rule.
- Use secondary text color, small type, and medium weight.
- Do not add social links, menus, copyright blocks, or extra metadata while the site is in its minimal early form.
- On narrow screens, it may stack with normal document flow but should remain subtle and readable.

Reference CSS values:

```css
.site-footer {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 0 28px;
  color: var(--bc-secondary);
  border-top: 1px solid var(--bc-border);
  font-size: 0.72rem;
  font-weight: 500;
  text-align: right;
}

.footer-belief {
  text-align: left;
}

.footer-domain {
  text-align: right;
}
```

## Components

Buttons:

- Minimum touch target: `44px`; preferred: `48px`.
- Use filled blue buttons for primary actions.
- Use outlined blue buttons for secondary actions.
- Avoid more than one primary action in the same local decision area.
- Button labels should be verbs or clear actions.
- Buttons should not resize or shift layout on hover.

Links:

- Links should be visibly interactive through color, underline, or context.
- In dense educational text, prefer underlines for clarity.
- In homepage or directory-style artifact links, prefer text plus arrow with no underline.
- For artifact links, hover may shift the arrow `2px` to `4px` to the right.
- Hover transitions should be smooth and subtle.
- Do not rely only on hover states.

Hover and interaction:

- Keep hover effects restrained and consistent.
- Prefer slight color changes, quiet background changes, and small arrow movement.
- Avoid hover shadows, glow, bounce, scale, rotate, large movement, or complex animation.
- Buttons and links should not resize or shift surrounding layout on hover.

Forms:

- Labels are required.
- Units should be explicit.
- Validation messages should be specific and placed near the relevant control.
- Avoid placeholder-only labeling.
- Use focus rings based on `--bc-focus-ring`.

Panels:

- Panels may use top borders and quiet structural lines.
- Avoid heavy box shadows.
- Avoid rounded rectangles larger than `8px` unless there is a strong interaction reason.
- Avoid decorative corner marks on mobile if they compete with content.

Tables and numeric output:

- Use mono/tabular numerals.
- Align comparable values.
- Keep units visible.
- Use compact spacing, but not cramped spacing.

Plots and diagrams:

- Prefer SVG or canvas generated from data/model logic.
- Avoid chartjunk.
- Label axes and units when the plot is analytical.
- If a curve represents a model, do not imply observed points are mechanically connected unless that is scientifically true.

## Logo And Brand Mark Usage

Use the pure circular symbol from [Brand Identity](brand-identity.md).

Rules:

- Use `/assets/brand/logo.svg` for in-page brand marks on light backgrounds.
- Use `/assets/brand/logo-light.svg` for brand marks on dark backgrounds.
- Use `/assets/icons/favicon.svg` and PNG favicon exports for browser and app icons.
- Do not recreate the mark in CSS.
- Do not use overlapping letter monograms.
- Do not add biology imagery around the mark.
- Keep clear space around the mark.

## Motion Design

Motion is only for reading clarity, state change, and a sense of finish. Do not add animation for spectacle.

### Landing Page

The homepage may use a subtle entrance animation.

Recommended:

- `opacity`
- `translateY` around `6px` to `10px`
- Duration around `300ms` to `500ms`
- Natural easing

The animation should be quiet enough that users do not actively notice it.

### Explorer, Simulator, Tool, And Lesson Pages

Subpages should be immediately usable. Do not apply whole-page entrance fades or whole-page upward motion.

Keep motion local:

- Button hover
- Link hover
- Tooltip reveal
- Tab switching
- Chart updates
- Numeric updates
- Expand/collapse

Avoid:

- Page-wide entrance animations on tools and simulators
- Parallax
- Continuous ambient animation
- Springy, bouncing, rotating, or playful motion
- Motion that delays access to content

Always support `prefers-reduced-motion`.

## Mobile Rules

Mobile layouts must be designed, not merely compressed.

Requirements:

- No horizontal scrolling.
- No clipped words or controls.
- No decorative linework crossing title, body text, controls, or buttons.
- Buttons should become full-width when space is constrained.
- Tool inputs should stack when two-column rows become cramped.
- Footer text should stay subtle and readable.
- Text size should remain comfortable without viewport-width-only scaling.
- Tap targets should be at least `44px`.
- Use `100svh` carefully; avoid trapping content below the viewport on iPhone Safari.

Mobile breakpoint guidance:

- At `820px` and below, simplify layout and remove decorative frame lines.
- At `560px` and below, stack action rows and form rows.

## Accessibility

Minimum expectations:

- Semantic headings in logical order.
- Form controls with labels.
- Focus-visible states for every interactive element.
- Sufficient color contrast.
- No information communicated only by color.
- Motion respects `prefers-reduced-motion`.
- Images that are decorative use empty `alt=""`.
- SVGs used as meaningful images include title/desc or accessible labels.

## Content Voice

BioassayCraft copy should be:

- Precise
- Plainspoken
- Scientifically careful
- Calm
- Useful

Avoid:

- Hype
- Startup slogans
- Vague promises
- Excessive adjectives
- Biotech marketing language

Good pattern:

- Say what the user can learn or do.
- Name the concept or tool clearly.
- Explain the scientific reasoning when it matters.

## Page Types

### Homepage

Purpose: Establish brand impression, show the content direction, and provide a few quiet entry points while the site remains a coming-soon landing page.

Should include:

- Brand mark
- BioassayCraft title
- One concise slogan
- One short explanatory line
- Coming soon or platform status
- A compact content-library or directory area when useful
- A minimal domain footer

Should not include:

- Long marketing sections
- Stock imagery
- Decorative illustrations
- Detailed explanations of each tool
- Full navigation menus before they are needed
- Repeated feature cards
- Copy that makes the page feel like a finished product portal

### Tool Page

Purpose: Let users complete a scientific calculation or workflow.

Should include:

- Brand header
- Back/home navigation
- Tool title
- Short purpose statement
- Inputs
- Outputs
- Formula or reasoning note
- Clear validation behavior

### Lesson Page

Purpose: Teach a concept through structured explanation and examples.

Should include:

- Clear learning objective
- Stepwise sections
- Examples
- Optional interactive checkpoints
- References or further reading where appropriate

### Simulation Page

Purpose: Help users explore model behavior interactively.

Should include:

- Model description
- Controls
- Visualization
- Reset/default state
- Explanation of what changes mean

### Explorer Page

Purpose: Help users understand a scientific or statistical concept through controlled interaction.

Should include:

- Clear concept name
- Minimal setup explanation
- Visualization or model view
- Controls that reveal the concept
- Interpretation that helps users connect interaction to understanding

## Naming Convention

Use a consistent product language across the site.

`Explorer`

- Use for pages that help users understand a concept.
- Example: `ANOVA Explorer`.

`Simulator`

- Use for pages that simulate an experiment, validation process, design decision, or workflow.
- Example: `Method Validation Simulator`.

`Converter`

- Use for pages that transform data, units, formats, or quantities.
- Example: `Concentration Converter`.

Future pages should follow this naming system unless the design system is updated first.

## File And CSS Conventions

Follow [Project Structure](project-structure.md).

Route and folder rules:

- Use one top-level area per product type.
- Put practical tools under `tools/<tool-name>/index.html`.
- Put interactive simulations and simulator-style learning modules under `tools/<simulator-name>/index.html`.
- Use `tools/` as the canonical route directory for simulator pages; do not create a parallel `simulations/` directory.
- Do not use root-level module files such as `tools/example.html` for new pages.
- Prefer stable directory URLs such as `/tools/converter/` and `/learn/anova-explorer/`.
- Add a legacy redirect only after a URL has been published or externally shared.

CSS:

- Shared primitives go in `assets/css/base.css`.
- Page-specific styles use descriptive names such as `home.css`.
- Tool-specific styles go in `assets/css/tools/<tool-name>.css`.
- Avoid ambiguous filenames such as `style.css` or `styles.css`.
- Prefer existing CSS variables before adding new values.
- Add new variables only when they represent reusable design decisions.

JavaScript:

- Tool-specific scripts go in `assets/js/tools/<tool-name>.js`.
- Keep DOM selectors close to the tool they serve.
- Avoid global behavior unless it is shared by multiple pages.

HTML:

- Keep page HTML semantic and readable.
- Avoid large inline style or script blocks.
- Use shared favicon/head references from `assets/icons/`.

## Design Consistency

New pages should not introduce a new visual language.

Before designing a new page:

- Reuse existing typography, colors, spacing, borders, radius, panels, hover states, and page chrome.
- Prefer existing layouts and component behavior before adding new patterns.
- Update this design system first if a new pattern is genuinely needed.
- Avoid letting one-off pages become visually isolated demos.
- Let the site grow through consistent artifacts, not through repeated redesigns.

## Design Review Checklist

Before shipping a new page or tool:

- Does the page support BioassayCraft as an interactive learning platform rather than a marketing site or loose tool collection?
- Is the information density low enough?
- Is understanding prioritized before interaction?
- Does it use the shared color variables?
- Does every subpage use the shared logo plus `Back to home` header?
- Does the homepage keep the minimal two-part footer pattern?
- Does it avoid new decorative colors?
- Does it use clear semantic HTML?
- Are CSS and JS placed in responsibility-based files?
- Are all local asset paths valid?
- Does it work at mobile widths without horizontal scrolling?
- Are tap targets comfortable?
- Are focus states visible?
- Are numeric values tabular and unit-labeled?
- Are decorative elements removed or simplified on mobile?
- Does it avoid biotech clichés?
- Does it feel like BioassayCraft rather than a generic SaaS page?
- Does it reuse the design system instead of inventing a page-specific style?
- Does the page make the user feel guided, respected, and less alone in understanding a difficult bioassay concept?
- If the page functions correctly but feels rushed, noisy, indifferent, or hard to reason through, has the information hierarchy, explanation style, and interaction rhythm been reviewed?

## Things To Avoid

Do not use:

- DNA, molecules, antibodies, flasks, microscopes, medical crosses, or hexagons as brand decoration.
- Generic AI swirl symbols.
- Gradients.
- Shadows as primary structure.
- Glossy or glass effects.
- Oversized marketing heroes.
- Stock photos as identity.
- Nested cards.
- Decorative linework that intersects content.
- Unlabeled controls.
- Placeholder-only forms.
- New colors outside the design system.

When unsure, make the interface quieter, clearer, and more useful.
