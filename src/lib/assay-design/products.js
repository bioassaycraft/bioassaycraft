import { canonicalTargetKey } from "../target-to-assay/target-aliases.js";

const verifiedOn = "2026-11-14";

// Normalized snapshots of official product detail pages. No price is inferred
// from the SKU, and the product construct is retained in the displayed name.
const protein = (vendor, sku, name, url, target, species, tags, accession, range, host, variants) =>
  ({ vendor, sku, name, url, targets: [target], species, tags, accession, range, host, variants, verifiedOn });
const detector = (vendor, sku, name, url, region, species, label, variants) =>
  ({ vendor, sku, name, url, region, species, label, variants, verifiedOn });
const sa = (vendor, sku, name, url, variants) =>
  detector(vendor, sku, name, url, "SA-HRP", null, "HRP", variants);

// Common categories from ACRO protein catalogs and Sino Biological's protein tag guide.
export const proteinSpecies = Object.freeze([
  "Human", "Mouse", "Rat", "Cynomolgus", "Rhesus macaque", "Rabbit", "Hamster",
  "Canine", "Feline", "Bovine", "Porcine", "Ovine", "Caprine", "Chicken", "Zebrafish",
]);
export const proteinTags = Object.freeze([
  "His-tag", "Fc-tag", "Avi-tag", "Flag-tag", "Strep-tag", "GST-tag", "MBP-tag",
  "SUMO-tag", "Trx-tag", "HA-tag", "Myc-tag", "GFP-tag", "Tag-free",
]);

