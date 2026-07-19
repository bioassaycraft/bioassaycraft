import { canonicalUrl, site } from "./site.js";

const page = (path, title, description, options = {}) => ({
  path,
  title,
  description,
  index: true,
  type: "website",
  ...options,
});

export const seoPages = [
  page("/", "BioassayCraft | Bioassay reasoning, tools, and learning", "Interactive tools and learning modules for bioassay development, validation, and statistical reasoning."),
  page("/explore/", "Explore bioassay reasoning | BioassayCraft", "Interactive learning modules for understanding bioassay models, residuals, and statistical inference."),
  page("/tools/", "Bioassay tools | BioassayCraft", "Practical scientific tools for bioassay method development, validation, and data processing."),
  page("/learn/", "Bioassay learning | BioassayCraft", "Interactive pharmacopoeia learning for bioassay chapters, formulas, examples, and practice notes."),
  page("/journeys/", "Bioassay practice journeys | BioassayCraft", "Structured bioassay practice workflows for method development, validation, and data analysis."),
  page("/learn/anova-explorer/", "ANOVA Explorer | BioassayCraft", "Explore variance decomposition, model assumptions, and ANOVA decisions for bioassay data."),
  page("/learn/ci-explorer/", "Confidence Interval Explorer | BioassayCraft", "Understand confidence intervals, uncertainty, and statistical inference in bioassay results."),
  page("/learn/residual-explorer/", "Residual Explorer | BioassayCraft", "Explore residual distributions and model assumptions for bioassay models."),
  page("/tools/converter/", "Concentration Unit Converter | BioassayCraft", "Convert scientific concentration units for bioassay work."),
  page("/tools/cfd-calculator/", "CFD Critical Fold Difference Calculator | BioassayCraft", "Calculate critical fold difference from validation variance components."),
  page("/tools/specification-limit-calculator/", "Specification Limit Calculator | BioassayCraft", "Build a specification-limit calculation workflow for bioassay development."),
  page("/tools/oos-risk-explorer/", "OOS Risk Explorer | BioassayCraft", "Explore how bias, precision, and specification limits shape OOS probability."),
  page("/tools/validation-sample-size-calculator/", "Validation Sample Size Calculator | BioassayCraft", "Estimate validation sample size from accuracy, precision, confidence, and power assumptions."),
  page("/simulators/validation-simulator/", "Method Validation Simulator | BioassayCraft", "Explore procedure-based validation, method-based validation, and reportable-result risk."),
  page("/404.html", "Page not found | BioassayCraft", "The requested BioassayCraft page could not be found.", { index: false, type: "website" }),
];

export const seoPageByPath = new Map(seoPages.map((entry) => [entry.path, entry]));
export const getSeoPage = (path) => seoPageByPath.get(path);
export const getCanonicalUrl = (path) => canonicalUrl(path);
export const defaultSeoPage = seoPageByPath.get("/");
export const productionOrigin = site.origin;
