import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { getCanonicalUrl, seoPages } from "../src/config/seo.js";
import { productionOrigin } from "../src/config/seo.js";

const root = process.cwd();
const dist = join(root, "dist");
const pagesByPath = new Map(seoPages.map((page) => [page.path, page]));

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const file = join(directory, entry.name);
      return entry.isDirectory() ? walk(file) : [file];
    }),
  );
  return files.flat();
};

const pagePathForFile = (file) => {
  const value = relative(dist, file).split(sep).join("/");
  if (value === "index.html") return "/";
  if (!value.endsWith("/index.html")) return `/${value}`;
  return `/${value.slice(0, -"index.html".length)}`;
};

const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

const seoTags = (page) => `\n    <title>${escapeHtml(page.title)}</title>\n    <meta name="description" content="${escapeHtml(page.description)}" />\n    <meta name="robots" content="${page.index ? "index, follow" : "noindex, nofollow"}" />\n    <link rel="canonical" href="${getCanonicalUrl(page.path)}" />\n    <meta property="og:title" content="${escapeHtml(page.title)}" />\n    <meta property="og:description" content="${escapeHtml(page.description)}" />\n    <meta property="og:url" content="${getCanonicalUrl(page.path)}" />\n    <meta property="og:type" content="${page.type}" />`;

const removeExistingSeo = (html) =>
  html
    .replace(/\s*<title[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/\s*<meta\s+(?:name|property)=["'](?:description|robots|og:title|og:description|og:url|og:type)["'][^>]*>/gi, "")
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, "");

for (const file of (await walk(dist)).filter((file) => file.endsWith(".html"))) {
  const page = pagesByPath.get(pagePathForFile(file));
  if (!page) continue;
  const source = await readFile(file, "utf8");
  const html = removeExistingSeo(source).replace(/<\/head>/i, `${seoTags(page)}\n  </head>`);
  await writeFile(file, html);
}

const sitemapEntries = seoPages
  .filter((page) => page.index)
  .map((page) => `  <url><loc>${getCanonicalUrl(page.path)}</loc></url>`)
  .join("\n");
await writeFile(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
);
await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${productionOrigin}/sitemap.xml\n`);
