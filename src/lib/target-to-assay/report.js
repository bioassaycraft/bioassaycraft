import { evidenceFor } from "./evidence.js";
export function buildResearchReport({
  drugs,
  sources,
  targets,
  locale = "zh",
  format = "txt",
  documents = {},
  exportedAt = new Date().toISOString(),
}) {
  const zh = locale === "zh";
  const md = format === "md";
  const heading = (s, level = 1) => (md ? `${"#".repeat(level)} ${s}` : s);
  const lines = [
    heading(zh ? "BioassayCraft · 靶点研究清单" : "BioassayCraft · Target research shortlist"),
    "",
    `${zh ? "导出时间" : "Exported at"}: ${exportedAt}`,
    `${zh ? "本次检索靶点" : "Current search targets"}: ${targets.join(" × ")}`,
    "",
    zh
      ? "清单可包含此前检索选中的药物；各药物的靶点以其记录为准。在线药物关系来自 Open Targets，APPROVAL 不代表 FDA、EMA 或中国批准。收录范围以所列来源为准。"
      : "The shortlist may include drugs selected in earlier searches; each record lists its own targets. Online relationships come from Open Targets; APPROVAL does not establish FDA, EU or Chinese approval. Coverage is limited to the sources listed.",
    "",
  ];
  for (const drug of drugs) {
    lines.push(
      heading(`${drug.name}${drug.brand ? ` (${drug.brand})` : ""}`, 2),
      `${zh ? "靶点" : "Targets"}: ${drug.targetIds.join(" × ")}`,
      `${zh ? "证据状态" : "Evidence status"}: ${drug.verification}`,
      `${zh ? "数据日期" : "Data date"}: ${drug.updatedAt}`,
      "",
    );
    const uniqueDocuments = new Map(
      [...evidenceFor(drug, sources), ...(documents[drug.id] || [])].map((doc) => [doc.url, doc]),
    );
    for (const doc of uniqueDocuments.values()) {
      const status =
        doc.status === "document"
          ? zh
            ? "文件 / 数据记录"
            : "Document / data record"
          : zh
            ? "官网查询入口，非已获取报告"
            : "Official search portal, not a retrieved report";
      lines.push(
        `- ${doc.agency} · ${(zh && doc.titleZh) || doc.title} [${status}]`,
        `  ${doc.url}`,
      );
      if (doc.summary) lines.push(`  ${(zh && doc.summaryZh) || doc.summary}`);
      if (doc.keyword) lines.push(`  ${zh ? "检索词" : "Search term"}: ${doc.keyword}`);
      if (doc.locator) lines.push(`  ${doc.locator}`);
      if (doc.date || doc.fetchedAt)
        lines.push(
          `  ${zh ? "文件日期 / 获取时间" : "Document date / retrieved"}: ${doc.date || "—"} / ${doc.fetchedAt || "—"}`,
        );
    }
    lines.push("");
  }
  return lines.join("\n");
}
