# BioassayCraft Artifact Patterns

This document is a Product Pattern Library, not a UI Component Library.

It defines how a BioassayCraft page should help users think. It does not define what a page should look like.

BioassayCraft artifacts should help practitioners move from rule awareness to scientific reasoning, and from reasoning to practical judgement.

## 1. Learning Artifact Pattern

Applies to:

- Learn artifacts
- Tutorials
- Case-data explanations
- Case studies

A Learning Artifact should organize reading as a guided reasoning path.

Recommended flow:

```text
Question
  -> Context
  -> Scientific idea
  -> Worked explanation
  -> Visual or numerical example
  -> Reflection
  -> Practical implication
  -> Scientific reference
```

How to use it:

- Start with the practical or conceptual question the reader is likely carrying.
- Introduce one idea at a time.
- Use diagrams, tables, or small interactions only when they clarify reasoning.
- Let each section answer why the next section matters.
- End with a more usable way of thinking, not merely a completed reading task.

A Learning Artifact's goal is not to transfer information. Its goal is to build scientific reasoning.

## 2. Explorer Pattern

Applies to:

- OOS Risk Explorer
- ANOVA Explorer
- Future Explorers

An Explorer helps users explore a scientific concept. It is not primarily a calculator.

Recommended flow:

```text
Concept Lead
  -> Interactive Exploration
  -> Visualization
  -> Interpretation
  -> Scientific Reference
```

The first question an Explorer should answer is:

```text
What scientific reasoning does this explorer help me understand?
```

Not:

```text
What can I calculate here?
```

Explorer rules:

- Make the scientific concept visible before asking for many inputs.
- Use interaction to reveal relationships, tradeoffs, or boundaries.
- Keep interpretation close to the visualization.
- Treat formulas as audit support, not the primary entry point.
- Avoid turning exploration into a form-heavy calculator.

## 3. Calculator Pattern

Applies to:

- Validation Sample Size Calculator
- Concentration Converter
- Future Calculators

A Calculator should answer a scientific question. It should not feel like a number machine.

The first screen should answer:

```text
What scientific question does this calculator answer?
```

Recommended flow:

```text
Reasoning
  -> Inputs
  -> Calculation
  -> Interpretation
  -> Formula
  -> Scientific Reference
```

Calculator rules:

- Do not begin with a large block of inputs unless the scientific question is already clear.
- Show why the result matters.
- Keep assumptions visible.
- Pair numeric controls with direct entry when precision matters.
- Use formula disclosure for auditability.
- Explain the result in practical language.

A Calculator helps users understand why a number is meaningful.

## 4. Simulator Pattern

Applies to:

- Method Validation Simulator
- Future Simulators

A Simulator should guide users through a scientific journey. It should not become an all-in-one workspace.

Recommended flow:

```text
Scenario
  -> Scientific Goal
  -> Controls
  -> Visualization
  -> Result
  -> Reflection
  -> Scientific Reference
```

Simulator rules:

- Start with the scenario and scientific goal.
- Introduce controls only after users understand what they are controlling.
- Keep controls close to the visual or result they affect.
- Avoid showing every possible control on the first screen.
- Provide reflection after the result so users can understand what changed.
- Do not let simulator pages become dashboards.

The goal is not to expose every function. The goal is to let users experience a scientific reasoning path.

## 5. Mentor Notes Pattern

Mentor Notes are short explanations that help users think.

Mentor Notes are not:

- Tooltips
- Documentation
- Regulatory copy
- Marketing copy

Mentor Notes should answer:

- Why
- When
- Assumptions
- Typical misunderstandings
- Practical implications

Bad example:

```text
Enter ACRB and ACOV, then calculate n.
```

Better example:

```text
Sample size increases when expected variability is close to the acceptance margin. Use this step to see whether the design is driven by precision pressure or by a tight accuracy criterion.
```

Bad example:

```text
Prob(OOS) is calculated from RB and GCV.
```

Better example:

```text
Bias shifts the reportable-result distribution toward one specification limit. Precision widens the distribution. OOS risk is the tail area that falls outside the limits.
```

Bad example:

```text
USP <1033> recommends evaluating validation data.
```

