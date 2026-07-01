# BioassayCraft Reference Implementation

Use it together with:

- [Manifesto](manifesto.md)
- [Product Philosophy](product-philosophy.md)
- [Design System](design-system.md)
- [Artifact Patterns](artifact-patterns.md)
- [Design DNA](design-dna.md)

OOS Risk Explorer is the first BioassayCraft page that clearly expresses the Manifesto, Product Philosophy, Design System, and Artifact Patterns as a real product artifact.

Future pages should reference OOS Risk Explorer before referencing older pages.

This does not mean every page should look the same. It means every page should carry the same product language:

- Scientific reasoning before operation.
- Understanding before calculation.
- Reflection before conclusion.
- Auditability without overwhelming the user.
- Calm, careful guidance instead of feature density.

## 1. Why This Page Works

OOS Risk Explorer works because it starts from a scientific idea rather than a tool feature.

It establishes:

- Concept before calculation.
- Scientific question before interaction.
- Mentor notes instead of documentation.
- Visualization as a reasoning anchor.
- Reflection instead of ending with numbers.
- Formula as audit, not entry point.
- Scientific reference as context, not the main experience.

The page does not ask users to begin by operating controls. It first gives them a way to think:

```text
OOS risk is tail area.
Bias moves the center.
Precision changes the spread.
Specification limits define the outside.
```

That mental model makes the later controls meaningful.

The page feels like BioassayCraft because it treats the user as a scientific practitioner, not as someone filling out a form. It anticipates confusion, names the underlying reasoning, and makes the practical implication visible.

## 2. Reference Product Structure

The reference structure is:

```text
Concept Lead
  -> Scientific Question
  -> Scientific Idea
  -> Mentor Note
  -> Concept Visualization
  -> Interaction
  -> Scientific Result
  -> Reflection
  -> Formula Audit
  -> Scientific Reference
```

Some layers should not be exchanged.

Concept Lead must come before controls because users need to know what kind of reasoning the page supports.

Scientific Question must come before interaction because controls are not self-explanatory. They become useful only after the user knows what question they are changing.

Scientific Idea must come before metrics because numbers are easier to trust and interpret when the model behind them is visible.

Reflection must come before formula audit because most users need interpretation before technical verification.

Formula Audit should remain available, but it should not become the starting point. In BioassayCraft, formulas support transparency; they do not replace explanation.

Scientific Reference should close the loop. It reminds users where the reasoning comes from, what scope it has, and why the page should not be treated as a silent authority.

## 3. Reference Reading Rhythm

OOS Risk Explorer has reading rhythm because it alternates between idea, interaction, visualization, and reflection.

It creates pauses before asking for operation:

- The Concept Lead gives the page a purpose.
- The Scientific Question slows the user down before controls.
- The Scientific Idea names the mental model.
- The Mentor Note explains why the model matters in practice.

It uses visualization as a thinking surface:

- The distribution view makes one scientific idea visible.
- The tail result connects the visual area to the numerical result.
- The bias-precision map expands from one distribution to a design space.
- The boundary translates the target risk into an acceptance idea.

It ends with reflection rather than output alone:

- The interpretation explains what the current result means.
- Formula audit allows verification without forcing it.
- Scientific reference gives scope and restraint.

This rhythm fits BioassayCraft because the product is not trying to make users click faster. It is trying to help them think more clearly.

## 4. Reference Writing Style

The writing should be calm, specific, and useful.

It should not sound like:

- Software documentation.
- A regulatory paragraph.
- A tooltip collection.
- Marketing explanation.

### Scientific Question

Scientific questions should name the practical reasoning problem.

They should ask what the user needs to understand, not what the page can compute.

Good questions usually include:

- The scientific object.
- The changing assumption.
- The practical consequence.

### Explanation

Explanations should connect cause and meaning.

They should answer:

- What changes?
- Why does it matter?
- What assumption is active?
- What should the user look for?

Avoid merely restating labels.

### Mentor Notes

Mentor notes should feel like marginal notes from an experienced practitioner.

They should be short, but not empty.

They should help with:

- Why this section exists.
- When the idea matters.
- What users often misunderstand.
- How the result affects practical judgement.

Mentor notes should not over-explain. They should reduce uncertainty at the exact moment the user is likely to need help.

### Reflection

Reflection should translate the result into scientific judgement.

It should not only say pass or fail.

It should explain:

- What the result means.
- Whether the current assumptions respect the target.
- Which pressure is more important.
- What kind of design thinking should happen next.

## 5. Reference Visual Tone

The visual tone of OOS Risk Explorer is not decorative. It is part of the product experience.

