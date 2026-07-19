import { describe, expect, it } from "vitest";
import { readQueryViewState } from "../src/utils/query-view-state.js";

describe("query view state", () => {
  const sections = ["intuition", "applications", "questions"];

  it("uses the default when the query key is absent", () => {
    expect(readQueryViewState(undefined, sections, "intuition")).toEqual({
      value: "intuition",
      isInvalid: false,
    });
  });

  it("accepts only stable, exact query values", () => {
    expect(readQueryViewState("applications", sections, "intuition")).toEqual({
      value: "applications",
      isInvalid: false,
    });
    expect(readQueryViewState("Applications", sections, "intuition")).toEqual({
      value: "intuition",
      isInvalid: true,
    });
  });

  it("rejects empty and repeated query values", () => {
    expect(readQueryViewState("", sections, "intuition").isInvalid).toBe(true);
    expect(readQueryViewState(["intuition", "questions"], sections, "intuition").isInvalid).toBe(
      true,
    );
  });

  it("supports the specification calculator module identifiers", () => {
    expect(readQueryViewState("HCD", ["endotoxin", "HCD"], "endotoxin")).toEqual({
      value: "HCD",
      isInvalid: false,
    });
    expect(readQueryViewState("hcd", ["endotoxin", "HCD"], "endotoxin").isInvalid).toBe(true);
  });
});
