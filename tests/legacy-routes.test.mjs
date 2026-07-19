import { describe, expect, it } from "vitest";
import { getLegacyRedirect, getRedirectSearch } from "../src/config/legacy-routes.js";

describe("legacy path redirects", () => {
  it("maps each retired public path directly to its canonical replacement", () => {
    expect(getLegacyRedirect("/explore/")).toBe("/learn/");
    expect(getLegacyRedirect("/journeys")).toBe("/journey/");
    expect(getLegacyRedirect("/simulators/validation-simulator/")).toBe(
      "/tools/validation-simulator/",
    );
    expect(getLegacyRedirect("/app/anova-explorer/")).toBe("/learn/anova-explorer/");
    expect(getLegacyRedirect("/app/")).toBe("/");
  });

  it("retains one valid explorer state parameter and discards invalid or duplicate values", () => {
    expect(getRedirectSearch("/learn/anova-explorer/", "?model=sra")).toBe("?model=sra");
    expect(getRedirectSearch("/learn/ci-explorer/", "?section=applications")).toBe(
      "?section=applications",
    );
    expect(getRedirectSearch("/learn/ci-explorer/", "?section=advanced")).toBe(
      "?section=advanced",
    );
    expect(getRedirectSearch("/tools/converter/", "?source=campaign")).toBe("?source=campaign");
    expect(getRedirectSearch("/learn/anova-explorer/", "?model=sra&model=pla")).toBe("");
    expect(getRedirectSearch("/learn/ci-explorer/", "?section=&source=campaign")).toBe(
      "?source=campaign",
    );
  });
});
