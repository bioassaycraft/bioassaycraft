import { describe, expect, it } from "vitest";
import { getCanonicalUrl, seoPages } from "../src/config/seo.js";
import { routes } from "../src/router.js";

describe("canonical site paths", () => {
  const canonicalPaths = [
    "/",
    "/learn/",
    "/tools/",
    "/journey/",
    "/learn/anova-explorer/",
    "/learn/ci-explorer/",
    "/learn/residual-explorer/",
    "/tools/converter/",
    "/tools/cfd-calculator/",
    "/tools/specification-limit-calculator/",
    "/tools/oos-risk-explorer/",
    "/tools/validation-sample-size-calculator/",
    "/tools/validation-simulator/",
  ];

  it("indexes each canonical public path exactly once", () => {
    expect(seoPages.filter((page) => page.index).map((page) => page.path)).toEqual(canonicalPaths);
    expect(new Set(seoPages.map((page) => page.path)).size).toBe(seoPages.length);
  });

  it("uses the canonical pathname without query state", () => {
    expect(getCanonicalUrl("/learn/anova-explorer/")).toBe(
      "https://bioassaycraft.com/learn/anova-explorer/",
    );
    expect(getCanonicalUrl("/learn/ci-explorer/")).toBe(
      "https://bioassaycraft.com/learn/ci-explorer/",
    );
  });

  it("serves the Learn and Tools index routes through Vue Router", () => {
    expect(routes.find((route) => route.path === "/learn/")).toBeTruthy();
    expect(routes.find((route) => route.path === "/tools/")).toBeTruthy();
    expect(routes.find((route) => route.path === "/explore/")).toBeFalsy();
  });
});
