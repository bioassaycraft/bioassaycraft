import { describe, expect, it } from "vitest";
import { analyseResiduals, defaultResidualParameters, diagnosis, generateResidualData, transformResponse } from "../src/lib/residual/explorer-data.js";

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

  it("lets the explorer vary concentration points and replicate count without changing fit support", () => {
    const source = generateResidualData("fourpl", { ...options, concentrationPoints: 7, replicates: 4 });
    const result = analyseResiduals(source, { module: "fourpl" });
    expect(source).toHaveLength(56);
    expect(new Set(source.map((point) => point.dose))).toHaveLength(7);
    expect(result.error).toBeNull();
    expect(result.points).toHaveLength(56);
  });

  it("applies each error-structure control across the generated series", () => {
    const changed = (structure, low, high) => {
      const baseline = generateResidualData("single", { ...options, ...low }, structure);
      const adjusted = generateResidualData("single", { ...options, ...high }, structure);
      return baseline.filter((point, index) => point.response !== adjusted[index].response).length;
    };
    [
      ["ideal", { error: .2 }, { error: 3 }], ["increase", { hetero: 0 }, { hetero: 4 }],
      ["decrease", { hetero: 0 }, { hetero: 4 }], ["rightSkew", { error: .2 }, { error: 3 }],
      ["correlated", { correlation: 0 }, { correlation: .9 }], ["plate", { error: .2 }, { error: 3 }],
      ["shared", { error: .2 }, { error: 3 }],
    ].forEach(([structure, low, high]) => expect(changed(structure, low, high)).toBeGreaterThan(30));
    expect(changed("outlier", { outlier: 0 }, { outlier: 8 })).toBe(1);
  });

  it("keeps ideal random data homoscedastic and varies every response level for heteroscedastic structures", () => {
    const ideal = analyseResiduals(generateResidualData("fourpl", options, "ideal"), { module: "fourpl" });
    expect(diagnosis(ideal, "ideal").variance).toBe("clear");

    const baseline = generateResidualData("fourpl", { ...options, hetero: 0 }, "increase");
    ["increase", "decrease"].forEach((structure) => {
      const adjusted = generateResidualData("fourpl", { ...options, hetero: 4 }, structure);
      const ratios = adjusted.map((point, index) => Math.abs(point.response - point.trueY) / Math.abs(baseline[index].response - baseline[index].trueY));
      expect(ratios.every((ratio) => ratio > 1)).toBe(true);
      const low = ratios.filter((_, index) => index < 2).at(0);
      const high = ratios.filter((_, index) => index >= ratios.length - 2).at(0);
      expect(structure === "increase" ? high > low : low > high).toBe(true);
    });
  });

  it("uses each selected model's full response range for smooth heteroscedastic scaling", () => {
    const endpointRatios = (module, structure) => {
      const baseline = generateResidualData(module, { ...options, hetero: 0 }, structure);
      const adjusted = generateResidualData(module, { ...options, hetero: 4 }, structure);
      const ratios = adjusted.map((point, index) => ({
        trueY: point.trueY,
        ratio: Math.abs(point.response - point.trueY) / Math.abs(baseline[index].response - baseline[index].trueY),
      })).sort((left, right) => left.trueY - right.trueY);
      return { low: ratios[0].ratio, high: ratios.at(-1).ratio };
    };

    ["increase", "decrease"].forEach((structure) => {
      const linear = endpointRatios("single", structure);
      const fourPl = endpointRatios("fourpl", structure);
      expect(linear.low).toBeCloseTo(fourPl.low, 10);
      expect(linear.high).toBeCloseTo(fourPl.high, 10);
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
    expect(result.meanVariance.every((p) => ["reference", "test"].includes(p.preparation))).toBe(true);
  });
});
