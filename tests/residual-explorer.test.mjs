import { describe, expect, it } from "vitest";
import { analyseResiduals, defaultResidualParameters, generateResidualData, transformResponse } from "../src/lib/residual/explorer-data.js";

describe("Residual Explorer data pipeline", () => {
  const options = { ...defaultResidualParameters, seed: 23 };

  it("is reproducible for a seed and preserves generated observations across analysis choices", () => {
    expect(generateResidualData("pla", options, "ideal")).toEqual(generateResidualData("pla", options, "ideal"));
    const source = generateResidualData("pla", options, "increase");
    const first = analyseResiduals(source, { module: "pla" });
    const second = analyseResiduals(source, { module: "pla", weightMode: "inverse" });
    expect(first.points.map((p) => p.id)).toEqual(second.points.map((p) => p.id));
  });

  it("calculates raw, weighted, and standardized residuals for every model", () => {
    ["single", "sra", "pla", "fourpl"].forEach((module) => {
      const result = analyseResiduals(generateResidualData(module, options), { module, weightMode: "inverse" });
      expect(result.error).toBeNull();
      expect(result.points.length).toBeGreaterThan(5);
      result.points.forEach((p) => {
        expect(p.rawResidual).toBeCloseTo(p.response - p.fitted, 8);
        expect(p.weightedResidual).toBeCloseTo(Math.sqrt(p.weight) * p.rawResidual, 8);
        expect(Number.isFinite(p.standardizedResidual)).toBe(true);
      });
    });
  });

  it("uses the ANOVA Explorer 4PL concentration grid and a monotone four-parameter fit", () => {
    const source = generateResidualData("fourpl", { ...options, error: 0.2 });
    const result = analyseResiduals(source, { module: "fourpl" });
    expect(source).toHaveLength(48);
    expect(source.map((point) => point.dose)).toContain(0.015);
    expect(source.map((point) => point.dose)).toContain(52);
    ["reference", "test"].forEach((preparation) => {
      const curve = source
        .filter((point) => point.preparation === preparation)
        .sort((left, right) => left.dose - right.dose)
        .map((point) => result.fit.predict(point));
      expect(curve.every((value, index) => index === 0 || value >= curve[index - 1])).toBe(true);
      expect(result.fit.parameters[preparation].hill).toBeGreaterThan(0);
      expect(result.fit.parameters[preparation].ec50).toBeGreaterThan(0);
    });
  });

  it("refits response transformations and safely rejects invalid log values", () => {
    const source = generateResidualData("single", options);
    const raw = analyseResiduals(source, { module: "single", transform: "raw" });
    const logged = analyseResiduals(source, { module: "single", transform: "log" });
    expect(logged.fit.parameters).not.toEqual(raw.fit.parameters);
    expect(transformResponse(0, "log")).toBeNull();
    expect(transformResponse(-2, "sqrt")).toBeNull();
  });

  it("applies Box–Cox with the selected lambda and refits on that response scale", () => {
    expect(transformResponse(4, "boxcox", 0.5)).toBeCloseTo(2, 10);
    expect(transformResponse(4, "boxcox", 0)).toBeCloseTo(Math.log(4), 10);
    const source = generateResidualData("single", options);
    const lambdaZero = analyseResiduals(source, { module: "single", transform: "boxcox", boxCoxLambda: 0 });
    const lambdaHalf = analyseResiduals(source, { module: "single", transform: "boxcox", boxCoxLambda: .5 });
    expect(lambdaZero.fit.parameters).not.toEqual(lambdaHalf.fit.parameters);
  });

  it("builds Q–Q points from valid residuals and filters invalid mean–variance groups", () => {
    const result = analyseResiduals(generateResidualData("sra", options), { module: "sra" });
    expect(result.qq).toHaveLength(result.points.length);
    expect(result.meanVariance.every((p) => p.mean > 0 && p.variance > 0 && p.n > 1)).toBe(true);
  });
});
