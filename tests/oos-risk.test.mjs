import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  biasToLog,
  calculateBaselineComparison,
  calculateOosRisk,
  calculateTailProbabilities,
  effectiveGcvFromReplication,
  findPrecisionBoundary,
  formatPercent,
  gcvToSigma,
  getDominantTail,
  normalCdf,
} from "../assets/js/lib/validation/oos-risk.js";

describe("OOS risk calculations", () => {
  it("calculates baseline risk, tail behavior, and precision boundaries", () => {
    assert.equal(biasToLog(0), 0);
    assert.ok(Math.abs(gcvToSigma(10) - Math.log(1.1)) < 1e-12);
    assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-7);

    const baseline = calculateOosRisk({
      lowerLimitPercent: 80,
      upperLimitPercent: 125,
      relativeBiasPercent: 0,
      gcvPercent: 10,
      useReplication: false,
    });

    const biased = calculateOosRisk({
      lowerLimitPercent: 80,
      upperLimitPercent: 125,
      relativeBiasPercent: 10,
      gcvPercent: 10,
      useReplication: false,
    });

    assert.ok(baseline.probability >= 0 && baseline.probability <= 1);
    assert.ok(biased.upperTail > baseline.upperTail);
    assert.ok(effectiveGcvFromReplication(10, 2, 2) < 10);
    assert.equal(getDominantTail(0.01, 0.02), "Upper");
    assert.equal(getDominantTail(0.02, 0.01), "Lower");
    assert.equal(getDominantTail(0.01, 0.0105, 0.001), "Balanced");
    assert.equal(formatPercent(0.01234, 2), "1.23%");

    const tails = calculateTailProbabilities({
      lowerLimitPercent: 80,
      upperLimitPercent: 125,
      relativeBiasPercent: 5,
      gcvPercent: 10,
    });
    assert.ok(Math.abs(tails.totalOosProbability - tails.result.probability) < 1e-12);

    const comparison = calculateBaselineComparison({
      lowerLimitPercent: 80,
      upperLimitPercent: 125,
      relativeBiasPercent: 5,
      gcvPercent: 10,
    });
    assert.ok(Number.isFinite(comparison.deltaPercentagePoints));

    const boundary = findPrecisionBoundary({
      lowerLimitPercent: 80,
      upperLimitPercent: 125,
      targetProbability: 0.01,
      biasSteps: 10,
    });

    assert.equal(boundary.length, 11);
    assert.ok(boundary.some((point) => point.gcvPercent !== null));
  });
});
