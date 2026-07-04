# Interaction System

BioassayCraft interactions should help users understand scientific state changes. Motion, tooltips, and annotations exist to clarify reasoning, not to decorate the page.

## Principles

- Keep motion calm, brief, and legible.
- Prefer opacity, small translation, and subtle numeric emphasis.
- Use tooltips for short definitions and local explanations.
- Keep long scientific reasoning in the main page flow, not in hover-only UI.
- Respect `prefers-reduced-motion`.

## Motion

Use the shared utilities in `src/utils/motion.js` for:

- Page or panel entry.
- Card hover states.
- Expand / collapse transitions.
- Step switching.
- Numeric changes.
- Header or navigation state changes.

Avoid:

- Bounce, rotation, large scale, parallax, and decorative loops.
- One-off transition timings in each component.
- Animation that hides weak information hierarchy.

## Tooltip And Annotation

Use `src/components/common/BcTooltip.vue` for:

- Formula parameter explanations.
- ANOVA table field definitions.
- Statistical terms.
- Pharmacopoeial terms.
- Short chart annotations.

Tooltips should:

- Open on hover and focus.
- Support keyboard dismissal with Escape.
- Work on touch by click / tap.
- Stay short enough to read without interrupting the main task.

## Vue, D3, And Motion Boundaries

- Vue owns application state, component rendering, forms, controls, and reusable interface components.
- D3 owns bespoke scientific drawings such as fitted curves, residual segments, scales, and teaching visualizations.
- Motion owns interface state transitions such as entering panels, changing numbers, and quiet hover feedback.

Do not use D3 as a general UI animation system. Do not use motion to replace scientific visualization logic.

## Common Patterns

- Hover explanation: use a tooltip for a compact term explanation; use a fixed panel for longer teaching text.
- Formula highlight: use subtle opacity or background changes to connect a parameter with a visual element.
- Numeric transition: use a short opacity / small translate transition so changed values are noticed without flashing.
- Panel transition: use a brief fade and 4-8px vertical movement.
- Chart annotation: keep labels near the relevant mark, but let D3 manage chart-space positioning.

Current examples:

- `ANOVA Explorer` uses D3 for bespoke model visualization and Vue for the SSbar and interface state.
- `Concentration Converter` uses the shared motion utility for quiet result updates and keeps explanatory notes in the workspace flow.

## Testing

Core calculation changes should be covered by Vitest. Visual polish does not need unit tests, but statistical calculations, formatting boundaries, and risk / sample-size logic should have focused tests.
