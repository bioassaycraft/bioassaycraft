import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  concentrationUnits,
  convertConcentration,
  formatConcentrationNumber,
  getMolecularWeightInGramPerMol,
  requiresMolecularWeight,
} from "../src/lib/concentration/converter.js";

describe("concentration converter", () => {
  it("converts mass units without molecular weight", () => {
    const result = convertConcentration({
      value: 1,
      fromUnitKey: "ugmL",
      toUnitKey: "mgL",
    });

    assert.equal(result.ok, true);
    assert.equal(result.outputValue, 1);
    assert.equal(result.needsMolecularWeight, false);
  });

  it("converts molar units without molecular weight", () => {
    const result = convertConcentration({
      value: 1,
      fromUnitKey: "umolL",
      toUnitKey: "nmolL",
    });

    assert.equal(result.ok, true);
    assert.ok(Math.abs(result.outputValue - 1000) < 1e-9);
  });

  it("requires molecular weight for mass to molar conversion", () => {
    const missing = convertConcentration({
      value: 150,
      fromUnitKey: "ugmL",
      toUnitKey: "nmolL",
    });

    assert.equal(missing.ok, false);
    assert.equal(missing.needsMolecularWeight, true);
    assert.equal(missing.reasonKey, "missingMw");

    const converted = convertConcentration({
      value: 150,
      fromUnitKey: "ugmL",
      toUnitKey: "nmolL",
      molecularWeightValue: 150,
      molecularWeightUnitKey: "kda",
    });

    assert.equal(converted.ok, true);
    assert.ok(Math.abs(converted.outputValue - 1000) < 1e-9);
  });

  it("returns an empty-state result before a value is entered", () => {
    const result = convertConcentration({
      value: "",
      fromUnitKey: "ngmL",
      toUnitKey: "nmolL",
    });

    assert.equal(result.ok, false);
    assert.equal(result.reasonKey, "emptyValue");
  });

  it("handles molecular weight units and formatting", () => {
    assert.equal(getMolecularWeightInGramPerMol(150, "kda"), 150000);
    assert.equal(getMolecularWeightInGramPerMol(150000, "da"), 150000);
    assert.equal(getMolecularWeightInGramPerMol(150000, "gmol"), 150000);
    assert.equal(requiresMolecularWeight("mgL", "nmolL"), true);
    assert.equal(formatConcentrationNumber(0.000000123), "1.23e-7");
  });

  it("uses compact molar unit labels for the interface", () => {
    const labels = concentrationUnits
      .filter((unit) => unit.kind === "molar")
      .map((unit) => unit.label);

    assert.deepEqual(labels, ["M", "mM", "μM", "nM", "pM"]);
    assert.equal(concentrationUnits.find((unit) => unit.key === "nmolL").label, "nM");
    assert.notEqual(concentrationUnits.find((unit) => unit.key === "nmolL").label, "NM");
  });
});
