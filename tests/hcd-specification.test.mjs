import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  calculateHcdSpecification,
  getHcdWhoLimit,
  hcdSafetyFactorOptions,
  hcdWhoLimitOptions,
} from "../src/lib/specification/hcd.js";

describe("HCD specification calculator", () => {
  it("converts the default WHO residual DNA limit to pg/mg for mg/dose", () => {
    const result = calculateHcdSpecification({
      whoLimitKey: "who10ng",
      maximumDose: 200,
      doseUnitKey: "mgDose",
      safetyFactorKey: "4",
    });

    assert.equal(result.ok, true);
    assert.equal(result.whoLimitPgPerDose, 10000);
    assert.ok(Math.abs(result.theoreticalLimit - 50) < 1e-9);
    assert.ok(Math.abs(result.internalSpecification - 12.5) < 1e-9);
  });

  it("uses body weight to convert mg/kg/dose into total mg/dose", () => {
    const result = calculateHcdSpecification({
      whoLimitKey: "who10ng",
      maximumDose: 10,
      doseUnitKey: "mgKgDose",
      bodyWeight: 70,
      safetyFactorKey: "2",
    });

    assert.equal(result.ok, true);
    assert.equal(result.totalDoseMg, 700);
    assert.ok(Math.abs(result.theoreticalLimit - 14.2857142857) < 1e-9);
    assert.ok(Math.abs(result.internalSpecification - 7.1428571429) < 1e-9);
  });

  it("does not support mL/dose while the target unit is pg/mg", () => {
    const result = calculateHcdSpecification({
      maximumDose: 2,
      doseUnitKey: "mLDose",
      bodyWeight: 70,
      safetyFactorKey: "4",
    });

    assert.equal(result.ok, false);
    assert.equal(result.reasonKey, "unsupportedDoseUnit");
    assert.equal(result.whoLimitPgPerDose, 10000);
  });

  it("supports custom WHO limits and safety factors", () => {
    assert.equal(getHcdWhoLimit("custom", 5), 5);

    const result = calculateHcdSpecification({
      whoLimitKey: "custom",
      customWhoLimitNgValue: 5,
      maximumDose: 100,
      doseUnitKey: "mgDose",
      safetyFactorKey: "custom",
      customSafetyFactorValue: 5,
    });

    assert.equal(result.ok, true);
    assert.equal(result.whoLimitPgPerDose, 5000);
    assert.ok(Math.abs(result.internalSpecification - 10) < 1e-9);
  });

  it("keeps HCD parameters in configuration objects", () => {
    assert.deepEqual(
      hcdWhoLimitOptions.map((option) => option.key),
      ["who10ng", "custom"],
    );
    assert.deepEqual(
      hcdSafetyFactorOptions.map((option) => option.key),
      ["1", "2", "3", "4", "5", "10", "custom"],
    );
  });
});
