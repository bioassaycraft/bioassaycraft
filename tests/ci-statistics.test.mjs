import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  confidenceInterval,
  createFixedPopulation,
  cv,
  geometricCV,
  geometricMean,
  mean,
  predictionInterval,
  samplePopulation,
  sd,
  tCritical,
} from "../src/lib/ci/statistics.ts";

describe("ci statistics", () => {
  it("calculates sample summaries", () => {
    const values = [100, 102, 98, 93, 88, 105];

    assert.equal(mean(values), 97.66666666666667);
    assert.ok(Math.abs(sd(values) - 6.21825270205921) < 1e-12);
    assert.ok(Math.abs(cv(values) - 6.366811640333663) < 1e-12);
    assert.ok(Math.abs(geometricMean(values) - 97.49825911581524) < 1e-12);
    assert.ok(Math.abs(geometricCV(values) - 6.477834985814762) < 1e-12);
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

  it("returns a t-based confidence interval", () => {
    const result = confidenceInterval([100, 102, 98, 93, 88, 105], 0.95);

    assert.equal(result.df, 5);
    assert.ok(Math.abs(result.mean - 97.66666666666667) < 1e-12);
    assert.ok(result.critical > 2.5);
    assert.ok(result.lower < result.mean);
    assert.ok(result.upper > result.mean);
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
});
