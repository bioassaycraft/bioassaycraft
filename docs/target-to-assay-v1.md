# Target-to-Assay Explorer

Route: `/learn/target-to-assay-explorer/`. Run `npm run dev` for local review.

## Search and evidence

The page opens on the reviewed CD3 × CD20 example. The empty search field accepts arbitrary target names, gene symbols or Ensembl IDs (up to eight). Explicit search calls the public Open Targets GraphQL API directly from the browser; no credentials or Worker/D1 binding is required. This also works in a static preview, subject to network access and upstream CORS availability. Failed requests retain the last successful results with an inline error. Requests time out and abort on unmount.

The integration was checked against the live API on 2026-11-11: `search` resolves targets; `target.drugAndClinicalCandidates` supplies drugs; `maximumClinicalStage: APPROVAL` identifies approval-stage records; the page also includes mechanism-backed clinical phase records; `mechanismsOfAction` supplies target membership. The older `knownDrugs` field is absent from the current schema. EGFR returned 31 drug records at verification time. Counts may change; salts and parent molecules can be separate source records.

Exact identifiers and uniquely verified synonyms resolve automatically. The page offers candidates when the returned records do not establish a unique match. CD3 remains a curated complex-level target; it is never silently mapped to CD3E. Therefore a CD3-only query uses the reviewed complex-level example, not an exhaustive live complex search. CD20 resolves to MS4A1 directly. The source reports mechanism target sets, whose completeness is not inferred; online records cannot satisfy complete-set matching. APPROVAL is a source development stage, not evidence of FDA, EU or Chinese approval, current availability or absence of withdrawal. Source data can contain stale or inconsistent stage annotations.

The results open on the full requested target set. The results require reported target sets to equal the selected full input or individual target. Individual-target tabs remain available, and the page defaults to a matching individual target if the full set has no records. The name filter applies within that scope. Counts use unique drug record IDs and the stage distribution describes the active result group. The overview under the search field summarizes the selected scope. It adds verified indications and authorization-holder details for Glofitamab and Mosunetuzumab, while keeping clinical trial records in the drug details. The overview shows target sets, stage counts and indications. ACRO links provide additional pipeline lookup for the supported example targets.

## Drug mechanism labels

The drug details assign mechanism labels using explicit mechanism statements from Open Targets and checked cell-engagement evidence for the reviewed examples. Mechanism labels may overlap. Unclassified records remain in the drug count. The application taxonomy distinguishes pharmacological action, molecular format, and therapeutic goals such as weight loss and lean-mass preservation.

The labels are informed by the 2026 reviews [Evolution of bispecific and multispecific antibodies in cancer therapy](https://pubmed.ncbi.nlm.nih.gov/42099877/), [Antibody-drug conjugate design and mechanisms of action](https://pubmed.ncbi.nlm.nih.gov/41855081/), and [Pharmacologic treatments for preservation of lean body mass during weight loss](https://pubmed.ncbi.nlm.nih.gov/41598480/).

## Additional lookup sources

ClinicalTrials.gov is queried by drug intervention name when the user requests trials. The page shows up to five matching studies, sponsor, phase, status, conditions and deduplicated study locations. Its total is the registry query count. ACRO and Patsnap Synapse are external lookup links, and ChEMBL identifiers link to the corresponding compound page.

ChEMBL contributes indication records for up to twelve matched compound IDs. PubMed queries the title and abstract for the active target set and prioritizes assay-related papers. For combinations, every target must be mentioned, allowing aliases for each target. Paper entries link to PubMed and available PMC full text and show a short, labelled abstract excerpt.

## Regional approval dates

Product cards show United States and European Union approval dates where documented, plus Chinese registration certificate dates where available. Online FDA dates come from approved original submissions. Unverified dates are shown as such. Drug evidence combines all available jurisdictions in chronological order.

## Regulatory documents

- **FDA**: Glofitamab has a verified activity finding linked to the Product Quality Review at page 4. Opening a drug’s evidence disclosure queries openFDA for product-specific applications and candidate review documents, with quality and nonclinical reviews ranked first. The explorer and exports omit prescribing information and approval letters. Retrieved file indexes do not establish that a review contains an activity method.
- **EMA**: verified EPAR public assessment PDFs and assessment-history pages for BLINCYTO, LUNSUMIO and COLUMVI. Other drugs receive an official EMA keyword-search link, explicitly labeled as a portal, not a retrieved assessment report. No guessed EPAR product slug is used for arbitrary drugs.
- **China**: the Glofitamab example links directly to the NMPA conditional approval announcement. CDE review reports remain unavailable until a product-specific link is verified. Generic regulator search portals are omitted from the review list and exports.

Sources checked during implementation: [Open Targets API documentation](https://platform-docs.opentargets.org/data-access/graphql-api), [Drugs@FDA API documentation](https://open.fda.gov/apis/drug/drugsfda/understanding-the-api-results/), [CDE public information](https://www.cde.org.cn/main/xxgk/listpage/b40868b5e21c038a6aa8b4319d21b07d), and the linked FDA/EMA example documents.

## Existing Worker and persistence seams

The read-only Worker API remains the bounded **starter-catalog API**, separate from the browser's online workflow:

- `POST /api/v1/target-to-assay/search`: starter target-set search and filters.
- `POST /api/v1/target-to-assay/resolve`: starter controlled-vocabulary resolution.
- `GET /api/v1/target-to-assay/meta`: starter vocabulary/count and coverage.
- `GET /api/v1/target-to-assay/drugs/:id`: starter drug and source evidence.

Its existing method/body validation and JSON contract remain unchanged. `migrations/target-to-assay/0001_initial.sql` remains an unbound D1-compatible schema. No remote database, deployment or production configuration was changed.

## Validation

Run `npm run test`, `npm run lint`, `npm run build`, and `git diff --check`. Focused tests cover arbitrary target resolution, explicit ambiguity confirmation, source failures, mechanism-backed matching, incomplete-set exclusions, CD3 complex handling, FDA response normalization/URL validation, and bilingual TXT/Markdown content, alongside the original search, Worker and SQLite tests. Live API smoke checks are separate from deterministic tests.

Browser checks: arbitrary target query, review retrieval, region selection, bilingual interface, narrow/mobile layout and horizontal overflow. No source data is loaded during SSG rendering.
