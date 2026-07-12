import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { renderMathFormula } from "../src/utils/math-formula.ts";

describe("MathFormula rendering", () => {
  it("renders accessible inline math with MathML", () => {
    const rendered = renderMathFormula("\\bar{x} = \\frac{1}{n}\\sum x_i");
    assert.match(rendered, /katex-mathml/);
    assert.match(rendered, /mfrac/);
  });

  it("renders a display fraction and radical", () => {
    const rendered = renderMathFormula("\\frac{K}{\\sqrt{\\left(\\frac{u}{n}-1\\right)K^2+\\frac{u}{n-1}}}", true);
    assert.match(rendered, /katex-display/);
    assert.match(rendered, /sqrt/);
  });

  it("returns visible fallback markup for invalid LaTeX", () => {
    const rendered = renderMathFormula("\\frac{");
    assert.match(rendered, /katex-error/);
  });
});
