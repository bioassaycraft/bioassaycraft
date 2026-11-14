export const targetNameKey = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();
const aliases = new Map([
  ["cd20", "MS4A1"],
  ["cd123", "IL3RA"],
  ["pd-l1", "CD274"],
  ["pd-1", "PDCD1"],
  ["pd1", "PDCD1"],
  ["bcma", "TNFRSF17"],
  ["b-cell maturation antigen", "TNFRSF17"],
  ["cd3 receptor", "CD3"],
  ["tl1a", "TNFSF15"],
  ["4-1bb", "TNFRSF9"],
]);
export const canonicalAlias = (value) => aliases.get(targetNameKey(value)) || value;
export const canonicalTargetKey = (value) => targetNameKey(canonicalAlias(value));

export function targetSearchAliases(value) {
  const key = canonicalTargetKey(value);
  return [...new Set([targetNameKey(value), key, ...[...aliases]
    .filter(([, canonical]) => targetNameKey(canonical) === key).map(([alias]) => alias)])].filter(Boolean);
}
