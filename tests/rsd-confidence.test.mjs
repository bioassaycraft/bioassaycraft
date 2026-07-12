import assert from "node:assert/strict";
import { describe, it } from "vitest";
import CdfLibWrapper from "cdflib_wasm";
import {
  calculateExactRsdCI,
  calculateMckayRsdCI,
  calculateNaiveRsdCI,
  calculateObservedRsd,
  calculateVangelRsdCI,
  getRsdRecommendation,
  validateRsdInput,
} from "../src/lib/ci/rsd-confidence.ts";

const closeTo = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const input = { n: 6, mean: 100, sd: 10, confidenceLevel: 0.95 };

describe("RSD confidence intervals", () => {
  it("validates inputs and observed RSD", () => {
    closeTo(calculateObservedRsd(100, 10), 0.1);
    assert.equal(calculateObservedRsd(0, 10), null);
    assert.equal(validateRsdInput({ ...input, n: 2.5 }).reason, "invalid-n");
    assert.equal(validateRsdInput({ ...input, sd: -1 }).reason, "invalid-sd");
  });

  it("uses correctly oriented chi-square endpoints for analytical methods", () => {
    const naive = calculateNaiveRsdCI(input);
    const mckay = calculateMckayRsdCI(input);
    const vangel = calculateVangelRsdCI(input);
    assert.equal(naive.status, "success");
    assert.equal(mckay.status, "success");
    assert.equal(vangel.status, "success");
    closeTo(naive.intermediateValues.k, 0.1);
    closeTo(naive.intermediateValues.uLow, 0.831211613486663, 1e-6);
    closeTo(naive.intermediateValues.uHigh, 12.832501994030023, 1e-6);
    assert.ok(naive.lower < naive.upper);
    assert.ok(mckay.lower < mckay.upper);
    assert.ok(vangel.lower < vangel.upper);
  });

  it("matches the NIST five-observation exact-method example", async () => {
    const library = new CdfLibWrapper({ compileSync: true });
    await library.compiled;
    const result = calculateExactRsdCI(
      { n: 5, mean: 312.6, sd: 13.9392, confidenceLevel: 0.95 },
      (t, df, delta) => library.cdftnc_1(df, delta, t),
    );
    // NIST Dataplot Coefficient of Variation Confidence Limits: [0.0267, 0.1287].
    assert.equal(result.status, "success");
    closeTo(result.lower, 0.0267, 2e-4);
    closeTo(result.upper, 0.1287, 2e-4);
    assert.ok(result.iterations > 0);
  });

  it("returns the full, correctly oriented exact-method calculation path", async () => {
    const library = new CdfLibWrapper({ compileSync: true });
    await library.compiled;
    const cdf = (t, df, delta) => library.cdftnc_1(df, delta, t);
    const result = calculateExactRsdCI(input, cdf);

    assert.equal(result.converged, true);
    assert.equal(result.degreesOfFreedom, 5);
    closeTo(result.sampleCv, 0.1);
    closeTo(result.observedT, Math.sqrt(6) * 100 / 10, 1e-8);
    closeTo(result.observedT, Math.sqrt(6) / (10 / 100), 1e-8);
    closeTo(result.deltaLower, 9.8295, 1e-3);
    closeTo(result.deltaUpper, 39.3538, 1e-3);
    assert.ok(result.deltaLower < result.deltaUpper);
    closeTo(cdf(result.observedT, result.degreesOfFreedom, result.deltaLower), 0.975, 1e-8);
    closeTo(cdf(result.observedT, result.degreesOfFreedom, result.deltaUpper), 0.025, 1e-8);
    closeTo(result.cvLower, Math.sqrt(6) / result.deltaUpper, 1e-10);
    closeTo(result.cvUpper, Math.sqrt(6) / result.deltaLower, 1e-10);
    assert.ok(result.cvLower < result.cvUpper);
    closeTo(result.lower, 0.06224, 1e-4);
    closeTo(result.upper, 0.2492, 1e-4);

    const ci90 = calculateExactRsdCI({ ...input, confidenceLevel: 0.9 }, cdf);
    assert.equal(ci90.degreesOfFreedom, result.degreesOfFreedom);
    closeTo(ci90.observedT, result.observedT, 1e-10);
    assert.notEqual(ci90.deltaLower, result.deltaLower);
    assert.notEqual(ci90.deltaUpper, result.deltaUpper);
    assert.ok(ci90.upper - ci90.lower < result.upper - result.lower);
  });

  it("returns an explicit non-convergence state without interval endpoints", () => {
    const result = calculateExactRsdCI(input, () => 0.5);
    assert.equal(result.converged, false);
    assert.equal(result.lower, null);
    assert.equal(result.upper, null);
    assert.ok(["unbounded", "no-bracket", "no-convergence"].includes(result.status));
  });

  it("applies recommendation boundaries", () => {
    assert.deepEqual(getRsdRecommendation({ ...input, mean: 0 }), { key: "not-recommended", stars: 1 });
    assert.deepEqual(getRsdRecommendation({ ...input, mean: 20 }), { key: "mean-unstable", stars: 2 });
    assert.deepEqual(getRsdRecommendation({ ...input, sd: 33 }), { key: "exact", stars: 3 });
    assert.deepEqual(getRsdRecommendation({ ...input, n: 9 }), { key: "exact-vangel", stars: 4 });
    assert.deepEqual(getRsdRecommendation({ ...input, n: 10 }), { key: "vangel", stars: 5 });
    assert.deepEqual(getRsdRecommendation({ ...input, n: 2 }), { key: "tiny-sample", stars: 2 });
  });
});
