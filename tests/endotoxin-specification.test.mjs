import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  calculateEndotoxinSpecification,
  calculateMaximumDosePerKgHour,
  endotoxinDoseUnitOptions,
  endotoxinRouteOptions,
  endotoxinSafetyFactorOptions,
  formatEndotoxinNumber,
} from "../src/lib/specification/endotoxin.js";

describe("endotoxin specification calculator", () => {
  it("derives one internal EU/mg specification from the pharmacopeial limit", () => {
    const result = calculateEndotoxinSpecification({
      routeKey: "nonIntrathecal",
      maximumDose: 200,
      doseUnitKey: "mgDose",
      bodyWeight: 70,
      hourlyAdministration: 1,
      productConcentration: 100,
      safetyFactorKey: "4",
    });

    assert.equal(result.ok, true);
    assert.ok(Math.abs(result.maximumDoseResult.maximumDosePerKgHour - 2.857142857) < 1e-9);
    assert.ok(Math.abs(result.pharmacopeialLimit - 1.75) < 1e-9);
    assert.ok(Math.abs(result.internalSpecification - 0.4375) < 1e-9);
    assert.ok(Math.abs(result.equivalentSpecification - 43.75) < 1e-9);
  });

  it("uses mg/kg/dose without body weight", () => {
    const result = calculateEndotoxinSpecification({
      routeKey: "intrathecal",
      maximumDose: 0.4,
      doseUnitKey: "mgKgDose",
      bodyWeight: "",
      hourlyAdministration: 2,
      safetyFactorKey: "2",
    });

    assert.equal(result.ok, true);
    assert.ok(Math.abs(result.maximumDoseResult.maximumDosePerKgHour - 0.8) < 1e-9);
    assert.ok(Math.abs(result.pharmacopeialLimit - 0.25) < 1e-9);
    assert.ok(Math.abs(result.internalSpecification - 0.125) < 1e-9);
    assert.equal(result.equivalentSpecification, null);
  });

  it("requires product concentration before converting mL/dose to mg/kg/hour", () => {
    const missingConcentration = calculateMaximumDosePerKgHour({
      maximumDose: 10,
      doseUnitKey: "mLDose",
      bodyWeight: 50,
      hourlyAdministration: 1,
      productConcentration: "",
    });

    assert.equal(missingConcentration.ok, false);
    assert.equal(missingConcentration.reasonKey, "missingConcentration");

    const converted = calculateEndotoxinSpecification({
      routeKey: "nonIntrathecal",
      maximumDose: 10,
      doseUnitKey: "mLDose",
      bodyWeight: 50,
      hourlyAdministration: 1,
      productConcentration: 20,
      safetyFactorKey: "5",
    });

    assert.equal(converted.ok, true);
    assert.ok(Math.abs(converted.maximumDoseResult.maximumDosePerKgHour - 4) < 1e-9);
    assert.ok(Math.abs(converted.internalSpecification - 0.25) < 1e-9);
    assert.ok(Math.abs(converted.equivalentSpecification - 5) < 1e-9);
  });

  it("supports custom route threshold and custom safety factor", () => {
    const result = calculateEndotoxinSpecification({
      routeKey: "custom",
      customThresholdValue: 3,
      maximumDose: 60,
      doseUnitKey: "mgDose",
      bodyWeight: 60,
      hourlyAdministration: 1,
      safetyFactorKey: "custom",
      customSafetyFactorValue: 3,
    });

    assert.equal(result.ok, true);
    assert.ok(Math.abs(result.pharmacopeialLimit - 3) < 1e-9);
    assert.ok(Math.abs(result.internalSpecification - 1) < 1e-9);
  });

  it("keeps calculator options in configuration objects", () => {
    assert.deepEqual(
      endotoxinRouteOptions.map((route) => route.key),
      ["nonIntrathecal", "intrathecal", "custom"],
    );
    assert.deepEqual(
      endotoxinDoseUnitOptions.map((unit) => unit.key),
      ["mgDose", "mgKgDose", "mLDose"],
    );
    assert.deepEqual(
      endotoxinSafetyFactorOptions.map((factor) => factor.key),
      ["1", "2", "3", "4", "5", "10", "custom"],
    );
    assert.equal(formatEndotoxinNumber(0.0000123), "1.23e-5");
  });
});
