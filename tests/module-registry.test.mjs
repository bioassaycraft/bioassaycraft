import { describe, expect, it } from "vitest";
import { getFeaturedModules, getModules } from "../src/config/modules.js";

describe("module registry", () => {
  it("uses one ordered source for mobile featured modules", () => {
    expect(getFeaturedModules("explore").map((module) => module.id)).toEqual([
      "anova-explorer",
      "ci-explorer",
      "residual-explorer",
      "validation-explorer",
    ]);
    expect(getFeaturedModules("tools")).toHaveLength(4);
    const oosModule = getModules("tools").find((module) => module.id === "oos-risk-explorer");
    expect(oosModule).toMatchObject({ status: "planned" });
    expect(oosModule).not.toHaveProperty("route");
  });

  it("keeps every listed ready module routable and planned modules disabled", () => {
    for (const module of [...getModules("explore"), ...getModules("tools")]) {
      expect(module.status === "ready" ? Boolean(module.route) : module.route === undefined).toBe(
        true,
      );
      expect(module.category).toBeTruthy();
    }
    const sampleSizeModule = getModules("tools").find(
      (module) => module.id === "validation-sample-size",
    );
    expect(sampleSizeModule).toMatchObject({ status: "planned" });
    expect(sampleSizeModule).not.toHaveProperty("route");
    const validationSimulator = getModules("tools").find(
      (module) => module.id === "validation-simulator",
    );
    expect(validationSimulator).toMatchObject({ status: "planned" });
    expect(validationSimulator).not.toHaveProperty("route");
  });
});
