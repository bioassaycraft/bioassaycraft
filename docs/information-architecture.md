# BioassayCraft Information Architecture

Use it together with:

- [Manifesto](manifesto.md)
- [Product Philosophy](product-philosophy.md)
- [Artifact Patterns](artifact-patterns.md)
- [Reference Implementation](reference-implementation.md)

This document is the source of truth for product modules, page classification, navigation structure, and content entry points.

BioassayCraft is an interactive pharmacopoeia learning, practice journey, and calculation platform for bioassay.

It connects:

- Pharmacopoeial rules.
- Statistical reasoning.
- Experimental design logic.
- Real project practice.
- Focused calculation and simulation tools.

It is not a generic article site and not merely a calculator collection.

The current top-level product structure is:

- Learn
- Journeys
- Tools

Do not add Articles as a top-level product module. If text-led content is needed later, place it under a more specific structure such as `learn/`, `learn/pharmacopoeia/`, `learn/tutorials/`, `learn/case-data/`, or `case-studies/`.

## Core Modules

BioassayCraft is organized around three core modules.

```text
Learn     = What does the rule mean?
Journeys  = How do I apply the rule in a real project?
Tools     = How do I calculate this specific thing?
```

In Chinese product language:

```text
Learn     = 理解规则
Journeys  = 应用规则
Tools     = 执行计算
```

The modules should remain distinct even when they link to each other.

## Learn

Learn is interactive pharmacopoeia learning.

Its purpose is to help users understand how bioassay-related chapters work and why their formulas, examples, and assumptions matter.

Future Learn content may include:

- USP `<1032>` Design and Development of Biological Assays.
- USP `<1033>` Biological Assay Validation.
- USP `<1034>` Analysis of Biological Assays.
- Chinese Pharmacopoeia 1431 biological assay general chapter.
- Chinese Pharmacopoeia 9307 bioactivity method validation.
- Chinese Pharmacopoeia 9401 biological activity assay chapter.
- Chinese Pharmacopoeia 9097 data processing and statistics.
- EP 5.3 statistical analysis of biological assays and tests.

Learn pages should not become traditional articles.

Each Learn artifact should ideally contain one clear interactive core:

- Reproducing pharmacopoeial case data.
- Explaining a formula.
- Showing parameter meaning.
- Letting users adjust assumptions.
- Updating results in real time.
- Explaining why the calculation works.
- Calling out common practical misuses.

Do not copy long pharmacopoeial text. Reference chapter numbers, concepts, formula logic, and case structures; explain them in BioassayCraft's own language.

## Journeys

Journeys are structured bioassay practice workflows.

Their purpose is to translate pharmacopoeial and statistical requirements into practical project paths.

Future Journeys may include:

- Method Development Journey.
- Method Validation Journey.
- Data Analysis Journey.
- System Suitability Journey.
- Reference Standard / QC Strategy Journey.

A Journey is not a Learn page and not a tool list.

It should guide a practitioner through staged decisions:

```text
Project context
  -> scientific decision
  -> input or assumption
  -> explanation
  -> interim output
  -> next practical step
  -> supporting Learn / Tool links
```

A minimum viable Journey can be a static step-by-step page with inputs, explanations, and staged output suggestions. It does not need accounts, saved projects, or a backend.

## Tools

Tools are focused calculators and simulators.

Their purpose is to complete a specific calculation, conversion, exploration, or simulation clearly and quickly while preserving assumptions, interpretation, and scope.

In the current product classification, calculators, converters, explorers, and simulators all belong to Tools.

Current Tools classification:

- Concentration Converter.
- Validation Sample Size Calculator.
- OOS Risk Explorer.
- ANOVA Explorer.
- Method Validation Simulator.

Current physical routes still include `tools/` and `simulators/` because the site is static and existing URLs should remain stable. Product classification treats them all as Tools until a later migration consolidates routes intentionally.

Do not move `/simulators/` routes into `/tools/` only for naming purity. If a future Vite + Vue route cleanup consolidates product routes, it must handle old links, redirects, and Cloudflare Pages deployment behavior explicitly.

Future Tools may include:

- Accuracy / Precision Acceptance Criteria Calculator.
- `%GCV` Calculator.
- Confidence Interval Calculator.
- Dilution Calculator.
- Dose Series Generator.
- Plate Layout Generator.
- Relative Potency Calculator.
- 4PL Fit Explorer.
- Parallelism Assessment Helper.
- System Suitability Rule Builder.

Tools should stay direct and usable. They should not become overly instructional, but they should include enough interpretation, assumptions, and scientific boundaries for responsible use.

## Homepage Role

The homepage is an invitation page.

It should answer:

```text
Why should I begin here?
```

It should not become:

- A full product dashboard.
- A complete tool directory.
- A marketing-heavy SaaS page.
- A long article about the platform.

Homepage structure:

1. Brand and light navigation.
2. Core positioning statement.
3. Three entry modules: Learn, Journeys, Tools.
4. A compact preview of currently available tools.
5. Quiet coming-soon signal that does not hide available content.

## Navigation Strategy

The homepage may show the three main entries through light navigation and module links:

- Learn
- Journeys
- Tools

This expresses the product information architecture without turning the site into a full portal.

Subpages should remain minimal at the current stage:

- Brand link.
- `Back to home`.

Do not add a full site-wide navigation bar to every subpage yet. When Learn, Journeys, and Tools contain enough content to require cross-site movement, revisit navigation as a deliberate design upgrade.

## Current Page Classification

Homepage:

- `/`

Learn:

- `/learn/`

Journeys:

- `/journeys/`

Tools:

- `/tools/`
- `/tools/concentration-converter/`
- `/tools/validation-sample-size-calculator/`
- `/tools/oos-risk-explorer/`
- `/simulators/anova-model-comparison/`
- `/simulators/validation-simulator/`

## Future Expansion

The site should grow from artifacts toward journeys without a sudden rewrite.

Recommended progression:

```text
Entry pages
  -> focused tools
  -> first Learn artifacts
  -> first Journey pages
  -> cross-linked learning paths
  -> Vite + Vue + D3 component migration
```

Do not introduce a large portal structure before content exists.
