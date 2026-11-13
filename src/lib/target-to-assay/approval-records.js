import { ingredientKey } from "./display.js";

export function validApprovalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value <= "1900-01-01")
    return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

// FDA CBER original approval letters cover cellular products not consistently returned by Drugs@FDA.
const cber = {
  tisagenlecleucel: ["kymriah", "125646", "2017-08-30"],
  "axicabtagene ciloleucel": ["yescarta", "125643", "2017-10-18"],
  "brexucabtagene autoleucel": ["tecartus", "125703", "2020-07-24"],
  "lisocabtagene maraleucel": ["breyanzi", "125714", "2021-02-05"],
  "obecabtagene autoleucel": ["aucatzyl", "125813", "2024-11-08"],
};
const reviewedAntibodies = {
  inebilizumab: ["Uplizna", "761142", "2020-06-11"],
  tafasitamab: ["Monjuvi", "761163", "2020-07-31"],
};

export function reviewedFdaRecord(drug) {
  const ingredient = ingredientKey(drug.name);
  if (ingredient === "tarlatamab") return {
    region: "US", date: "2024-05-16", application: "BLA761344", brand: "Imdelltra",
    type: "bispecific", developer: "Amgen Inc.",
    approvedIndication: {
      en: "Extensive-stage small cell lung cancer progressing on or after platinum-based chemotherapy",
      zh: "在含铂化疗期间或之后进展的广泛期小细胞肺癌",
    },
    indicationUrl: "https://www.fda.gov/drugs/cancer-approvals/fda-grants-traditional-approval-tarlatamab-dlle-extensive-stage-small-cell-lung-cancer",
    url: "https://www.accessdata.fda.gov/scripts/purplebooksearch/index.cfm?blaNo=761344&event=productdetails",
    documents: [
      {
        title: "Product Quality Review · BLA761344 · Original Application",
        submissionType: "ORIG", approvedAt: "2024-05-16",
        url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/761344Orig1s000ChemR.pdf",
      },
      // FDA's filename contains a different number; the PDF cover identifies 761344Orig1s001.
      {
        title: "Multidisciplinary Review · BLA761344 · Supplement 1",
        submissionType: "SUPPL", submissionNumber: "1", approvedAt: "2025-11-19",
        url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2026/763144Orig1s001.pdf",
      },
    ],
  };
  const cellular = Object.hasOwn(cber, ingredient);
  const item = cellular
    ? cber[ingredient]
    : Object.hasOwn(reviewedAntibodies, ingredient) && reviewedAntibodies[ingredient];
  if (!item) return null;
  const [brand, number, date] = item;
  return {
    region: "US",
    date,
    application: "BLA" + number,
    brand,
    type: cellular ? "car_t" : "monoclonal",
    url: cellular
      ? "https://www.fda.gov/vaccines-blood-biologics/cellular-gene-therapy-products/" + brand
      : "https://purplebooksearch.fda.gov/index.cfm?event=productdetails&blaNo=" + number,
  };
}

const emaUrl =
  "https://www.ema.europa.eu/en/documents/report/medicines-output-medicines_json-report_en.json";
let emaCache;
export async function fetchEmaApprovals(names, { fetcher = fetch, signal } = {}) {
  if (!emaCache || emaCache.expires < Date.now() || fetcher !== fetch) {
    const response = await fetcher(emaUrl, { redirect: "manual", signal });
    if (!response.ok) throw new Error("ema_unavailable");
    const payload = await response.json();
    if (!Array.isArray(payload.data)) throw new Error("ema_invalid_response");
    const rows = payload.data.filter(
      (row) =>
        row.category === "Human" &&
        ["Authorised", "Withdrawn", "Suspended"].includes(row.medicine_status) &&
        /^https:\/\/www\.ema\.europa\.eu\/en\/medicines\/human\/EPAR\/[a-z0-9-]+$/i.test(
          row.medicine_url,
        ),
    );
    if (fetcher === fetch) emaCache = { rows, expires: Date.now() + 3600000 };
    return matchEmaApprovals(names, rows);
  }
  return matchEmaApprovals(names, emaCache.rows);
}

const plainText = (value) => typeof value === "string"
  ? value.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim()
  : "";

function matchEmaApprovals(names, rows) {
  const results = Object.create(null);
  for (const name of names) {
    const ingredient = ingredientKey(name);
    const matching = rows.flatMap((row) => {
      const substance = row.active_substance || "";
      const parenthetical = substance.match(/\(([^()]+)\)\s*$/)?.[1] || "";
      const inn = substance.trim() ? "" : row.international_non_proprietary_name_common_name || "";
      if (![substance, parenthetical, inn].some((value) => ingredientKey(value) === ingredient))
        return [];
      const date = row.marketing_authorisation_date?.split("/").reverse().join("-");
      if (!validApprovalDate(date)) return [];
      const authorised = row.medicine_status === "Authorised";
      return [{
        region: "EU", date, url: row.medicine_url, status: row.medicine_status,
        ...(authorised && {
          holder: plainText(row.marketing_authorisation_developer_applicant_holder),
          indication: plainText(row.therapeutic_indication),
          brand: plainText(row.name_of_medicine),
        }),
      }];
    });
    const selected = matching.sort(
      (a, b) =>
        Number(b.status === "Authorised") - Number(a.status === "Authorised") ||
        a.date.localeCompare(b.date) ||
        a.url.localeCompare(b.url),
    )[0];
    if (selected) results[name] = selected;
  }
  return results;
}
