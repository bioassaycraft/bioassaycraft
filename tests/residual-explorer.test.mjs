import { describe, expect, it } from "vitest";
import { analyseResiduals, concentrationPointBounds, defaultResidualParameters, diagnosis, generateResidualData, transformResponse } from "../src/lib/residual/explorer-data.js";

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

  it("limits concentration points to two through sixteen more than the model parameter count", () => {
    expect(concentrationPointBounds("single")).toEqual({ min: 4, max: 18 });
    expect(concentrationPointBounds("fourpl")).toEqual({ min: 6, max: 20 });

    const single = generateResidualData("single", { ...options, concentrationPoints: 1, replicates: 2 });
    const fourpl = generateResidualData("fourpl", { ...options, concentrationPoints: 99, replicates: 2 });
    expect(new Set(single.map((point) => point.dose))).toHaveLength(4);
    expect(new Set(fourpl.map((point) => point.dose))).toHaveLength(20);
  });

  it("applies each error-structure control across the generated series", () => {
    const changed = (structure, low, high) => {
      const baseline = generateResidualData("single", { ...options, ...low }, structure);
      const adjusted = generateResidualData("single", { ...options, ...high }, structure);
      return baseline.filter((point, index) => point.response !== adjusted[index].response).length;
    };
    [
      ["ideal", { error: .2 }, { error: 3 }], ["increase", { hetero: 1 }, { hetero: 25 }],
      ["decrease", { hetero: 1 }, { hetero: 25 }], ["correlated", { correlation: 0 }, { correlation: .9 }],
      ["shared", { dilutionShift: 0 }, { dilutionShift: .12 }],
    ].forEach(([structure, low, high]) => expect(changed(structure, low, high)).toBeGreaterThan(30));
  });

  it("uses response-based local variance that expands across the full teaching range", () => {
    const ideal = analyseResiduals(generateResidualData("fourpl", options, "ideal"), { module: "fourpl" });
    expect(diagnosis(ideal, "ideal").variance).toBe("clear");

    ["increase", "decrease"].forEach((structure) => {
      const adjusted = generateResidualData("fourpl", { ...options, hetero: 40 }, structure);
      const byMean = [...adjusted].sort((left, right) => left.trueMean - right.trueMean);
      expect(structure === "increase" ? byMean.at(-1).localSD > byMean[0].localSD : byMean[0].localSD > byMean.at(-1).localSD).toBe(true);
      const endpointVarianceRatio = (byMean.at(-1).localSD / byMean[0].localSD) ** 2;
      expect(structure === "increase" ? endpointVarianceRatio : 1 / endpointVarianceRatio).toBeCloseTo(41 / 3, 10);
      expect(adjusted.reduce((total, point) => total + point.localSD ** 2, 0) / adjusted.length).toBeGreaterThan(options.error ** 2);
      adjusted.forEach((point) => expect(point.localSD).toBeGreaterThan(0));
    });
  });

  it("rescales every observation around the model curve when heterogeneity changes", () => {
    const baseline = generateResidualData("fourpl", { ...options, hetero: 0 }, "increase");
    const adjusted = generateResidualData("fourpl", { ...options, hetero: 40 }, "increase");
    adjusted.forEach((point, index) => {
      expect(point.trueMean).toBe(baseline[index].trueMean);
      expect(point.response).not.toBe(baseline[index].response);
      expect(Math.abs(point.response - point.trueMean)).not.toBe(Math.abs(baseline[index].response - baseline[index].trueMean));
    });
  });

  it("keeps design and generated-error metadata available for every observation", () => {
    const source = generateResidualData("fourpl", { ...options, replicates: 3 }, "shared");
    source.forEach((point) => {
      expect(point).toMatchObject({ trueMean: expect.any(Number), localSD: expect.any(Number), independentError: expect.any(Number), nominalConcentration: expect.any(Number), actualConcentration: expect.any(Number), plateRow: expect.any(Number), plateColumn: expect.any(Number) });
      expect(point.wellId).toMatch(/^[A-Z]\d+$/);
    });
    expect(new Set(source.filter((point) => point.replicateIndex === 1).map((point) => point.seriesId)).size).toBe(2);
    expect(source.some((point) => point.actualConcentration !== point.nominalConcentration)).toBe(true);
    const series = source.filter((point) => point.seriesId === source[0].seriesId);
    expect(new Set(series.map((point) => point.dilutionLogShift)).size).toBe(1);
  });

  it("preserves the random-error scale and adjacent correlation independently", () => {
    const sample = [];
    for (let seed = 1; seed <= 300; seed += 1) sample.push(...generateResidualData("single", { ...options, seed, error: 2, correlation: .7 }, "correlated"));
    const ordered = [];
    for (let seed = 1; seed <= 300; seed += 1) ordered.push(generateResidualData("single", { ...options, seed, error: 2, correlation: .7 }, "correlated"));
    const squaredMean = sample.reduce((total, point) => total + point.independentError ** 2, 0) / sample.length;
    const lagCorrelation = ordered.reduce((total, points) => total + points.slice(1).reduce((sum, point, index) => sum + point.independentError * points[index].independentError, 0), 0) / ordered.reduce((total, points) => total + points.slice(0, -1).reduce((sum, point) => sum + point.independentError ** 2, 0), 0);
    expect(squaredMean).toBeGreaterThan(3.6);
    expect(squaredMean).toBeLessThan(4.4);
    expect(lagCorrelation).toBeCloseTo(.7, 1);
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
