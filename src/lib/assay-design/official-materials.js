// Public document URLs observed in supplier material. These are discovery
// pointers, not product records or templates for constructing other PDF URLs.
export const publicMaterials = {
  ACROBiosystems: [
    { targets: ["CD19"], url: "https://ehf85k.acrobiosystems.cn/public/product/pdf/ds/CD9-H5251.pdf" },
    { targets: ["CD19"], url: "https://ehf85k.acrobiosystems.cn/public/product/pdf/ds/CD9-H52Hb.pdf?20260104=" },
    { targets: ["MS4A1"], url: "https://ehf85k.acrobiosystems.cn/public/product/pdf/ds/CD0-H52H3.pdf" },
    { targets: ["PDCD1"], url: "https://ehf85k.acrobiosystems.cn/public/product/pdf/ds/PD1-H5257.pdf?20251007=" },
    { targets: ["TNFSF15"], url: "https://ehf85k.acrobiosystems.cn/public/product/pdf/ds/TLA-H5263.pdf" },
    { targets: ["TNFSF15"], url: "https://ehf85k.acrobiosystems.cn/public/product/pdf/ds/TLA-H5244.pdf" },
  ],
  "Sino Biological": [{ url: "https://cn.sinobiological.com/category/solutions/bispecific-antibody" },
    { url: "https://cn.sinobiological.com/category/solutions/aidd-targets" }],
};

export function materialUrl(href, vendor, base) {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const acro = vendor === "ACROBiosystems";
    const path = url.pathname;
    const pdf = acro
      ? ["ehf85k.acrobiosystems.cn", "www.acrobiosystems.cn", "acrobiosystems.cn"].includes(url.hostname) &&
        /^\/(?:public\/product\/pdf\/ds|data\/ds)\/[a-z0-9._-]+\.pdf$/i.test(path)
      : url.hostname === "cdn1.sinobiological.com" && /^\/reagent\/[a-z0-9/_.-]+\.pdf$/i.test(path);
    const catalog = acro
      ? ["www.acrobiosystems.cn", "acrobiosystems.cn"].includes(url.hostname) && /^\/category\/[a-z0-9/-]+$/i.test(path)
      : url.hostname === "cn.sinobiological.com" && /^\/(?:category|molecule)\/[a-z0-9/-]+$/i.test(path);
    url.hash = "";
    return pdf || catalog ? { url: url.href, kind: pdf ? "pdf" : "catalog" } : null;
  } catch { return null; }
}

export async function readDatasheet(url, fetcher, signal) {
  const response = await fetcher(url, { signal, redirect: "error", headers: { Accept: "application/pdf" } });
  if (!response.ok) throw new Error(`pdf_http_${response.status}`);
  if (!response.headers.get("content-type")?.includes("application/pdf")) throw new Error("pdf_invalid");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("pdf_invalid");
  const chunks = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 2_000_000) {
      await reader.cancel();
      throw new Error("pdf_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") throw new Error("pdf_invalid");
  const { extractText, getDocumentProxy } = await import("unpdf");
  const document = await getDocumentProxy(bytes, { isEvalSupported: false });
  try {
    if (document.numPages > 16) throw new Error("pdf_too_large");
    const { text } = await extractText(document, { mergePages: true });
    return text;
  } finally {
    await document.loadingTask.destroy();
  }
}
