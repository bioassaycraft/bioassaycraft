# BioassayCraft Homepage Storyboard

Use it together with:

- [Manifesto](manifesto.md)
- [Product Philosophy](product-philosophy.md)
- [Design System](design-system.md)
- [Artifact Patterns](artifact-patterns.md)

This storyboard is the design contract for the default homepage.

The homepage is not a landing page, dashboard, or tool catalog. It is a short scientific prologue: a Bioassay Notebook opening from identity, to question, to reasoning, to practice.

## Interaction Principles

- Each scene expresses one idea.
- The first screen establishes identity, not structure.
- Users should enter through a scientific question before seeing paths or artifacts.
- Motion should express reasoning forming: fade, line drawing, node reveal, and quiet scroll progression.
- Natural scrolling is preferred. Do not use scroll-jacking or forced horizontal movement.
- Tools should appear as artifacts of reasoning, not as homepage features.

Avoid:

- Feature grids.
- Dashboard layouts.
- Large cards.
- Dense knowledge networks.
- Floating scientific labels in the hero.
- Strong CTA buttons.
- Decorative particles, glow, bounce, or fast parallax.

## Scene 1: Identity

### Goal

Establish the product's identity with one sentence.

### Content

```text
BioassayCraft

From theory to practice.

Interactive tutorials, simulations, practical tools, and bioassay insights.

↓ Scroll to begin
```

### Rules

- Do not show Tools, Journey, USP, ANOVA, Validation, Calculator, or other module words.
- Do not show a `Start Exploring` or `Get Started` button.
- The background should be almost empty.

### Visual Direction

Allowed:

- Very faint notebook grid.
- Subtle coordinate-paper feeling.
- Weak scientific line hints.

Avoid:

- Floating labels.
- Knowledge graph.
- Dense nodes.
- Particles.
- Strong gradients.

### Aha Moment

The user understands that BioassayCraft is a quiet notebook for moving from scientific theory toward practice.

## Scene 2: Question

### Goal

Move from brand to scientific inquiry.

### Content

```text
Every scientific decision begins with a question.

How do we know an assay is fit for purpose?
```

### Interaction

The identity text may fade or become quieter as the question takes over.

### Rules

- Do not explain in paragraphs.
- Do not introduce modules.
- Let the question create the next step.

### Aha Moment

The user realizes the homepage begins with reasoning, not navigation.

## Scene 3: Reasoning Chain

### Goal

Show that bioassay work is a reasoning chain from question to decision.

### Nodes

```text
Question
ATP
Method Design
Validation
Evidence
Decision
```

### Interaction

- A thin line gradually forms.
- Nodes appear one by one.
- Each node may carry one short note.

### Message

Bioassay work is not isolated calculation. It is the movement from question, to design, to evidence, to decision.

### Rules

- Do not make this look like PPT SmartArt.
- Do not show all nodes at once if animation is used.
- Do not use large cards.
- Keep annotations to one line whenever possible.

### Aha Moment

The user sees that calculation is only meaningful inside a reasoning chain.

## Scene 4: Practice Paths

### Goal

Introduce practice directions only after the reasoning chain exists.

### Title

```text
Follow the reasoning.
```

### Paths

```text
Method Development
Define purpose, design choices, and assay strategy.

Method Validation
Ask how much evidence is enough.

Data Analysis
Turn variation into interpretable evidence.
```

### Interaction

Paths should feel as if they grow out of the reasoning chain. They should be text-led nodes, not navigation cards.

Hover or focus may reveal the short note more clearly.

### Rules

- Do not make this feel like a conventional navigation section.
- Do not present the three paths as ordinary navigation columns.
- Keep the visual quiet and notebook-like.

### Aha Moment

The user understands that practice areas are different ways of following the same reasoning discipline.

## Scene 5: Artifacts

### Goal

Introduce tools as scientific artifacts for exploration.

### Title

```text
Artifacts
```

### Subtitle

```text
Scientific objects for exploration.
```

### Artifacts

```text
ANOVA Explorer
Explore how variation becomes evidence.

Validation Sample Size
Estimate evidence required by validation assumptions.

Concentration Converter
Move between mass and molar thinking.

OOS Risk Explorer
Reason through tail-area risk.

Method Validation Simulator
Explore validation design as risk reasoning.
```

### Interaction

Artifacts should appear as minimal text-led links. They are not feature cards and not a product catalog.

### Rules

- Do not use icons.
- Do not use feature-grid cards.
- Do not use large button styling.
- Keep each artifact to one short explanation.

### Aha Moment

The user understands that tools are scientific objects that support reasoning.

## Scene 6: Closing

### Goal

Close the prologue without marketing pressure.

### Content

```text
Theory guides the question.
Evidence supports the decision.
Practice refines the craft.

bioassaycraft.com
```

### Rules

- No marketing CTA.
- No complex footer.
- No additional module list.

### Aha Moment

The user leaves the homepage with BioassayCraft's core promise: scientific reasoning becomes practical craft.

## Navigation

The top navigation should stay minimal.

Recommended labels:

```text
BioassayCraft
Learn
Journey
Tools
```

These labels are user-facing navigation anchors. They should behave like reading progress, not a product menu.

If some destinations are not ready, keep links quiet, muted, or anchored to current homepage scenes.

## Motion

Allowed:

- Fade.
- Line drawing.
- Node reveal.
- Subtle sticky transition.
- Quiet scroll progression.

Forbidden:

- Bounce.
- Scale pop.
- Particles.
- Fast parallax.
- Continuous background motion.
- Scroll-jacking.

Every motion decision should answer: what reasoning change does this movement help the user understand?

## Implementation Notes

- Implement homepage refinements at `/`.
- Do not modify scientific calculation modules.
- Do not change existing tool calculation logic.
- Keep the homepage as a sequence of scenes, not sections with cards.
- Prefer text, spacing, line, and timing over decorative visuals.
