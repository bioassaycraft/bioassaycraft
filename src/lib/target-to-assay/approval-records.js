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

function matchEmaApprovals(names, rows) {
  const results = Object.create(null);
  for (const name of names) {
    const ingredient = ingredientKey(name);
    const matching = rows.flatMap((row) => {
      const substance = row.active_substance || "";
      const parenthetical = substance.match(/\(([^()]+)\)\s*$/)?.[1] || "";
      if (![substance, parenthetical].some((value) => ingredientKey(value) === ingredient))
        return [];
      const date = row.marketing_authorisation_date?.split("/").reverse().join("-");
      if (!validApprovalDate(date)) return [];
      return [{ region: "EU", date, url: row.medicine_url, status: row.medicine_status }];
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
