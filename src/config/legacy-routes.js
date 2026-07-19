const trailingSlash = (path) => (path.endsWith("/") ? path : `${path}/`);

export const legacyPathRedirects = new Map([
  ["/explore/", "/learn/"],
  ["/journeys/", "/journey/"],
  ["/simulators/validation-simulator/", "/tools/validation-simulator/"],
  ["/anova-explorer/", "/learn/anova-explorer/"],
  ["/ci-explorer/", "/learn/ci-explorer/"],
  ["/residual-explorer/", "/learn/residual-explorer/"],
  ["/converter/", "/tools/converter/"],
  ["/spec-limit/", "/tools/specification-limit-calculator/"],
  ["/explorer/anova/", "/learn/anova-explorer/"],
  ["/explorer/ci/", "/learn/ci-explorer/"],
  ["/explorer/residual/", "/learn/residual-explorer/"],
  ["/app/anova-explorer/", "/learn/anova-explorer/"],
  ["/app/ci-explorer/", "/learn/ci-explorer/"],
  ["/app/residual-explorer/", "/learn/residual-explorer/"],
  ["/app/", "/"],
]);

const allowedQueryValues = {
  "/learn/anova-explorer/": { model: new Set(["linear", "sra", "pla", "4pl"]) },
  "/learn/ci-explorer/": {
    section: new Set(["intuition", "applications", "questions", "advanced"]),
  },
};

export const getLegacyRedirect = (pathname) => legacyPathRedirects.get(trailingSlash(pathname));

export const getRedirectSearch = (targetPath, search) => {
  const allowed = allowedQueryValues[targetPath];
  const input = new URLSearchParams(search);
  const output = new URLSearchParams();
  for (const key of new Set(input.keys())) {
    const values = input.getAll(key);
    if (values.length !== 1 || !values[0]) continue;
    const acceptedValues = allowed?.[key];
    if (!acceptedValues || acceptedValues.has(values[0])) output.set(key, values[0]);
  }
  const result = output.toString();
  return result ? `?${result}` : "";
};