Paper-like means the page gives users enough room to read, compare, and think.

Calm means the page does not pressure users with dense panels, loud hierarchy, or excessive emphasis.

Restrained means important ideas are allowed to stand without visual noise.

Notebook-like means the page feels carefully annotated rather than automatically generated.

Mentor-like means the interface guides without taking over.

These qualities matter because BioassayCraft works with difficult scientific concepts. The interface should lower cognitive pressure while preserving precision.

The visual goal is not beauty alone. The goal is intellectual care.

## 6. Reference Interaction

Interaction in OOS Risk Explorer is scientific exploration.

It is not a dashboard.

The controls are not presented as a task list. They are a way to test assumptions:

- What happens when bias shifts the center?
- What happens when precision widens the spread?
- What happens when limits or target risk change?
- What boundary appears from the selected risk tolerance?

Future Explorers should inherit this approach:

- Controls reveal scientific relationships.
- Visualizations respond in a way that builds intuition.
- Interpretation stays close to the changed assumption.

Future Calculators should inherit the reasoning-first structure:

- Start with the question the calculation answers.
- Explain why the result matters.
- Keep formulas available for audit.
- Do not let input fields become the first experience.

Future Simulators should inherit the journey structure:

- Start with a scenario.
- Name the scientific goal.
- Let controls support the scenario.
- End with reflection.

## 7. What Should Not Be Copied

Do not mechanically copy OOS-specific content into other pages.

The following are scientific content, not design language:

- Tail-area framing.
- Distribution tails.
- Bias-precision heatmap.
- OOS boundary curve.
- Lower-tail and upper-tail contribution.
- OOS-specific terminology.

Other pages should find their own scientific anchor.

ANOVA Explorer may anchor on residuals and sum-of-squares reasoning.

Validation Sample Size Calculator may anchor on the distance between expected variability and the acceptance criterion.

Method Validation Simulator may anchor on scenario, design assumptions, and reportable-result risk.

Concentration Converter may anchor on the relationship between mass, molar amount, and molecular weight.

The pattern to copy is not the chart. The pattern to copy is the sequence of understanding.

## 8. Cross-Page Rules

For any new page, if the page feels weak, check these before adding features:

- Is there a Concept Lead?
- Is there a Scientific Question?
- Is there a Mentor Note?
- Is there a moment of Reflection?
- Is there a visible reasoning anchor?
- Is the Formula or Reference treated as audit rather than entry point?
- Does the page have reading rhythm?
- Does the user meet the scientific idea before the controls?

If these are missing, fix them before adding another control, chart, mode, or calculation.

BioassayCraft should not grow by feature count first. It should grow by clearer reasoning.

## 9. Future Reference

### Validation Sample Size Calculator

Should inherit:

- Concept Lead.
- Scientific Question.
- Mentor Notes.
- Reflection after result.
- Formula Audit.

Should adjust:

- The scientific anchor should be sample size pressure, not OOS tail area.
- The page should explain why tighter criteria, higher variability, confidence, and power increase required runs.
- The first result should be a design implication, not only minimum n.

### ANOVA Explorer

Should inherit:

- Explorer framing.
- Visualization before interpretation.
- Reflection on scientific meaning.
- Formula and table as audit support.

Should adjust:

- The scientific anchor should be model reasoning, residuals, and variance decomposition.
- The page should help users see why model assumptions change ANOVA decisions.
- It should avoid feeling like a statistics dashboard.

### Method Validation Simulator

Should inherit:

- Scientific journey structure.
- Scenario before controls.
- Mentor Notes around common misunderstandings.
- Reflection after simulated outcomes.

Should adjust:

- The page should feel like guided validation thinking, not an all-in-one validation workspace.
- Controls should appear in the order a practitioner reasons through design, evidence, risk, and decision.

### Concentration Converter

Should inherit:

- Concept Lead.
- Scientific Question.
- Interpretation.
- Clear assumptions.

Should adjust:

- It can remain simpler than an Explorer.
- It does not need a large visual sequence unless the visual helps users understand mass-to-molar reasoning.
- It should still explain why molecular weight connects the two concentration systems.

## Reference Principles

- Introduce scientific ideas before controls.
- Ask the scientific question before asking for input.
- Use interaction to reveal reasoning, not merely collect values.
- Make visualization a thinking surface, not decoration.
- Treat reflection as part of the product, not optional documentation.
- Keep formulas available for audit, but do not make them the first experience.
- Help users leave with a better mental model, not only a numerical answer.
- Let each page find its own scientific anchor.
- Prefer calm reading rhythm over feature density.
- Every BioassayCraft page should feel like a carefully annotated scientific notebook.

