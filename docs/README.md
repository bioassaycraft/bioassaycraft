# BioassayCraft Docs

This folder contains product, design, engineering, and content guidance for BioassayCraft.

## Start Here

Read these first for most tasks:

1. [information-architecture.md](information-architecture.md)  
   Defines Learn / Journeys / Tools, page classification, navigation structure, and content entry points.

2. [development-roadmap.md](development-roadmap.md)  
   Defines Phase 0-5, including what each phase should and should not do.

3. [coding-guidelines.md](coding-guidelines.md)  
   Defines engineering rules, Scientific Engine separation, calculation logic boundaries, testing expectations, and AI modification rules.

4. [design-system.md](design-system.md)  
   Defines visual style, interaction rhythm, page layout, reusable interface patterns, mobile behavior, and accessibility expectations.

## Use When Needed

Use these when a task specifically touches content, structure, technology, or page patterns:

- [content-principles.md](content-principles.md)  
  Writing style, pharmacopoeial content handling, and practical advice expression.

- [project-structure.md](project-structure.md)  
  Current directory structure, route conventions, file naming, and static-site organization.

- [technical-direction.md](technical-direction.md)  
  Vite + Vue + D3.js migration direction and Cloudflare Workers static asset deployment principles.

- [deployment.md](deployment.md)
  GitHub Actions deployment flow, required Cloudflare secrets, and Workers static asset deployment notes.

- [upgrade-report.md](upgrade-report.md)
  Frontend infrastructure audit, dependency upgrade decisions, Cloudflare deployment check, and validation notes.

- [artifact-patterns.md](artifact-patterns.md)  
  Product pattern library for Learning Artifacts, Explorers, Calculators, Simulators, Concept Leads, Mentor Notes, and Reading Rhythm.

- [storyboard.md](storyboard.md)  
  Homepage narrative storyboard for the Bioassay Notebook direction and future homepage refinements.

## Reference Only

Use these for brand consistency, historical rationale, and reference examples:

- [reference-implementation.md](reference-implementation.md)  
  OOS Risk Explorer as a reference implementation. Use as an example, not a template to copy mechanically.

- [website-design-guidelines.md](website-design-guidelines.md)  
  Historical and page-level design rationale. Current implementation rules should follow [design-system.md](design-system.md).

- [brand-identity.md](brand-identity.md)  
  Brand mark, logo, favicon, and identity rules.

- [design-dna.md](design-dna.md)  
  Broader visual temperament and aesthetic direction.

- [manifesto.md](manifesto.md)  
  High-level product belief and long-term intent.

- [product-philosophy.md](product-philosophy.md)  
  Product principles and platform philosophy.

## Current Product Structure

The current top-level product structure is:

```text
Learn
Journeys
Tools
```

Do not create a top-level Articles section.

`learn/` is the formal home for future interactive pharmacopoeia learning.

Calculators, converters, utilities, and simulators use `tools/`; learning explorers use `learn/`.

## Current Technical Boundary

BioassayCraft currently uses Vite + Vue for the default homepage while existing tools, simulators, learn pages, and journey pages remain static HTML/CSS/JavaScript routes.

Future migration should remain gradual and route-preserving.

The long-term direction is:

```text
Vite + Vue homepage
  -> selected Vite + Vue tools
  -> Vite + Vue + D3.js scientific artifacts
  -> Cloudflare Workers static asset deployment
```

Do not perform full Vue migration, route consolidation, backend setup, database setup, account system, or scientific calculation changes unless explicitly requested.

Local development commands:

```bash
npm install
npm run dev
npm run build
npm run preview
```
