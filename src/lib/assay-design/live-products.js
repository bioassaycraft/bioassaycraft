import { materialUrl, publicMaterials, readDatasheet } from "./official-materials.js";
import { mergeProducts, proteinProducts, proteinSuppliers } from "./products.js";
import { canonicalTargetKey, targetSearchAliases } from "../target-to-assay/target-aliases.js";

const sources = {
  ACROBiosystems: {
    origin: "https://www.acrobiosystems.cn",
    hosts: ["www.acrobiosystems.cn", "acrobiosystems.cn"],
    catalog: /^\/category\/target-protein\/[a-z0-9-]+\/?$/i,
    detail: /^\/products\/protein\/[a-z0-9-]+\/?$/i,
  },
  "Sino Biological": {
    origin: "https://cn.sinobiological.com",
    hosts: ["cn.sinobiological.com"],
    catalog: /^\/molecule\/[a-z0-9-]+\/?$/i,
    detail: /^\/recombinant-proteins\/[a-z0-9-]+\/?$/i,
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
      return new URL(url.pathname.replace(/\/$/, ""), source.origin).href;
    }
  } catch { /* Ignore invalid links. */ }
  return null;
}

function targetMatches(name, target) {
  const words = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const title = ` ${words(name)} `;
  return targetSearchAliases(target).some((alias) => title.includes(` ${words(alias)} `)) ||
    (canonicalTargetKey(target) === "cd3" && /\bcd3e\b/i.test(name));
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

function listedVariants(text, sku) {
  const escaped = sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}-(\\d+(?:\\.\\d+)?)\\s*(ug|μg|µg|mg|mL)(?:\\s*(\\([^)]{1,30}\\)))?\\s*(?:[¥￥]\\s*([\\d,]+(?:\\.\\d{2})?)|(询价))`, "gi");
  return [...text.matchAll(pattern)].map(([, amount, unit, pack, price, quote]) => ({
    size: `${amount} ${/g$/i.test(unit) && unit.toLowerCase() !== "mg" ? "µg" : unit}${pack ? " " + pack : ""}`,
    ...(price ? { price: "CNY " + price } : { quote: Boolean(quote) }),
  }));
}

function structuredProduct(html) {
  for (const [, body] of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(body);
      const product = [data, ...[data["@graph"], data].filter(Array.isArray).flat()]
        .find((row) => [row?.["@type"]].flat().includes("Product"));
      if (product) return product;
    } catch { /* HTML fields remain usable. */ }
  }
  return {};
}

export function readProteinDetail(html, url, target, vendor) {
  const product = structuredProduct(html);
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const name = plain(typeof product.name === "string" ? product.name : heading || "");
  if (!targetMatches(name, target) || !/\bprotein\b|蛋白/i.test(name)) return null;
  const text = plain(html);
  const sku = [
    product.sku,
    text.match(/\b(?:Cat(?:alog)?\.?\s*(?:No\.?)?|货号)\s*[:：]\s*([A-Z0-9]+(?:-[A-Z0-9]+)+)\b/i)?.[1],
    ...[...text.matchAll(/\b([A-Z0-9]{2,8}(?:-[A-Z0-9]{2,12})+?)-(?:\d+(?:\.\d+)?\s*(?:ug|μg|µg|mg|mL))/gi)].map((match) => match[1]),
  ].find((value) => typeof value === "string" && new URL(url).pathname.toLowerCase().replace(/\/$/, "").endsWith("-" + value.toLowerCase()));
  if (!sku) return null;
  return productRecord({ name, sku, url, target, vendor, text, product,
    evidenceText: html.replace(/<\/h[1-6]>/gi, "\n").replace(/<[^>]*>/g, "") });
}

function productRecord({ name, sku, url, target, vendor, text, product = {}, kind = "detail",
  sourceUrl = url, evidenceText = "", version }) {
  const property = (pattern) => Array.isArray(product.additionalProperty)
    ? product.additionalProperty.find((item) => pattern.test(item?.name || "") && typeof item.value === "string")?.value
    : undefined;
  const species = (property(/^(species|种属)$/i) || name).match(speciesPattern)?.[1];
  const tags = Object.keys(tagPatterns).filter((tag) => tagPatterns[tag].test(property(/^(tags?|标签)$/i) || name));
  const construct = text.match(/(?:contains AA |(?:蛋白构建|Protein Construction)\s+)(.{0,420}?)(?=Predicted|Accession#\s|表达宿主|Expressed Host|$)/i)?.[1] || "";
  const accession = (construct.match(/(?:Accession\s*#\s*|\()((?:[A-Z]{1,3}_)?[A-Z0-9]{5,}(?:\s*[.-]\s*\d+)?)\b/)?.[1] ||
    text.match(/Accession\s*#\s*((?:[A-Z]{1,3}_)?[A-Z0-9]{5,}(?:[.-]\d+)?)/)?.[1])?.replace(/\s/g, "");
  const range = construct.match(/\b[A-Z][a-z]{2}\s*\d+\s*[-–]\s*[A-Z][a-z]{2}\s*\d+\b/)?.[0];
  const host = property(/^(expression system|expressed host|表达宿主)$/i) ||
    text.match(/(?:表达宿主|Expressed Host|expressed from|expressed in)\s+((?:human 293 cells \(HEK293\)|HEK293|CHO|E\. coli|Sf9)[\w -]{0,12})/i)?.[1]?.trim();
  const variants = (kind === "detail" ? listedVariants(text, sku) : [])
    .map((variant) => ({ ...variant, sourceUrl }));
  for (const offer of [product.offers].flat().filter(Boolean)) {
    const size = typeof offer.size === "string" ? offer.size : undefined;
    if (!size || variants.some((row) => row.size === size)) continue;
    const price = /^[A-Z]{3}$/.test(offer.priceCurrency) && /^\d+(?:\.\d+)?$/.test(String(offer.price))
      ? `${offer.priceCurrency} ${offer.price}` : undefined;
    variants.push({ size, price, sourceUrl });
  }
  const validation = [...evidenceText.matchAll(/(?:^|\n)[ \t]*(?:Bioactivity|生物活性)[ \t:：-]+(ELISA|SPR|BLI)\b/gim)]
    .map(([, method]) => method.toUpperCase());
  const source = { kind, url: sourceUrl, retrievedOn: new Date().toISOString().slice(0, 10), ...(version && { version }) };
  const fieldSources = {};
  for (const [field, value] of Object.entries({ name, sku, species, tags, accession, range, host, variants, validation })) {
    if (value && (!Array.isArray(value) || value.length)) fieldSources[field] = sourceUrl;
  }
  return { vendor, sku, name, url, target, species, tags, accession, range, host, sources: [source], fieldSources, validation: [...new Set(validation)],
    componentOnly: canonicalTargetKey(target) === "cd3" && /cd3\s*(?:epsilon|gamma|delta)|cd3e/i.test(name),
    variants, verifiedOn: new Date().toISOString().slice(0, 10), live: true,
  };
}

export function readDatasheetProduct(text, url, target, vendor, detailLinks = []) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headingIndex = lines.findIndex((line) => /^(?:Catalog\s*#|Cat(?:alog)?\s*No\.?|货号)\s*[:：]?\s+[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(line));
  const name = lines[headingIndex - 1];
  if (!name || !targetMatches(name, target) || !/\bprotein\b|蛋白/i.test(name)) return null;
  const sku = lines[headingIndex].match(/([A-Z0-9]+(?:-[A-Z0-9]+)+)$/i)[1];
  const detail = detailLinks.find((link) => new URL(link).pathname.toLowerCase().endsWith("-" + sku.toLowerCase()));
  const version = new URL(url).search.match(/(?:^\?|[&])((?:19|20)\d{6})=/)?.[1];
  return productRecord({ name, sku, url: detail, target, vendor, text: plain(text), evidenceText: text,
    kind: "pdf", sourceUrl: url, version });
}

const hrefs = (html) => [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map(([, url]) => url.replace(/&amp;/g, "&"));

export function readCatalogProducts(html, url, target, vendor) {
  const rows = [];
  for (const [row] of html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(([, cell]) => plain(cell));
    const name = cells.find((cell) => /\bprotein\b|蛋白/i.test(cell) && targetMatches(cell, target));
    if (!name) continue;
    for (const detail of hrefs(row).map((href) => detailUrl(href, sources[vendor])).filter(Boolean)) {
      const sku = cells.find((cell) => /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(cell) &&
        new URL(detail).pathname.toLowerCase().endsWith("-" + cell.toLowerCase()));
      if (sku) rows.push(productRecord({ name, sku, url: detail, target, vendor, text: "",
        kind: "catalog", sourceUrl: url }));
    }
  }
  return rows;
}

async function readPage(url, source, fetcher, signal) {
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    const response = await fetcher(current, { signal, redirect: "manual", headers: { Accept: "text/html" } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location && new URL(location, current);
      if (!next || next.protocol !== "https:" || !source.hosts.includes(next.hostname) ||
          next.port || next.username || next.password || !(source.detail.test(new URL(current).pathname) ? source.detail : source.catalog).test(next.pathname)) throw new Error("redirect_blocked");
      current = next.href;
      continue;
    }
    if (!response.ok) throw new Error(`http_${response.status}`);
    if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("non_html");
    const stream = response.body?.getReader();
    if (!stream) break;
    const decoder = new TextDecoder();
    let html = "";
    let size = 0;
    for (;;) {
      const { done, value } = await stream.read();
      if (done) return { html: html + decoder.decode(), url: current };
      size += value.byteLength;
      if (size > 2_000_000) {
        await stream.cancel();
        throw new Error("catalog_too_large");
      }
      html += decoder.decode(value, { stream: true });
    }
  }
  throw new Error("redirect_limit");
}

export const liveProteinVendors = proteinSuppliers.filter((vendor) => vendor in sources);

export async function queryLiveProteins(target, vendor, { signal, fetcher = fetch, offset = 0, renderPage, discover, materialSeeds = publicMaterials[vendor] }) {
  const source = sources[vendor];
  const seeds = proteinProducts(target).filter((row) => row.vendor === vendor)
    .map(({ url }) => detailUrl(new URL(url).pathname, source)).filter(Boolean);
  const terms = targetSearchAliases(target);
  const issues = new Set();
  const record = (error) => issues.add(signal.aborted || error.name === "TimeoutError" ? "timeout" :
    /^(?:http_|search_http_|render_|pdf_|redirect_|non_html|catalog_too_large)/.test(error.message) ? error.message : "network");
  const slug = terms.filter((term) => /^[a-z0-9-]+$/.test(term))
    .sort((a, b) => Number(b.includes("-")) - Number(a.includes("-")) || a.length - b.length)[0];
  const catalogPath = vendor === "ACROBiosystems" ? "/category/target-protein/" : "/molecule/";
  const entry = slug ? source.origin + catalogPath + slug : seeds[0];

  async function read(url, extract, selector) {
    const page = await readPage(url, source, fetcher, signal);
    const value = extract(page.html, page.url);
    if (Array.isArray(value) ? value.length : value) return value;
    const shell = !/<h1\b/i.test(page.html) && /<script\b/i.test(page.html);
    if (/captcha|verify you are human/i.test(plain(page.html).slice(0, 500))) throw new Error("http_challenge");
    if (!shell) {
      issues.add("parse_failed");
      return value;
    }
    if (!renderPage) {
      issues.add("dynamic_html");
      return value;
    }
    const rendered = extract(await renderPage(page.url, selector, signal), page.url);
    if (!(Array.isArray(rendered) ? rendered.length : rendered)) issues.add("render_parse_failed");
    return rendered;
  }

  const batchSize = 12;
  const searchPage = Math.floor(offset / 240);
  const localOffset = offset % 240;
  let more = false;
  const materials = new Map();
  const materialRows = [];
  function addMaterial(href, base) {
    const material = materialUrl(href, vendor, base);
    if (material) materials.set(material.url, material.kind);
  }
  if (!searchPage) {
    for (const { url, targets } of materialSeeds) {
      if (!targets || targets.some((id) => canonicalTargetKey(id) === canonicalTargetKey(target))) addMaterial(url);
    }
  }

  const [found, catalog] = await Promise.all([
    (async () => {
      if (!discover) { issues.add("search_not_configured"); return []; }
      try {
        const result = await discover({ terms, host: new URL(source.origin).hostname, page: searchPage, signal });
        more = result.more;
        for (const url of result.urls) addMaterial(url);
        return result.urls.map((url) => detailUrl(url, source)).filter(Boolean);
      } catch (error) { record(error); return []; }
    })(),
    (async () => {
      if (!entry || searchPage) return [];
      try {
        return await read(entry, (html, url) => {
          materialRows.push(...readCatalogProducts(html, url, target, vendor));
          for (const link of hrefs(html)) {
            const material = materialUrl(link, vendor, url);
            if (material?.kind === "pdf") addMaterial(link, url);
          }
          return catalogDetails(html, target, vendor);
        },
          'a[href*="/products/protein/"], a[href*="/recombinant-proteins/"]');
      } catch (error) { record(error); return []; }
    })(),
  ]);
  const materialLinks = [];
  await Promise.all([...materials].filter(([, kind]) => kind === "catalog").slice(0, 2).map(async ([url]) => {
    try {
      const page = await readPage(url, source, fetcher, signal);
      materialRows.push(...readCatalogProducts(page.html, page.url, target, vendor));
      materialLinks.push(...catalogDetails(page.html, target, vendor));
    } catch (error) { record(error); }
  }));
  const urls = [...new Set([...catalog, ...materialLinks, ...(searchPage ? [] : seeds), ...found])];
  const pending = urls.slice(localOffset, localOffset + batchSize);
  const rows = [...materialRows];
  async function readLinkedPdf(url) {
    try {
      const row = readDatasheetProduct(await readDatasheet(url, fetcher, signal), url, target, vendor, urls);
      if (row) rows.push(row);
      else issues.add("pdf_parse_failed");
    } catch (error) { record(error); }
  }
  if (!signal.aborted) {
    const pdfs = [...materials].filter(([, kind]) => kind === "pdf").map(([url]) => url);
    await Promise.all(pdfs.slice(0, 4).map(readLinkedPdf));
  }
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length && !signal.aborted && !issues.has("http_429") && !issues.has("http_challenge")) {
      const url = pending.shift();
      try {
        const linkedPdfs = new Set();
        const row = await read(url, (html, finalUrl) => {
          for (const href of hrefs(html)) {
            const material = materialUrl(href, vendor, finalUrl);
            if (material?.kind === "pdf" && !materials.has(material.url)) linkedPdfs.add(material.url);
          }
          return readProteinDetail(html, finalUrl, target, vendor);
        }, "h1");
        if (row) rows.push(row);
        for (const pdf of [...linkedPdfs].slice(0, 1)) await readLinkedPdf(pdf);
      } catch (error) { record(error); }
    }
  }));
  if (signal.aborted) issues.add("timeout");
  const nextPage = searchPage < 9 && more ? (searchPage + 1) * 240 : null;
  const nextOffset = localOffset + batchSize < Math.min(urls.length, 240) ? offset + batchSize : nextPage;
  return {
    rows: mergeProducts(rows.sort((a, b) => {
      const rank = { pdf: 0, detail: 1, catalog: 2 };
      return rank[a.sources[0].kind] - rank[b.sources[0].kind] ||
        (b.sources[0].version || "").localeCompare(a.sources[0].version || "") ||
        a.sources[0].url.localeCompare(b.sources[0].url);
    })).sort((a, b) => a.sku.localeCompare(b.sku)),
    candidates: urls.slice(localOffset, localOffset + batchSize)
      .filter((url) => !rows.some((row) => row.url === url)),

    state: rows.length ? "partial" : issues.size || urls.length ? "unavailable" : "unsupported",
    issues: [...issues].sort(),
    nextOffset,
    truncated: urls.length > 240 || (more && searchPage === 9),
  };
}
