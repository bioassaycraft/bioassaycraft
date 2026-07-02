import assert from "node:assert/strict";
import {
  calculateChp9401SampleSize,
  calculateLocalSensitivity,
  calculateOverallPassProbability,
  calculateRequiredN,
  calculateUspAccuracySampleSize,
  calculateUspPrecisionSampleSize,
  chiSquareQuantile,
  generateCapabilityEnvelope,
  generateFirstPassLadder,
  inverseTDistribution,
  normalQuantile,
  solveSupportedAccuracyCriterion,
  solveSupportedPrecisionCriterion,
} from "../assets/js/lib/validation/sample-size.js";

assert.ok(Math.abs(normalQuantile(0.5)) < 1e-9);
assert.ok(inverseTDistribution(0.975, 20) > 2);
assert.ok(chiSquareQuantile(0.95, 10) > 10);

const chp = calculateChp9401SampleSize({
  acrbPercent: 12,
  acovPercent: 12,
  confidenceLevel: 0.95,
  power: 0.95,
});

assert.equal(chp.n, 16);
assert.equal(chp.rows.at(-1).pass, true);

const uspAccuracy = calculateUspAccuracySampleSize({
  rbAcceptancePercent: 12,
  trueRbPercent: 1,
  trueGcvPercent: 7,
  confidenceLevel: 0.95,
  power: 0.95,
});

assert.equal(uspAccuracy.n, 8);
assert.equal(uspAccuracy.rows.at(-1).pass, true);

const uspPrecision = calculateUspPrecisionSampleSize({
  levels: 5,
  gcvAcceptancePercent: 11,
  trueGcvPercent: 7,
  confidenceLevel: 0.95,
  power: 0.8,
});

assert.ok(uspPrecision.n >= 2);
assert.ok(uspPrecision.perLevelPower >= 0.8);
assert.ok(calculateOverallPassProbability(0.95, 5) < 0.78);

assert.equal(
  calculateRequiredN({
    mode: "chp9401",
    acrbPercent: 12,
    acovPercent: 12,
    confidenceLevel: 0.95,
    power: 0.95,
  }).n,
  16,
);

const ladder = generateFirstPassLadder(chp);
assert.equal(ladder.firstAcceptableN, 16);
assert.equal(
  ladder.steps.some((step) => step.firstPass),
  true,
);

const supportedAccuracy = solveSupportedAccuracyCriterion({
  mode: "chp9401",
  completedN: 16,
  fixedPrecisionPercent: 12,
  confidenceLevel: 0.95,
  power: 0.95,
});
assert.ok(supportedAccuracy.value <= 12.1);
assert.ok(supportedAccuracy.value >= 11.5);

const supportedPrecision = solveSupportedPrecisionCriterion({
  mode: "chp9401",
  completedN: 16,
  fixedAccuracyPercent: 12,
  confidenceLevel: 0.95,
  power: 0.95,
});
assert.ok(supportedPrecision.value >= 11.9);
assert.ok(supportedPrecision.value <= 12.5);

const envelope = generateCapabilityEnvelope({
  mode: "chp9401",
  completedN: 16,
  confidenceLevel: 0.95,
  power: 0.95,
  accuracySteps: 4,
  precisionSteps: 4,
});
assert.equal(envelope.points.length, 25);
assert.equal(
  envelope.points.some((point) => point.supported),
  true,
);

const sensitivity = calculateLocalSensitivity({
  mode: "chp9401",
  acrbPercent: 12,
  acovPercent: 12,
  confidenceLevel: 0.95,
  power: 0.95,
});
assert.ok(sensitivity.mainDriver.label);

console.log("sample-size tests ok");
