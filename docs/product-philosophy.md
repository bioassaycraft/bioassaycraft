# BioassayCraft Product Philosophy

Use it together with:

- [Design DNA](design-dna.md)
- [Manifesto](manifesto.md)

BioassayCraft is an interactive scientific learning platform for bioassay.

It is not primarily a calculator collection, a documentation website, or a bioinformatics platform. It is a growing set of focused scientific artifacts that help users understand bioassay thinking through calculation, visualization, simulation, and careful explanation.

The product should feel like a scientific workbench for learning and reasoning, not a dashboard of features.

## What BioassayCraft Is

BioassayCraft helps users:

- Understand bioassay concepts through interaction.
- Explore how assumptions affect scientific conclusions.
- Connect formulas, models, visualizations, and interpretation.
- Use practical tools while seeing the reasoning behind them.
- Build confidence in method thinking, validation design, model comparison, and quantitative decisions.

Each tool should help users understand a concept, not merely produce a number.

## What BioassayCraft Is Not

BioassayCraft is not:

- A generic calculator collection.
- A regulatory documentation website.
- A bioinformatics platform.
- A marketing site for finished software.
- A single giant application that tries to solve every workflow.

It may include calculators, references, simulations, tutorials, and case studies, but those are artifacts inside a learning platform, not the platform's identity.

## Learning Journeys

BioassayCraft should grow around learning journeys rather than isolated pages.

A journey connects:

```text
Concept
  -> Reasoning
  -> Interactive exploration
  -> Simulation
  -> Practical calculation
  -> Interpretation
  -> Case study
  -> Scientific references
  -> Practical application
```

Individual calculators, explorers, and simulators should gradually become part of larger learning journeys.

Journey is the product organization. A calculator is one node inside a journey.

Users should leave with a way of thinking, not merely a numerical answer.

## Core Principles

### 1. Learning Before Automation

Automation is useful only when it helps users reason better.

BioassayCraft should avoid hiding important assumptions behind a single button. A good tool shows what matters, what changes, and why the result follows.

### 2. Scientific Correctness Before Engineering Elegance

Clean code matters, but scientific consistency matters more.

A beautifully refactored tool is not acceptable if it changes a validated result without explanation. Scientific formulas, assumptions, examples, and regression tests are part of the product.

### 3. Transparency Before Abstraction

Abstraction should reduce maintenance burden, not hide scientific meaning.

Users should be able to see:

- What inputs were used.
- What formula or model was applied.
- What assumptions are active.
- What result was produced.
- What reference supports the calculation.

### 4. Small, Composable Tools

BioassayCraft should grow as small, focused artifacts rather than one giant application.

Explorers, simulators, converters, calculators, tutorials, articles, and case studies should be understandable on their own while sharing a consistent design and scientific foundation.

### 5. Visualizations Explain Scientific Thinking

Charts and diagrams are not decoration.

A BioassayCraft visualization should clarify a relationship, reveal a tradeoff, show a boundary, or make a statistical idea visible. If a visual element does not improve understanding, it should usually be removed.

### 6. Every Tool Teaches

A calculator may produce a result, but it should also help users understand the scientific structure behind that result.

Good tools connect:

```text
input assumptions
  -> scientific model
  -> result
  -> visualization
  -> interpretation
  -> reference
```

### 7. Maintainability Over Novelty

Engineering decisions should preserve long-term maintainability rather than pursue short-term novelty.

Prefer:

- Static-first architecture.
- Versioned scientific models.
- Pure calculation functions.
- Small modules.
- Clear tests.
- Consistent page patterns.
- Gradual migration.

Avoid:

- Framework changes for their own sake.
- Large rewrites without scientific regression coverage.
- New visual systems for individual pages.
- Complex infrastructure before the product needs it.

## Care As Product Quality

BioassayCraft should make users feel cared for, not through emotional decoration, but through intellectual care.

Care means:

- Anticipating confusion.
- Explaining assumptions.
- Showing why a result matters.
- Making uncertainty visible.
- Giving users enough context to make better practical decisions.
- Avoiding interfaces that feel rushed, noisy, or indifferent.

A BioassayCraft artifact is successful when users feel:

```text
I understand this better now, and I know how to think about it in practice.
```

## Decision Rule

When making a design or engineering decision, ask:

```text
Does this help users understand the science more clearly,
while preserving scientific correctness and long-term maintainability?
```

If the answer is no, the change probably does not belong in BioassayCraft yet.
