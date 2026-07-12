import katex from "katex";

export function renderMathFormula(formula: string, display = false) {
  return katex.renderToString(formula, {
    displayMode: display,
    throwOnError: false,
    strict: "warn",
    output: "htmlAndMathml",
  });
}
