# BioassayCraft Brand Identity

Use it together with:

- [Manifesto](manifesto.md)
- [Product Philosophy](product-philosophy.md)

BioassayCraft is an interactive learning platform for bioassay thinking, quantitative reasoning, simulation, scientific statistics, assay development, engineering craftsmanship, and practical calculation.

It should not feel like a conventional product website or a loose collection of tools. The brand should feel like a growing scientific learning platform made of focused artifacts: explorers, simulators, converters, tutorials, case studies, and articles.

The visual identity should communicate constructed knowledge rather than biotechnology. The mark is inspired by coordinate systems, fitted models, observed data, calibration, drafting, and engineering notebooks.

## Brand Copy

Use `BioassayCraft` as the canonical browser, app, and share title.

Metadata fields that should use exactly `BioassayCraft`:

- `<title>`
- `og:title`
- `twitter:title`
- `apple-mobile-web-app-title`
- Web App Manifest `name`
- Web App Manifest `short_name`

Homepage slogan:

```text
From theory to practice.
```

Homepage supporting tagline:

```text
Learn the reasoning behind bioassays.
```

Homepage status text:

```text
Coming Soon.
```

Keep `Coming Soon.` as visible homepage status text while the site is pre-launch, but do not include `Coming Soon` in browser/app/SEO metadata.

## Concept Explorations

The concept board is available at [concepts.svg](../assets/brand/concepts.svg).

### 01 Fitted Corner

Design rationale: A minimal coordinate corner holds one fitted curve and three observations.

Symbolism: Data are observed; models are fitted. The points are close to, but not perfectly on, the curve.

Scalability: Strongest favicon performance because the L corner and curve remain readable at 16px.

Relationship to BioassayCraft: Best captures modelling, quantitative reasoning, calibration, and craft without becoming a biotech or SaaS monogram.

### 02 Inverted Frame

Design rationale: A top-right drafting frame creates a different construction posture.

Symbolism: The model sits inside a measured boundary.

Scalability: Good at app-icon sizes, weaker at 16px because the upper frame competes with the curve.

Relationship to BioassayCraft: Communicates design discipline, but less directly evokes analytical modelling.

### 03 Residual Wave

Design rationale: A curve with slight variation hints at model residuals.

Symbolism: Error, noise, and refinement are part of the learning process.

Scalability: Moderate. The waveform becomes busy below 24px.

Relationship to BioassayCraft: Conceptually rich, but too close to a generic analytics chart if simplified further.

### 04 Tangent Tool

Design rationale: Adds a tangent-like construction line to a fitted curve.

Symbolism: Measurement, slope, sensitivity, and local reasoning.

Scalability: Good at medium sizes, but the tangent line becomes a stray mark at favicon size.

Relationship to BioassayCraft: Excellent secondary influence for diagrams and educational graphics.

### 05 Calibration Bracket

Design rationale: A bracket frames the fitted curve as a tolerance or interval.

Symbolism: Calibration, acceptance limits, and measured uncertainty.

Scalability: Strong bracket silhouette, but less distinctive than the fitted corner.

Relationship to BioassayCraft: Good for assay development, but risks feeling like a UI control icon.

### 06 Model Window

Design rationale: A square frame contains the model and observations.

Symbolism: A controlled interactive learning environment.

Scalability: Strong at larger app-icon sizes; less elegant as a tiny favicon.

Relationship to BioassayCraft: Useful for product areas, but slightly too literal as a primary mark.

### 07 Drafting Triangle

Design rationale: A triangular construction support adds engineering character.

Symbolism: Drafting tools, structure, and inference.

Scalability: Recognizable, but the triangular form pulls attention away from modelling.

Relationship to BioassayCraft: Good craft signal, weaker science signal.

### 08 Aperture Curve

Design rationale: A circular aperture surrounds a fitted curve.

Symbolism: Precision instrument, observation, and focus.

Scalability: Strong silhouette, but the circle risks becoming too device-like.

Relationship to BioassayCraft: Elegant and timeless, but less directly tied to data fitting.

### 09 Ruler Fit

Design rationale: Adds measurement ticks to the coordinate system.

Symbolism: Calibration and quantitative craft.

Scalability: The ticks disappear at favicon size.

