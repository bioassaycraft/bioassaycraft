# Bioassay Design V1

Start with `npm run build` and `npm run preview -- --port 5174 --strictPort`. Open
`/learn/assay-design/` directly, or choose Bioassay Design from the Explorer's
mechanism card to carry its submitted targets and in-memory drug context forward.

Try CD20, CD3×CD20, and CD3×CD19×CD20. Choose filters and click Search on each protein card. In CD19, Mouse + His-tag selects the mouse
construct. In CD20, Avi-tag selects records that have multiple tags. In detection
reagents, Mouse + H+L + Biotin selects ab97044; changing specificity to SA-HRP
ignores and disables the species and label controls. SE068 has two packs, and
M00091 has a separately recorded CNY price for its 1 mg pack.

The drug list reuses the Explorer's verified target matching, approval data,
and cached FDA document lookup. Only transcribed and inspected method evidence
appears as a method. Current verified coverage is Columvi's FDA quality and
multidisciplinary reviews. The CDE link is a manual search portal.

Product records are source-backed snapshots for CD3 (including a labeled CD3ε
subunit), CD19 and CD20 plus detection reagents. They carry verification dates
and point to manufacturer details. A missing result describes this catalog's
coverage. Missing sizes
and prices are left blank; listed amounts are snapshots from the China storefront. If a China detail page could not be verified, the record links to its verified international detail page.

Protein searches request public manufacturer pages through the existing Worker
and show results per supplier. The search reads links exposed in HTML and
rechecks known detail URLs. A supplier returning a blocked or JavaScript-only
page can leave the live results incomplete. Verified snapshots are available
when live reads fail. Detection reagents still use verified snapshots.
Regulatory PDF extraction remains manual. No AI calls,
new database, credentials, or production configuration are required.

For optional ACRO browser rendering, configure `CF_BROWSER_ACCOUNT_ID` and
`CF_BROWSER_API_TOKEN` on the existing Worker. The token needs Browser Rendering
Write permission. For local preview, provide both variables to the preview process.
The renderer is used only when an ACRO HTML response contains no parseable
product content. Supplier access restrictions can still prevent a live lookup.
