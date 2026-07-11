import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  classifyIntervalAgainstSpecification,
  chiSquarePdf,
  chiSquareQuantile,
  confidenceInterval,
  createFixedPopulation,
  cv,
  generateStandardResiduals,
  generateTeachingSample,
  geometricCV,
  geometricMean,
  mean,
  meanConfidenceIntervalFromSummary,
  predictionInterval,
  samplePopulation,
  sampleStandardDeviation,
  sampleVariance,
  standardDeviationUpperLimitFromSummary,
  standardDeviationConfidenceIntervalFromSummary,
  sd,
  standardError,
  studentTQuantile,
  studentTPdf,
  tCritical,
} from "../src/lib/ci/statistics.ts";

const closeTo = (actual, expected, tolerance = 1e-10) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

describe("ci statistics", () => {
  it("calculates sample summaries", () => {
    const values = [100, 102, 98, 93, 88, 105];

    assert.equal(mean(values), 97.66666666666667);
    closeTo(sampleVariance(values), 38.666666666666664);
    closeTo(sampleStandardDeviation(values), 6.21825270205921);
    closeTo(sd(values), 6.21825270205921);
    closeTo(standardError(values), 2.5385910352879697);
    closeTo(cv(values), 6.366811640333663);
    closeTo(geometricMean(values), 97.49825911581524);
    closeTo(geometricCV(values), 6.477834985814762);
  });

  it("samples deterministically from a fixed population", () => {
    const population = createFixedPopulation(1431, 20);
    const first = samplePopulation(population, 6, 11).map((point) => point.id);
    const second = samplePopulation(population, 6, 11).map((point) => point.id);
    const third = samplePopulation(population, 6, 12).map((point) => point.id);

    assert.deepEqual(first, second);
    assert.notDeepEqual(first, third);
    assert.equal(createFixedPopulation(1431, 20)[0].value, population[0].value);
  });

  it("creates normalized residuals for the intuition explorer", () => {
    const residuals = generateStandardResiduals(42, 6);

    assert.equal(residuals.length, 6);
    assert.ok(residuals.every(Number.isFinite));
    closeTo(mean(residuals), 0, 1e-12);
    closeTo(sampleStandardDeviation(residuals), 1, 1e-12);
    assert.deepEqual(residuals, generateStandardResiduals(42, 6));
    assert.notDeepEqual(residuals, generateStandardResiduals(43, 6));
  });

  it("generates six teaching samples with controlled bias and spread", () => {
    const sample = generateTeachingSample({
      seed: 19,
      populationMean: 100,
      targetBias: 3.5,
      targetSpread: 7.25,
    });

    assert.equal(sample.values.length, 6);
    assert.ok(sample.values.every(Number.isFinite));
    closeTo(mean(sample.values), 103.5, 1e-10);
    closeTo(sampleStandardDeviation(sample.values), 7.25, 1e-10);
  });

  it("keeps residual structure stable when bias or spread changes", () => {
    const base = generateTeachingSample({
      seed: 77,
      populationMean: 100,
      targetBias: 2,
      targetSpread: 5,
    });
    const wider = generateTeachingSample({
      seed: 77,
      populationMean: 100,
      targetBias: 2,
      targetSpread: 9,
    });
    const shifted = generateTeachingSample({
      seed: 77,
      populationMean: 100,
      targetBias: -4,
      targetSpread: 5,
    });

    assert.deepEqual(base.residuals, wider.residuals);
    assert.deepEqual(base.residuals, shifted.residuals);
    closeTo(mean(base.values) - 100, 2, 1e-10);
    closeTo(mean(wider.values) - 100, 2, 1e-10);
    closeTo(sampleStandardDeviation(shifted.values), sampleStandardDeviation(base.values), 1e-10);
  });

  it("returns reference Student t critical values", () => {
    closeTo(studentTQuantile(0.95, 5), 2.0150483733330233, 1e-7);
    closeTo(studentTQuantile(0.975, 5), 2.570581835636314, 1e-7);
    closeTo(studentTQuantile(0.995, 5), 4.032142983557536, 1e-7);
    closeTo(tCritical(0.9, 5), 2.0150483733330233, 1e-7);
    closeTo(tCritical(0.95, 5), 2.570581835636314, 1e-7);
    closeTo(tCritical(0.99, 5), 4.032142983557536, 1e-7);
    closeTo(tCritical(0.95, 1), 12.706204736432095, 1e-6);
  });

  it("calculates mean intervals from summary inputs", () => {
    const result = meanConfidenceIntervalFromSummary({
      n: 6,
      mean: 100,
      sd: 10,
      confidenceLevel: 0.95,
    });
    closeTo(result.criticalValue, 2.570581835636314, 1e-7);
    closeTo(result.se, 10 / Math.sqrt(6));
    closeTo(tCritical(0.95, 10), 2.2281388519649385, 1e-7);
    closeTo(tCritical(0.95, 30), 2.0422724563012373, 1e-7);
    closeTo(studentTPdf(0, 5), 0.3796066898224944, 1e-10);
  });

  it("calculates chi-square critical values and an upper SD confidence limit", () => {
    closeTo(chiSquareQuantile(0.05, 5), 1.1454762260617697, 1e-7);
    closeTo(chiSquareQuantile(0.95, 5), 11.070497693516351, 1e-7);
    closeTo(chiSquarePdf(5, 5), 0.12204152134938741, 1e-10);

    const result = standardDeviationUpperLimitFromSummary({
      n: 6,
      mean: 100,
      sd: 10,
      confidenceLevel: 0.95,
    });
    assert.equal(result.df, 5);
    closeTo(result.alpha, 0.05);
    closeTo(result.criticalValue, 1.1454762260617697, 1e-7);
    closeTo(result.upperSd, 20.892574629617258, 1e-7);
  });

  it("calculates a two-sided SD confidence interval", () => {
    const result = standardDeviationConfidenceIntervalFromSummary({ n: 6, sd: 10, confidenceLevel: 0.95 });
    assert.equal(result.df, 5);
    closeTo(result.lowerCriticalValue, 0.831211613486663, 1e-7);
    closeTo(result.upperCriticalValue, 12.832501994030023, 1e-7);
    closeTo(result.lowerSd, 6.242080022589831, 1e-7);
    closeTo(result.upperSd, 24.526139885482955, 1e-7);
  });

  it("returns a t-based confidence interval with full calculation metadata", () => {
    const result = confidenceInterval([100, 102, 98, 93, 88, 105], 0.95);

    assert.equal(result.n, 6);
    assert.equal(result.df, 5);
    closeTo(result.mean, 97.66666666666667);
    closeTo(result.sd, 6.21825270205921);
    closeTo(result.se, 2.5385910352879697);
    closeTo(result.alpha, 0.05);
    closeTo(result.probability, 0.975);
    closeTo(result.criticalValue, 2.570581835636314, 1e-7);
    closeTo(result.marginOfError, 6.5256560034204405, 1e-7);
    closeTo(result.lower, 91.14101066324623, 1e-7);
    closeTo(result.upper, 104.19232267008711, 1e-7);
  });

  it("degenerates to a point interval when sample SD is zero", () => {
    const result = confidenceInterval([100, 100, 100, 100, 100, 100], 0.95);

    assert.equal(result.sd, 0);
    assert.equal(result.marginOfError, 0);
    assert.equal(result.lower, 100);
    assert.equal(result.upper, 100);
  });

  it("rejects invalid confidence interval inputs", () => {
    assert.throws(() => confidenceInterval([100], 0.95), /at least two/);
    assert.throws(() => confidenceInterval([100, Number.NaN], 0.95), /finite numeric/);
    assert.throws(() => confidenceInterval([100, 101], 1), /between 0 and 1/);
  });

  it("widens intervals when confidence level or interval purpose increases", () => {
    const values = [96, 98, 101, 102, 105, 107];
    const ci90 = confidenceInterval(values, 0.9);
    const ci99 = confidenceInterval(values, 0.99);
    const pi95 = predictionInterval(values, 0.95);
    const ci95 = confidenceInterval(values, 0.95);

    assert.ok(tCritical(0.99, 5) > tCritical(0.9, 5));
    assert.ok(ci99.upper - ci99.lower > ci90.upper - ci90.lower);
    assert.ok(pi95.upper - pi95.lower > ci95.upper - ci95.lower);
  });

  it("classifies CI and specification relationships without making pass/fail claims", () => {
    assert.equal(classifyIntervalAgainstSpecification(96, 104, 95, 105), "supports-acceptance");
    assert.equal(classifyIntervalAgainstSpecification(94, 104, 95, 105), "inconclusive");
    assert.equal(
      classifyIntervalAgainstSpecification(108, 112, 95, 105),
      "supports-non-acceptance",
    );
  });
});
