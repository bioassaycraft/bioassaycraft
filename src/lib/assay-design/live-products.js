import { mergeProducts, proteinProducts, proteinSuppliers } from "./products.js";
import { canonicalTargetKey } from "../target-to-assay/target-aliases.js";

const sources = {
  ACROBiosystems: {
    origin: "https://www.acrobiosystems.cn",
    hosts: ["www.acrobiosystems.cn", "acrobiosystems.cn"],
    detail: /^\/products\/protein\/[a-z0-9-]+$/i,
  },
  "Sino Biological": {
    origin: "https://cn.sinobiological.com",
    hosts: ["cn.sinobiological.com"],
    detail: /^\/recombinant-proteins\/[a-z0-9-]+$/i,
  },
};

const plain = (html) => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&")
  .replace(/&#165;|&yen;/gi, "¥").replace(/&#956;|&mu;/gi, "μ").replace(/\s+/g, " ").trim();

function detailUrl(href, source) {
  try {
    const url = new URL(href, source.origin);
    if (url.protocol === "https:" && source.hosts.includes(url.hostname) && !url.port &&
        !url.username && !url.password && source.detail.test(url.pathname)) {
      return new URL(url.pathname, source.origin).href;
    }
  } catch { /* Ignore invalid links. */ }
  return null;
}

function aliasesFor(target) {
  const key = canonicalTargetKey(target);
  return key === "ms4a1" ? ["cd20", "ms4a1"] : [key];
}

function targetMatches(name, target) {
  const tokens = name.toLowerCase().split(/[^a-z0-9]+/);
  return aliasesFor(target).some((alias) => tokens.includes(alias) ||
    (alias === "cd3" && tokens.includes("cd3e")));
}

export function catalogDetails(html, target, vendor) {
  const source = sources[vendor];
  const urls = new Set();
  for (const [, href, title] of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = detailUrl(href, source);
    if (url && targetMatches(plain(title) + " " + new URL(url).pathname, target)) urls.add(url);
  }
  return [...urls];
}

const speciesPattern = /\b(Human|Mouse|Rat|Cynomolgus|Rhesus macaque|Rabbit|Hamster|Canine|Feline|Bovine|Porcine|Ovine|Caprine|Chicken|Zebrafish)\b/i;
const tagPatterns = {
  "His-tag": /\b(?:\d+x\s*)?His(?:\b|tag)|polyhistidine/i,
  "Avi-tag": /\bavi(?:\s*tag)?\b/i,
  "Fc-tag": /\b[hm]?Fc\b/i,
  "Flag-tag": /\bflag\b/i,
  "Strep-tag": /\bstrep\b/i,
  "GST-tag": /\bgst\b/i,
  "MBP-tag": /\bmbp\b/i,
  "SUMO-tag": /\bsumo\b/i,
  "Trx-tag": /\btrx(?:a)?\b/i,
  "HA-tag": /\bha\s*tag\b/i,
  "Myc-tag": /\bmyc\s*tag\b/i,
  "GFP-tag": /\bgfp\s*(?:tag|fusion)\b/i,
  "Tag-free": /\btag[ -]free\b/i,
};

function acroVariants(text, sku) {
  const escaped = sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}-(\\d+(?:\\.\\d+)?)\\s*(ug|μg|µg|mg|mL)(?:\\s*(\\([^)]{1,30}\\)))?\\s*(?:[¥￥]\\s*([\\d,]+(?:\\.\\d{2})?)|(询价))`, "gi");
  return [...text.matchAll(pattern)].map(([, amount, unit, pack, price, quote]) => ({
    size: `${amount} ${/g$/i.test(unit) && unit.toLowerCase() !== "mg" ? "µg" : unit}${pack ? " " + pack : ""}`,
    ...(price ? { price: "CNY " + price } : { quote: Boolean(quote) }),
  }));
}

export function readProteinDetail(html, url, target, vendor) {
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const name = heading ? plain(heading) : "";
  if (!targetMatches(name, target) || !/\bprotein\b|蛋白/i.test(name)) return null;
  const text = plain(html);
  const sku = vendor === "ACROBiosystems"
    ? text.match(/\b([A-Z0-9]{2,6}-[A-Z0-9]{3,9})-(?:\d+[.\d]*\s*(?:ug|μg|µg|mg|mL))/)?.[1]
    : text.match(/\bCat\s*:\s*([A-Z0-9]+(?:-[A-Z0-9]+)+)\b/i)?.[1];
  if (!sku || !new URL(url).pathname.toLowerCase().endsWith("-" + sku.toLowerCase())) return null;
  const species = name.match(speciesPattern)?.[1];
  const tags = Object.keys(tagPatterns).filter((tag) => tagPatterns[tag].test(name));
  const construct = text.match(/(?:contains AA |蛋白构建\s+)(.{0,400}?)(?=Predicted|Accession#\s|表达宿主|$)/i)?.[1] || "";
  const accession = construct.match(/(?:Accession\s*#\s*|\()((?:[A-Z]{1,3}_)?[A-Z0-9]{5,}(?:[.-]\d+)?)\b/)?.[1];
  const range = construct.match(/\b[A-Z][a-z]{2}\s*\d+\s*[-–]\s*[A-Z][a-z]{2}\s*\d+\b/)?.[0];
  return { vendor, sku, name, url, species, tags, accession, range,
    componentOnly: canonicalTargetKey(target) === "cd3" && /cd3\s*(?:epsilon|gamma|delta)|cd3e/i.test(name),
    variants: vendor === "ACROBiosystems" ? acroVariants(text, sku) : [],
    verifiedOn: new Date().toISOString().slice(0, 10),
  };
}

async function readPage(url, source, fetcher, signal) {
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    const response = await fetcher(current, { signal, redirect: "manual", headers: { Accept: "text/html" } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location && new URL(location, current);
      if (!next || next.protocol !== "https:" || !source.hosts.includes(next.hostname) ||
          next.port || next.username || next.password || next.pathname !== new URL(current).pathname) break;
      current = next.href;
      continue;
    }
    if (response.status === 403 || response.status === 429) throw new Error("access_denied");
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) break;
    const stream = response.body?.getReader();
    if (!stream) break;
    const decoder = new TextDecoder();
    let html = "";
    let size = 0;
    for (;;) {
      const { done, value } = await stream.read();
      if (done) return html + decoder.decode();
      size += value.byteLength;
      if (size > 2_000_000) {
        await stream.cancel();
        throw new Error("catalog_too_large");
      }
      html += decoder.decode(value, { stream: true });
    }
  }
  throw new Error("supplier_unavailable");
}

export const liveProteinVendors = proteinSuppliers.filter((vendor) => vendor in sources);

export async function queryLiveProteins(target, vendor, { signal, fetcher = fetch, offset = 0, renderPage }) {
  const source = sources[vendor];
  const seeds = proteinProducts(target).filter((row) => row.vendor === vendor)
    .map(({ url }) => detailUrl(new URL(url).pathname, source)).filter(Boolean);
  const acro = vendor === "ACROBiosystems";
  const slug = aliasesFor(target)[0];
  const acroEntry = slug === "cd20" ? "/category/recombinant-proteins/full-length-cd20-protein" : `/category/target-protein/${encodeURIComponent(slug)}`;
  const entry = acro ? source.origin + acroEntry : seeds[0];
  if (!entry) return { rows: [], state: "unsupported" };
  // Only render pages on the verified source whose plain HTML omits the product content.
  const render = acro ? renderPage : undefined;
  async function read(url, extract, selector) {
    const html = await readPage(url, source, fetcher, signal);
    const value = extract(html);
    if ((Array.isArray(value) ? value.length : value) || !render || signal.aborted) return value;
    return extract(await render(url, selector, signal));
  }
  const urls = new Set(seeds);
  let entryFailed = false;
  const issues = new Set();
  try {
    const links = await read(entry, (html) => catalogDetails(html, target, vendor), 'a[href*="/products/protein/"]');
    for (const url of links) urls.add(url);
  } catch (error) {
    entryFailed = true;
    if (error.message === "access_denied") issues.add("access_denied");
  }
  const batchSize = 12;
  const pending = [...urls].slice(offset, offset + batchSize);
  const rows = [];
  // Leave enough subrequests and wall time for both suppliers and avoid burst fetching.
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length && !signal.aborted) {
      const url = pending.shift();
      try {
        const row = await read(url, (html) => readProteinDetail(html, url, target, vendor), "h1");
        if (row) rows.push(row);
        else issues.add("unrecognized_page");
      } catch (error) {
        if (error.message === "access_denied") issues.add("access_denied");
      }
    }
  }));
  return { rows: mergeProducts(rows).sort((a, b) => a.sku.localeCompare(b.sku)),
    state: rows.length ? "partial" : entryFailed || urls.size ? "unavailable" : "unsupported",
    reason: signal.aborted ? "timeout" : issues.has("access_denied") ? "access_denied" :
      issues.has("unrecognized_page") ? "unrecognized_page" : undefined,
    nextOffset: offset + batchSize < Math.min(urls.size, 228) ? offset + batchSize : null };

}
