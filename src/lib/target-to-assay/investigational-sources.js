// Reviewed links are supplemental evidence for discovered identities, never search fixtures.
export const exactDrugName = (name = "") => name.trim().replace(/\s+/g, " ").toLowerCase();
export const chemblIdentity = (drug) => drug.externalIds?.chembl || drug.chemblId || (/^CHEMBL\d+$/.test(drug.id) ? drug.id : null);

export function reviewedInvestigationalSource(drug) {
  const id = chemblIdentity(drug);
  return investigationalSources.find(({ chemblId, names }) =>
    chemblId && id ? chemblId === id : names.some((name) => exactDrugName(name) === exactDrugName(drug.name)));
}

export const investigationalSources = [
  {
    names: ["Foralumab"],
    chemblId: "CHEMBL1743020",
    developer: {
      value: "Tiziana Life Sciences", scope: "Intranasal foralumab",
      text: "Tiziana developed nasal foralumab for the treatment of neurologic diseases",
      url: "https://ir.tizianalifesciences.com/news-releases/news-release-details/tiziana-announces-positive-topline-results-phase-2a-inform-ms",
      publishedYear: "2026",
    },
    filing: {
      title: "Tiziana Life Sciences · Form 20-F", date: "2026",
      url: "https://www.sec.gov/Archives/edgar/data/0001723069/000121390026051015/ea0287936-20f_tiziana.htm",
    },
    official: [{
      title: "Intranasal Foralumab",
      url: "https://www.tizianalifesciences.com/drug-pipeline/intranasal-foralumab/",
    }],
    conferences: [],
  },
  {
    names: ["plamotamab", "XmAb13676"],
    developer: {
      value: "Xencor", text: "Xencor is conducting a Phase 1b proof-of-concept study of plamotamab",
      url: "https://xencor.com/pipeline/plamotamab/", publishedYear: "2026",
    },
    filing: {
      title: "Xencor · SEC EDGAR development update", date: "2026-11-04",
      url: "https://www.sec.gov/Archives/edgar/data/1326732/000132673226000062/xncr-20261104xexx991.htm",
    },
    targetAssertion: "Plamotamab is a bispecific T-cell engager that directly targets CD20 and CD3.",

    official: [{
      title: "Xencor releases interim Plamotamab study results",
      date: "2026-11-09",
      url: "https://investors.xencor.com/news-releases/news-release-details/xencor-presents-initial-plamotamab-data-rheumatoid-arthritis-acr",
    }],
    conferences: [{
      title: "Phase 1 Study of Plamotamab in Adult Patients With Rheumatoid Arthritis: Interim Results",
      meeting: "ACR Convergence 2026", number: "1417",
      url: "https://investors.xencor.com/static-files/0a9b09b6-2a82-482e-bc34-7195378f323a",
    }],
  },
];