Better example:

```text
The useful question is not only whether validation data pass a table of criteria, but whether the reportable result is reliable enough for the intended decision.
```

## 6. Concept Lead Pattern

Every Explorer, Simulator, and Calculator should have a Concept Lead.

A Concept Lead is one or two sentences that answer:

```text
This page helps you understand...
```

It should not begin with:

```text
This tool calculates...
```

Good Concept Lead examples:

```text
This page helps you understand how bias and precision combine to create OOS risk at the reportable-result level.
```

```text
This page helps you understand why validation sample size is driven by the distance between expected variability and the acceptance criterion.
```

```text
This page helps you understand how model assumptions change residuals, sum-of-squares decomposition, and ANOVA decisions.
```

The Concept Lead is the most important reading starting point on a page.

## 7. Reading Rhythm Pattern

BioassayCraft pages should create a natural reading rhythm.

Recommended rhythm:

```text
Question
  -> Scientific Idea
  -> Interaction
  -> Pause
  -> Visualization
  -> Reflection
```

Avoid:

```text
Panel
  -> Panel
  -> Panel
  -> Panel
  -> Panel
```

Why this matters:

- Users need time to understand scientific assumptions.
- Interaction without pauses becomes mechanical.
- Continuous panels make pages feel like dashboards.
- Reading rhythm helps users move from operation to reasoning.
- More features do not compensate for unclear scientific pacing.

Whitespace, short explanations, visual breaks, and reflection notes are part of the product experience.

## 8. Explanation Hierarchy

Recommended hierarchy:

```text
Scientific Question
  -> Scientific Idea
  -> Interaction
  -> Scientific Result
  -> Interpretation
  -> Formula
  -> Scientific Reference
```

Avoid:

```text
Input
  -> Button
  -> Output
```

Reasoning should come before calculation.

This does not mean every page needs a long introduction. It means users should know what they are reasoning about before they are asked to operate controls.

## 9. Journey Transition

BioassayCraft is currently organized around artifacts:

- Explorers
- Simulators
- Calculators
- Converters

This is reasonable for the early site because artifacts are concrete, testable, and useful on their own.

The long-term direction is learning journeys.

The transition should be gradual:

```text
Artifact collection
  -> Related artifact groups
  -> Small learning paths
  -> Full scientific journeys
```

Do not suddenly restructure the whole site.

Instead:

- Let each new artifact declare what reasoning it teaches.
- Add links between related artifacts when the relationship is clear.
- Introduce journey pages only when there are enough artifacts to support them.
- Keep calculators available as nodes inside journeys.
- Preserve direct access to practical tools.

Journey is the product organization. Calculator, Explorer, Simulator, and Learning Artifact are page patterns inside that organization.

## 10. Future Review Checklist

Before publishing a new page, answer:

- What scientific reasoning does this page teach?
- What misunderstanding does it remove?
- Where is the Concept Lead?
- Where is the Mentor Note?
- Does the user first meet the scientific idea or the controls?
- Does this page reduce confusion?
- Can this page naturally become part of a larger Journey?
- Does this page feel like BioassayCraft rather than a standalone demo?

If the answers are unclear, refine the product pattern before refining visual details.

## Pattern Relationships

Patterns that affect all pages:

- Concept Lead Pattern
- Mentor Notes Pattern
- Reading Rhythm Pattern
- Explanation Hierarchy
- Journey Transition
- Future Review Checklist

Patterns by artifact type:

- Learning Artifact Pattern: primarily affects Learn artifacts, tutorials, case-data explanations, and case studies.
- Explorer Pattern: primarily affects concept exploration pages such as OOS Risk Explorer and ANOVA Explorer.
- Calculator Pattern: primarily affects tools that estimate, convert, or calculate scientific quantities.
- Simulator Pattern: primarily affects pages that let users experience a scenario or model behavior over time.

These patterns are related but not interchangeable.

An Explorer reveals a concept.

A Calculator answers a scientific question.

A Simulator guides a scenario.

A Learning Artifact builds a reasoning path.

Together, they help BioassayCraft grow from a page collection into a scientific learning platform with a consistent way of thinking.
