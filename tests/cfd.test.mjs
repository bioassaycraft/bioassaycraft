import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { calculateCfd, compareReportValues } from "../src/lib/cfd.js";

describe("CFD critical fold difference", () => {
  const inputs = { withinVariance: 0.04, betweenVariance: 0.01, independentMeasurements: 2, replicatesPerMeasurement: 3 };

  it("uses distinct, correct paired and unpaired formulas", () => {
    const unpaired = calculateCfd({ ...inputs, mode: "unpaired" });
    const paired = calculateCfd({ ...inputs, mode: "paired" });
    assert.equal(unpaired.ok, true);
    assert.equal(paired.ok, true);
    assert.ok(Math.abs(unpaired.vrr - 0.011666666666666667) < 1e-12);
    assert.ok(Math.abs(unpaired.cfd - Math.exp(2 * Math.sqrt(2 * unpaired.vrr))) < 1e-12);
    assert.ok(Math.abs(paired.cfd - Math.exp(2 * Math.sqrt(paired.vrr))) < 1e-12);
    assert.ok(unpaired.cfd > paired.cfd);
  });

  it("rejects invalid variance and repeat strategies", () => {
    assert.equal(calculateCfd({ ...inputs, withinVariance: -0.01 }).ok, false);
    assert.equal(calculateCfd({ ...inputs, independentMeasurements: 1.5 }).ok, false);
    assert.equal(calculateCfd({ ...inputs, replicatesPerMeasurement: 0 }).ok, false);
  });

  it("uses a strict greater-than comparison for report values", () => {
    assert.equal(compareReportValues(100, 113.1, 1.131).exceedsMethodUncertainty, false);
    assert.equal(compareReportValues(100, 113.11, 1.131).exceedsMethodUncertainty, true);
    assert.equal(compareReportValues(0, 100, 1.2).ok, false);
  });
});