const suppliers = [
  { vendor: "ACROBiosystems", proteins: [
    { ...protein("ACROBiosystems", "CDE-H5223", "Human CD3 epsilon Protein (His; dimer)",
      "https://www.acrobiosystems.cn/products/protein/cd3-epsilon-human-cde-h5223", "CD3E",
      "Human", ["His-tag"], "P07766-1", "Asp 23–Asp 126", "HEK293",
      [{ size: "100 µg", price: "CNY 3,675" }, { size: "1 mg (4 × 250 µg)", price: "CNY 22,890" }]), componentsOf: ["CD3"] },
    { ...protein("ACROBiosystems", "CD9-H52H2", "Human CD19 (20–291) Protein (His)",
      "https://www.acrobiosystems.cn/products/protein/cd19-human-cd9-h52h2", "CD19",
      "Human", ["His-tag"], "P15391-1", "Pro 20–Lys 291", "HEK293"),
      variants: [{ size: "50 µg", price: "CNY 3,695" }, { size: "500 µg", price: "CNY 24,370" }] },

    protein("ACROBiosystems", "CD0-H82D3", "Biotinylated Human CD20 Full Length Protein (Flag, His, Avi; Nanodisc-pro)",
      "https://www.acrobiosystems.cn/products/protein/cd20-human-cd0-h82d3", "MS4A1",
      "Human", ["Flag-tag", "His-tag", "Avi-tag"], "P11836-1", "Met 1–Pro 297", "HEK293",
      [{ size: "20 µg", price: "CNY 7,283" }, { size: "100 µg", price: "CNY 12,995" }]),
    protein("ACROBiosystems", "CD0-H52H3", "Human CD20 Full Length Protein (His; Detergent)",
      "https://acrobiosystems.cn/products/protein/cd20-human-cd0-h52h3", "MS4A1",
      "Human", ["His-tag"], "P11836-1", "Met 1–Pro 297", "HEK293",
      [{ size: "20 µg", price: "CNY 8,190" }, { size: "100 µg", price: "CNY 30,450" }, { size: "500 µg", quote: true }]),
    protein("ACROBiosystems", "CD0-H52H1", "Human CD20 Full Length Protein (His; Nanodisc)",
      "https://www.acrobiosystems.cn/products/protein/cd20-human-cd0-h52h1", "MS4A1",
      "Human", ["His-tag"], "P11836-1", "Met 1–Pro 297", "HEK293"),
    protein("ACROBiosystems", "CD0-C82E4", "Biotinylated Cynomolgus CD20 Full Length Protein (His, Avi; Nanodisc)",
      "https://www.acrobiosystems.cn/products/protein/cd20-cynomolgus-cd0-c82e4", "MS4A1",
      "Cynomolgus", ["His-tag", "Avi-tag"], "M4ZHZ6-1", "Met 1–Pro 297", "HEK293",
      [{ size: "20 µg", price: "CNY 7,283" }, { size: "100 µg", price: "CNY 12,995" }]),
    protein("ACROBiosystems", "CD0-C52H8", "Cynomolgus CD20 Full Length Protein (His; Detergent)",
      "https://www.acrobiosystems.cn/products/protein/cd20-cynomolgus-cd0-c52h8", "MS4A1",
      "Cynomolgus", ["His-tag"], "M4ZHZ6-1", "Met 1–Pro 297", "HEK293",
      [{ size: "20 µg", price: "CNY 8,190" }, { size: "100 µg", price: "CNY 30,450" }, { size: "500 µg", quote: true }]),
    protein("ACROBiosystems", "CD0-HF2H5", "FITC-Labeled Human CD20 Full Length Protein (His; Nanodisc)",
      "https://www.acrobiosystems.cn/products/protein/cd20-human-cd0-hf2h5", "MS4A1",
      "Human", ["His-tag"], "P11836-1", "Met 1–Pro 297", "HEK293",
      [{ size: "20 µg", price: "CNY 19,950" }, { size: "100 µg", price: "CNY 59,850" }]),
    protein("ACROBiosystems", "CD0-CF2H3", "FITC-Labeled Cynomolgus CD20 Full Length Protein (His; Nanodisc)",
      "https://www.acrobiosystems.cn/products/protein/cd20-cynomolgus-cd0-cf2h3", "MS4A1",
      "Cynomolgus", ["His-tag"], "M4ZHZ6-1", "Met 1–Pro 297", "HEK293",
      [{ size: "20 µg", price: "CNY 14,700" }, { size: "100 µg", price: "CNY 54,600" }]),
    protein("ACROBiosystems", "CD0-C82E3", "Biotinylated Cynomolgus CD20 Full Length Protein (His, Avi; Detergent)",
      "https://www.acrobiosystems.com/products/protein/cd20-cynomolgus-cd0-c82e3", "MS4A1",
      "Cynomolgus", ["His-tag", "Avi-tag"], "M4ZHZ6-1", "Met 1–Pro 297", "HEK293"),
  ], detectors: [
    sa("ACROBiosystems", "STN-NH113", "Streptavidin Protein-HRP, ultra sensitivity",
      "https://fr.acrobiosystems.com/products/protein/streptavidin-streptomyces-avidinii-stn-nh113"),
  ] },
  { vendor: "Sino Biological", proteins: [
    protein("Sino Biological", "11007-H08H-VP", "Human CD20 Full Length Protein (Fluorescent VLP; His)",
      "https://www.sinobiological.com/recombinant-proteins/human-cd20-11007-h08h-vp", "MS4A1",
      "Human", ["His-tag"], "P11836", "Met 1–Pro 297", "HEK293"),

    { ...protein("Sino Biological", "10977-H08H-UE", "Human CD3 epsilon Protein (ECD, His, Endotoxin-Free)",
      "https://cn.sinobiological.com/recombinant-proteins/human-cd3-epsilon-cd3e-10977-h08h-ue", "CD3E",
      "Human", ["His-tag"], "NP_000724.1", "Met 1–Asp 126"),
      componentsOf: ["CD3"] },
    protein("Sino Biological", "11880-H02H", "Human CD19 Protein (ECD, hFc)",
      "https://cn.sinobiological.com/recombinant-proteins/human-cd19-11880-h02h", "CD19",
      "Human", ["Fc-tag"], "NP_001171569.1", "Met 1–Lys 291", "HEK293"),
    protein("Sino Biological", "50510-M08H", "Mouse CD19 Protein (ECD, His)",
      "https://fr.sinobiological.com/recombinant-proteins/mouse-cd19-50510-m08h", "CD19",
      "Mouse", ["His-tag"], "NP_033974.2", "Met 1–Gly 287", "HEK293"),
  ], detectors: [
    detector("Sino Biological", "SSA001", "Goat Anti-Human IgG-Fc Secondary Antibody (HRP)",
      "https://cn.sinobiological.com/antibodies/secondary-antibody-goat-anti-human-igg-fc-ssa001", "Fc", "Human", "HRP"),
  ] },
  { vendor: "GenScript", detectors: [
    sa("GenScript", "M00091", "Streptavidin-HRP", "https://www.genscript.com.cn/molecule/M00091-Streptavidin_HRP.html",
      [{ size: "1 mg", price: "CNY 890" }]),
  ] },
  { vendor: "Abcam", detectors: [
    detector("Abcam", "ab97225", "Goat Anti-Human IgG Fc (HRP)",
      "https://www.abcam.cn/products/secondary-antibodies/goat-human-igg-fc-hrp-ab97225", "Fc", "Human", "HRP"),
    detector("Abcam", "ab97044", "Rabbit Anti-Mouse IgG H&L (Biotin)",
      "https://www.abcam.cn/products/secondary-antibodies/rabbit-mouse-igg-h-l-biotin-ab97044", "H+L", "Mouse", "Biotin"),
    sa("Abcam", "ab7403", "Streptavidin (HRP)",
      "https://www.abcam.cn/products/proteins-peptides/streptavidin-hrp-ab7403"),
  ] },
  { vendor: "Solarbio", detectors: [
    sa("Solarbio", "SE068", "Streptavidin/HRP", "https://www.solarbio.com/goodsInfo?id=1656",
      [{ size: "0.1 mL", quote: true }, { size: "1 mL", quote: true }]),
  ] },
];