Relationship to BioassayCraft: Strong supporting language for UI details, less strong as a standalone symbol.

### 10 Constructed C

Design rationale: Uses a constructed open curve as a subtle letter hint without becoming a monogram.

Symbolism: Craft and construction with a quiet brand-letter echo.

Scalability: Good, but it drifts toward lettermark territory.

Relationship to BioassayCraft: Better than a BC monogram, but still less original than the fitted corner.

## Recommended Direction

Concept 01, Fitted Corner, is the final direction.

It is the most BioassayCraft-specific mark because it combines:

- A coordinate corner for quantitative reasoning.
- A fitted curve for modelling and regression.
- Observation points for experimental data.
- Slight point-curve offsets for residuals and judgement.
- A geometric construction style for craft and calibration.

It avoids:

- Letter monograms.
- Biology clichés.
- Generic SaaS symbolism.
- Decorative startup-style illustration.

## Broader Brand Imagery

The BioassayCraft visual identity should not be limited to fitted curves, coordinate axes, and data points.

Future brand extension may develop around abstract ideas such as:

- Observation window.
- Bridge between theory and practice.
- Scientific notebook.
- Fitted model with residual judgement.
- Crafted reasoning.
- Mentor's marginal notes.
- Paper, ink, line, measurement, and annotation.

Avoid direct use of:

- DNA.
- Antibody.
- Molecule.
- Flask.
- Microscope.
- Hexagon.
- AI swirl.
- Generic biotech symbols.

The logo may remain simple, but the broader brand system should carry deeper meaning through typography, spacing, copy, diagrams, annotations, and interaction.

## Final Logo Files

- Primary symbol: [bioassaycraft-symbol.svg](../assets/brand/bioassaycraft-symbol.svg)
- Primary logo lockup: [bioassaycraft-logo.svg](../assets/brand/bioassaycraft-logo.svg)
- Monochrome symbol: [bioassaycraft-symbol-mono.svg](../assets/brand/bioassaycraft-symbol-mono.svg)
- Dark mode symbol: [bioassaycraft-symbol-dark.svg](../assets/brand/bioassaycraft-symbol-dark.svg)
- Concept board: [concepts.svg](../assets/brand/concepts.svg)

The live site favicon uses the same symbol at `/assets/icons/favicon.svg`.

## Construction Guide

Canvas:

- Base viewBox: `0 0 64 64`
- Background: `#F7F5F0`
- Optical drawing area: approximately `14..54` on x and `14..48` on y

Strokes:

- Primary stroke width: `5`
- Stroke caps: `round`
- Stroke joins: `round`
- Coordinate corner color: `#171717`
- Curve color: `#2457B3`
- Monochrome color: `#171717`

Geometry:

```svg
<path d="M17 14V48H50" />
<path d="M23 43C31 36 34 27 42 23C46 21 50 20 54 20" />
<circle cx="27" cy="39" r="3.4" />
<circle cx="39" cy="33" r="3.4" />
<circle cx="51" cy="25" r="3.4" />
```

Observation points:

- Use three points maximum.
- Points should be near the fitted curve but not mechanically snapped to it.
- Keep all points at `r=3.4` on the 64px grid.
- Preserve the mixed black/blue system only when color is available.
- In monochrome, all geometry becomes black; the mark must remain recognizable.

Clear space:

- Minimum clear space around the symbol: `8` units on the 64px grid.
- Preferred clear space: `12` units.
- For logo lockups, keep at least one symbol stroke width between symbol and wordmark as absolute minimum; preferred gap is `22` units in the current 360x72 lockup.

Minimum sizes:

- Favicon: 16x16px.
- UI icon: 24x24px.
- Header mark: 40-48px.
- Touch icon: 180x180px or larger.

Do not:

- Add DNA, molecules, flasks, crosses, hexagons, AI swirls, gradients, shadows, or glossy effects.
- Reconstruct the mark as letters.
- Add extra data points.
- Turn the curve into an obvious dose-response curve.
- Use thin hairlines inside the favicon.

## Dark Mode

Dark mode uses:

- Background: `#171717`
- Coordinate and monochrome points: `#F7F5F0`
- Curve and blue point: `#6F96E8`

The geometry is unchanged.