export function mergeProducts(rows) {
  const products = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.vendor.toLowerCase(), row.sku.toLowerCase()]);
    const previous = products.get(key);
    const variants = new Map();
    for (const variant of [...(previous?.variants || []), ...(row.variants || [])]) {
      const size = variant.size;
      if (!size) continue;
      if (!variants.has(size) || variant.price) variants.set(size, variant);
    }
    const merged = { ...(previous || row), variants: [...variants.values()] };
    if (previous?.live && row.live) {
      // A conflicting construct must never contribute fields to another record.
      const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (["accession", "range", "species"].some((field) => previous[field] && row[field] &&
          normalize(previous[field]) !== normalize(row[field]))) continue;
      merged.fieldSources = { ...previous.fieldSources };
      for (const field of ["name", "url", "species", "tags", "accession", "range", "host"]) {
        if ((!merged[field] || merged[field].length === 0) && row[field]?.length) {
          merged[field] = row[field];
          if (row.fieldSources?.[field]) merged.fieldSources[field] = row.fieldSources[field];
        }
      }
      merged.sources = [...new Map([...previous.sources || [], ...row.sources || []]
        .map((source) => [source.url, source])).values()];
      merged.validation = [...new Set([...(previous.validation || []), ...(row.validation || [])])];
    }
    products.set(key, merged);
  }
  return [...products.values()];
}

export const proteinSuppliers = suppliers.filter(({ proteins }) => proteins).map(({ vendor }) => vendor);

export function proteinCatalogLinks(targetId) {
  return canonicalTargetKey(targetId) === canonicalTargetKey("CD20")
    ? [{ vendor: "ACROBiosystems", url: "https://acrobiosystems.cn/category/target-protein/cd20" }]
    : [];
}

export function proteinProducts(targetId) {
  const key = canonicalTargetKey(targetId);
  return mergeProducts(suppliers.flatMap(({ proteins = [] }) => proteins).flatMap((row) => {
    if (row.targets.some((id) => canonicalTargetKey(id) === key)) return [row];
    return row.componentsOf?.some((id) => canonicalTargetKey(id) === key) ? [{ ...row, componentOnly: true }] : [];
  }));
}

export const detectors = mergeProducts(suppliers.flatMap((supplier) => supplier.detectors));

export function filterProducts(rows, { species, tag, region, label } = {}) {
  return rows.filter((row) => {
    if (region === "SA-HRP") return row.region === "SA-HRP";
    return (!species || row.species === species) && (!tag || row.tags?.includes(tag)) &&
      (!region || row.region === region) && (!label || row.label === label);
  });
}
