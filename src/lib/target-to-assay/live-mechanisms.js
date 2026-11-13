import { classifyTargetMatch, prepareTargetMatch } from "./target-match.js";
import { reviewFdaLabels } from "./candidate-review.js";
import { providerIssue } from "./provider-status.js";
import {
  fetchDiseaseAssociations,
  fetchExpression,
  resolveHgnc,
  reviewedDiseaseExpression,
} from "./target-discovery.js";
import { reviewedMechanism } from "./bilingual-mechanism.js";
import { curatedTargetEvidence, mergeEvidence, parseTargetInput, searchOnline } from "./online.js";
import { SearchError } from "./search.js";
import {
  canonicalAlias,
  evidence,
  fetchPathways,
  getJson,
  resolveComposite,
  resolveReactomeComplex,
  resolveProtein,
} from "./target-biology.js";

const sourceState = (states) => {
  if (!states.length) return "not_queried";
  if (states.every((state) => state === "failed")) return "failed";
  if (states.includes("failed")) return "partial";
  return states.includes("ok") ? "ok" : "empty";
};

const providerError = (error) => {
  if (error?.name === "TimeoutError") return "timeout";
  if (error?.name === "AbortError") return "aborted";
  if (/^upstream_\d{3}$/.test(error?.message)) return error.message;
  if (/^unexpected_/.test(error?.message) || error?.name === "SyntaxError")
    return "invalid_response";
  return "upstream_unavailable";
};

const chemblBase = "https://www.ebi.ac.uk/chembl/api/data/";
const chemblId = (id) => /^CHEMBL\d+$/.test(id || "");
function chemblStage(molecule) {
  const phase = Number(molecule.max_phase);
  if (molecule.withdrawn_flag) return "WITHDRAWN";
  if (phase === 4) return "APPROVAL";
  if (phase === 0.5) return "EARLY_PHASE_1";
  return [1, 2, 3].includes(phase) ? `PHASE_${phase}` : "UNKNOWN";
}
async function chemblRows(resource, filters, field, fetcher, signal) {
  const url = new URL(resource + ".json", chemblBase);
  const rows = [];
  let total;
  let truncated = false;
  let issue;
  for (let page = 0; page < 2; page += 1) {
    url.search = new URLSearchParams({ ...filters, limit: "60", offset: String(page * 60) });
    let payload;
    try {
      payload = await getJson(url, fetcher, signal);
      if (
        !Array.isArray(payload?.[field]) ||
        payload[field].some((row) => !row || typeof row !== "object")
      )
        throw new Error("unexpected_chembl_response");
    } catch (error) {
      if (!rows.length) throw error;
      issue = providerIssue(error);
      break;
    }
    rows.push(...payload[field]);
    total = payload.page_meta?.total_count ?? rows.length;
    truncated = Boolean(payload.page_meta?.next || total > rows.length);
    if (!truncated || !payload[field].length) break;
  }
  return { rows, total, truncated, issue };
}

async function fetchChemblMechanisms(targets, fetcher, signal, retrievedAt) {
  const entities = targets.flatMap(({ entityType, uniprotIds, componentAccessions, id }) => {
    const complex = entityType === "protein_complex";
    const accessions = complex ? componentAccessions || [] : uniprotIds;
    return accessions.length
      ? [{ id, accessions, type: complex ? "PROTEIN COMPLEX" : "SINGLE PROTEIN" }]
      : [];
  });
  if (!entities.length) return { state: "not_queried", drugs: [], mechanisms: [] };
  const targetsPage = await chemblRows(
    "target",
    {
      target_components__accession__in: [
        ...new Set(entities.flatMap(({ accessions }) => accessions)),
      ].join(","),
      organism: "Homo sapiens",
      target_type__in: [...new Set(entities.map(({ type }) => type))].join(","),
    },
    "targets",
    fetcher,
    signal,
  );
  const rawTargets = new Map(targetsPage.rows.map((row) => [row.target_chembl_id, row]));
  const targetIds = new Map(
    targetsPage.rows.flatMap((row) => {
      if (
        !chemblId(row.target_chembl_id) ||
        row.organism !== "Homo sapiens" ||
        !Array.isArray(row.target_components)
      )
        return [];
      const accessions = new Set(row.target_components.map(({ accession }) => accession));
      const matches = entities.filter(
        (entity) =>
          entity.type === row.target_type &&
          entity.accessions.length === accessions.size &&
          entity.accessions.every((id) => accessions.has(id)),
      );
      return matches.length === 1 ? [[row.target_chembl_id, matches[0].id]] : [];
    }),
  );
  const coverage = [
    {
      resource: "target",
      count: targetsPage.total,
      returned: targetsPage.rows.length,
      truncated: targetsPage.truncated,
      issue: targetsPage.issue,
    },
  ];
  if (!targetIds.size) return { state: "empty", drugs: [], mechanisms: [], coverage };
  const mechanismsPage = await chemblRows(
    "mechanism",
    {
      target_chembl_id__in: [...targetIds.keys()].join(","),
    },
    "mechanisms",
    fetcher,
    signal,
  );
  coverage.push({
    resource: "mechanism",
    count: mechanismsPage.total,
    returned: mechanismsPage.rows.length,
    truncated: mechanismsPage.truncated,
    issue: mechanismsPage.issue,
  });
  const records = mechanismsPage.rows.filter(
    (row) => chemblId(row.molecule_chembl_id) && targetIds.has(row.target_chembl_id),
  );
  const proposedByDrug = new Map();
  for (const row of records) {
    const proposed = proposedByDrug.get(row.molecule_chembl_id) || new Set();
    proposed.add(targetIds.get(row.target_chembl_id));
    proposedByDrug.set(row.molecule_chembl_id, proposed);
  }
  if (!records.length) return { state: "empty", drugs: [], mechanisms: [], coverage };
  const moleculesPage = await chemblRows(
    "molecule",
    {
      molecule_chembl_id__in: [...new Set(records.map((row) => row.molecule_chembl_id))].join(","),
    },
    "molecules",
    fetcher,
    signal,
  );
  coverage.push({
    resource: "molecule",
    count: moleculesPage.total,
    returned: moleculesPage.rows.length,
    truncated: moleculesPage.truncated,
    issue: moleculesPage.issue,
  });
  const byId = new Map(
    moleculesPage.rows
      .filter(
        (row) => chemblId(row.molecule_chembl_id) && proposedByDrug.has(row.molecule_chembl_id),
      )
      .map((row) => [
        row.molecule_chembl_id,
        {
          ...row,
          pref_name: row.pref_name || row.molecule_chembl_id,
          proposedTargetIds: [...proposedByDrug.get(row.molecule_chembl_id)],
        },
      ]),
  );
  const targetEvidence = records.filter((row) => byId.has(row.molecule_chembl_id))
    .map((row) => ({
      drugId: row.molecule_chembl_id,
      recordId: row.mec_id ?? row.target_chembl_id,
      originalUrl: chemblBase + "mechanism.json?" + new URLSearchParams({
        molecule_chembl_id: row.molecule_chembl_id, target_chembl_id: row.target_chembl_id,
      }),
      targetIds: [targetIds.get(row.target_chembl_id)],
      sourceType: "chembl",
      rawTargetRecord: rawTargets.get(row.target_chembl_id),
      actionType: row.action_type,
      text: row.mechanism_of_action,
      references: row.mechanism_refs,
      role: /\b(?:payload|cytotoxic warhead)\b/i.test(row.mechanism_of_action || "") ? "payload"
        : [true, 1].includes(row.direct_interaction) ? "direct"
        : [false, 0].includes(row.direct_interaction) ? "indirect" : "unverified",
      allowBindingAssertion: Boolean(row.mechanism_refs?.length),
    }));
  const mechanisms = records
    .filter(
      (row) =>
        byId.has(row.molecule_chembl_id) &&
        [true, 1].includes(row.direct_interaction) &&
        row.mechanism_of_action,
    )
    .map((row) => {
      const molecule = byId.get(row.molecule_chembl_id);
      const query = new URLSearchParams({
        molecule_chembl_id: row.molecule_chembl_id,
        target_chembl_id: row.target_chembl_id,
      });
      return {
        drugId: row.molecule_chembl_id,
        drugName: molecule.pref_name,
        molecularFormat: molecule.molecule_type,
        targetIds: [targetIds.get(row.target_chembl_id)],
        actionType: row.action_type,
        mechanismDescription: row.mechanism_of_action,
        developmentStatus: { globalDevelopmentPhase: chemblStage(molecule) },
        evidenceStatus: "direct_evidence",
        sources: [
          evidence(
            "ChEMBL",
            String(row.mec_id ?? row.molecule_chembl_id),
            chemblBase + "mechanism.json?" + query,
            retrievedAt,
            {
              evidenceDescription: row.mechanism_of_action,
              license: {
                name: "CC BY-SA 3.0",
                url: "https://creativecommons.org/licenses/by-sa/3.0/",
              },
              references: (row.mechanism_refs || []).map(({ ref_type, ref_id }) => ({
                type: ref_type,
                id: ref_id,
              })),
            },
          ),
        ],
      };
    });
  return { state: byId.size ? "ok" : "empty", drugs: [...byId.values()], mechanisms, targetEvidence, coverage };
}

// Query by drug after discovery. Querying by selected target alone cannot
// surface other arms or distinguish a partial projection from a full scope.
async function reviewChemblDrugs(drugs, targets, fetcher, signal) {
  const scope = targets.map(({ id }) => id);
  const selected = drugs.flatMap((drug) => {
    const id = drug.externalIds?.chembl || drug.id;
    if (!chemblId(id)) return [];
    const match = classifyTargetMatch(prepareTargetMatch(drug, targets), scope);
    return match && match.state !== "verified" ? [{ id, drug, support: match.supported.length }] : [];
  }).sort((a, b) => b.support - a.support || a.drug.name.localeCompare(b.drug.name, "en"));
  const batch = selected.slice(0, 24);
  if (!batch.length) return null;
  const ids = new Set(batch.map(({ id }) => id));
  const page = await chemblRows("mechanism", { molecule_chembl_id__in: [...ids].join(",") },
    "mechanisms", fetcher, signal);
  const records = page.rows.filter((row) => ids.has(row.molecule_chembl_id) && chemblId(row.target_chembl_id));
  const targetIds = [...new Set(records.map((row) => row.target_chembl_id))];
  const metadata = targetIds.length ? await chemblRows("target", { target_chembl_id__in: targetIds.join(",") },
    "targets", fetcher, signal) : { rows: [] };
  const byTarget = new Map(metadata.rows.map((row) => [row.target_chembl_id, row]));
  for (const { id, drug } of batch) {
    const evidence = records.filter((row) => row.molecule_chembl_id === id).map((row) => {
      const raw = byTarget.get(row.target_chembl_id);
      const accessions = new Set(raw?.target_components?.map(({ accession }) => accession) || []);
      const matches = targets.filter((target) => {
        const complex = target.kind === "complex";
        const accepted = complex ? target.componentAccessions || [] : target.uniprotIds || [];
        return raw?.organism === "Homo sapiens" && accessions.size &&
          raw.target_type === (complex ? "PROTEIN COMPLEX" : "SINGLE PROTEIN") &&
          (complex ? accessions.size === accepted.length && accepted.every((value) => accessions.has(value))
            : accessions.size === 1 && accepted.some((value) => accessions.has(value)));
      });
      return {
        sourceType: "chembl",
        recordId: row.mec_id ?? row.target_chembl_id,
        originalUrl: chemblBase + "mechanism.json?" + new URLSearchParams({ molecule_chembl_id: id, target_chembl_id: row.target_chembl_id }),
        rawTargetRecord: raw || { target_chembl_id: row.target_chembl_id },
        targetIds: [matches.length === 1 ? matches[0].id : row.target_chembl_id],
        text: row.mechanism_of_action,
        actionType: row.action_type,
        role: /\b(?:payload|cytotoxic warhead)\b/i.test(row.mechanism_of_action || "") ? "payload"
          : [false, 0].includes(row.direct_interaction) ? "indirect"
          : [true, 1].includes(row.direct_interaction) && matches.length === 1 ? "direct" : "unverified",
        allowBindingAssertion: Boolean(row.mechanism_refs?.length),
        references: row.mechanism_refs,
      };
    });
    drug.targetEvidence = mergeEvidence(curatedTargetEvidence(drug), evidence);
  }
  return { state: records.length ? "success_with_data" : "success_empty",
    queryType: "drug_mechanisms", count: selected.length, returned: batch.length,
    truncated: selected.length > batch.length || page.truncated || metadata.truncated,
    issue: page.issue || metadata.issue };
}

export async function queryMechanisms(
  input,
  { fetcher = fetch, signal = AbortSignal.timeout(22000) } = {},
) {
  const values = parseTargetInput(input?.targets);
  if (values.some((value) => !/^(?:HGNC:\d+|[\p{L}\p{N} ._()/‐‑–-]+)$/iu.test(value)))
    throw new SearchError("invalid_targets");
  const selections = input.resolutions;
  if (
    selections != null &&
    (typeof selections !== "object" ||
      Array.isArray(selections) ||
      Object.entries(selections).some(
        ([name, id]) =>
          !values.includes(name) ||
          typeof id !== "string" ||
          !/^(?:[A-Z0-9]{6,10}|HGNC:\d+|R-HSA-\d+|VEGF-FAMILY)$/.test(id),
      ))
  )
    throw new SearchError("invalid_targets");

  const retrievedAt = new Date().toISOString();
  const identityChecks = [];
  const proteins = await Promise.allSettled(
    values.map(async (value, index) => {
      const selection = Object.hasOwn(selections || {}, value) ? selections[value] : null;
      const composite = resolveComposite(value, selection);
      if (composite) return composite;
      const checks = (identityChecks[index] = {});
      if (/^R-HSA-\d+$/i.test(selection || value) || (!selection && /\bcomplex\b/i.test(value))) {
        const target = await resolveReactomeComplex(value, selection, fetcher, signal, retrievedAt);
        if (target) return target;
      }
      const lookup = (selection || value).replace(/[‐‑–]/g, "-");
      const providerLookup = !selection && /^pd-?1$/i.test(lookup) ? canonicalAlias(lookup) : lookup;
      const hgncId = /^HGNC:\d+$/i.test(lookup);
      const preferHgnc =
        hgncId || (!selection && /[ -]/.test(lookup) && canonicalAlias(lookup) === lookup);
      const lookupGene = async () => {
        try {
          const gene = await resolveHgnc(providerLookup, fetcher, signal, retrievedAt);
          checks.HGNC = { state: gene ? "success_with_data" : "unresolved_target" };
          return gene;
        } catch (error) {
          if (error instanceof SearchError) throw error;
          checks.HGNC = providerIssue(error);
          return null;
        }
      };
      let gene = preferHgnc ? await lookupGene() : null;
      let choice;
      let provisionalProtein;
      if (!gene && !hgncId) {
        try {
          const target = await resolveProtein(providerLookup, selection, fetcher, signal, retrievedAt);
          checks.UniProt = { state: target ? "success_with_data" : "unresolved_target" };
          if (target) {
            target.identity.inputName = value;
            const exactId = [
              target.identity.geneSymbol,
              ...target.identity.ensemblIds,
              ...target.identity.uniprotIds,
            ].some((id) => id.toLowerCase() === canonicalAlias(lookup).toLowerCase());
            if ((selection || exactId) && target.identity.ensemblIds.length < 2) return target;
            provisionalProtein = target;
          }
        } catch (error) {
          if (!(error instanceof SearchError)) {
            checks.UniProt = providerIssue(error);
            throw error;
          }
          choice = error;
        }
      }
      if (!gene && !preferHgnc) gene = await lookupGene();
      if (!gene) {
        if (choice) throw choice;
        if (provisionalProtein && (!preferHgnc || checks.HGNC.state === "unresolved_target"))
          return provisionalProtein;
        if (Object.values(checks).every(({ state }) => state !== "unresolved_target"))
          throw new Error("identity_sources_unavailable");
        return null;
      }
      let protein;
      try {
        protein =
          provisionalProtein?.identity.geneSymbol === gene.symbol
            ? provisionalProtein
            : await resolveProtein(gene.symbol, null, fetcher, signal, retrievedAt);
        if (protein?.identity.geneSymbol !== gene.symbol) protein = null;
        checks.UniProt = { state: protein ? "success_with_data" : "unresolved_target" };
      } catch (error) {
        checks.UniProt = providerIssue(error);
      }
      const target = protein || {
        identity: {
          id: gene.symbol,
          geneSymbol: gene.symbol,
          canonicalName: gene.name,
          entityType: "other",
          ensemblIds: gene.ensemblId ? [gene.ensemblId] : [],
          uniprotIds: [],
          reactomeIds: [],
          species: "Homo sapiens",
          resolutionStatus: "resolved",
          synonyms: [],
        },
        biology: { targetId: gene.symbol, biologicalFunctions: [], pathways: [], sources: [] },
      };
      Object.assign(target.identity, {
        inputName: value,
        canonicalId: gene.ensemblId || gene.hgncId,
        primaryEnsemblId: gene.ensemblId || target.identity.primaryEnsemblId,
        hgncId: gene.hgncId,
        synonyms: [...new Set([...target.identity.synonyms, ...gene.synonyms])],
        identitySource: gene.source,
      });
      return target;
    }),
  );
  const unresolved = (inputName, resolutionStatus) => ({
    identity: {
      id: canonicalAlias(inputName),
      inputName,
      canonicalName: canonicalAlias(inputName),
      entityType: "unresolved",
      synonyms: [],
      uniprotIds: [],
      ensemblIds: [],
      reactomeIds: [],
      resolutionStatus,
    },
  });
  const targetEntries = proteins.map((result, index) => {
    if (result.reason instanceof SearchError) throw result.reason;
    return (
      result.value ||
      unresolved(values[index], result.status === "rejected" ? "failed" : "unresolved")
    );
  });
  const targetsById = new Map();
  for (const target of targetEntries) {
    if (!targetsById.get(target.identity.id)?.biology) targetsById.set(target.identity.id, target);
  }
  const targets = [...targetsById.values()];
  const identities = targets.map(({ identity }) => identity);
  const resolvedTargets = identities.map((identity) => ({
    id: identity.id,
    label: identity.id,
    aliases: [...new Set([identity.inputName, ...identity.synonyms])],
    canonicalId: identity.canonicalId,
    canonicalName: identity.canonicalName,
    resolutionStatus: identity.resolutionStatus,
    ensemblIds: identity.ensemblIds,
    uniprotIds: identity.uniprotIds,
    hgncId: identity.hgncId,
    subunits: identity.subunits,
    componentAccessions: identity.componentAccessions,
    literatureNames: [
      ...new Set([identity.inputName, identity.canonicalName, ...identity.synonyms]),
    ]
      .filter((name) => name !== identity.id && name.length <= 100)
      .slice(0, 5),
    kind: identity.entityType === "protein_complex" ? "complex" : identity.entityType,
    ensemblId: identity.primaryEnsemblId,
  }));

  const eligibleBiology = targets.filter(
    ({ identity, biology }) => biology && identity.primaryEnsemblId,
  );
  const [pathways, chembl, online, expressions, associations] = await Promise.all([
    Promise.allSettled(
      targets
        .filter(({ biology }) => biology)
        .map((target) =>
          target.identity.uniprotIds.length || target.identity.reactomeIds.length
            ? fetchPathways(target, fetcher, signal, retrievedAt)
            : [],
        ),
    ),
    fetchChemblMechanisms(identities, fetcher, signal, retrievedAt).catch((error) => ({
      state: "failed",
      error: providerError(error),
      issue: providerIssue(error),
      drugs: [],
      mechanisms: [],
    })),
    searchOnline(
      { targets: values, includeClinical: true },
      {
        fetcher,
        signal: AbortSignal.any([signal, AbortSignal.timeout(7500)]),
        resolvedTargets,
        discoveryTargets: identities.flatMap((identity) =>
          (identity.discoveryGenes || []).map((gene) => ({ ...gene, discoveryFor: identity.id })),
        ),
      },
    ),
    Promise.allSettled(
      eligibleBiology.map(({ identity }) =>
        fetchExpression(identity, fetcher, signal, retrievedAt),
      ),
    ),
    Promise.allSettled(
      eligibleBiology.map(({ identity }) =>
        fetchDiseaseAssociations(identity, fetcher, signal, retrievedAt),
      ),
    ),
  ]);

  online.catalog.targetEvidenceMatching = true;
  const mechanisms = [...chembl.mechanisms];
  const existing = new Map(online.catalog.drugs.map((drug) => [drug.id, drug]));
  for (const molecule of chembl.drugs) {
    const rows = mechanisms.filter((row) => row.drugId === molecule.molecule_chembl_id);
    const evidenceRows = (chembl.targetEvidence || []).filter((row) => row.drugId === molecule.molecule_chembl_id);
    const sameName = online.catalog.drugs.filter(
      (drug) =>
        drug.verification === "reviewed" &&
        drug.name.trim().toLowerCase() === molecule.pref_name.trim().toLowerCase(),
    );
    const prior =
      existing.get(molecule.molecule_chembl_id) ||
      online.catalog.drugs.find(
        (drug) => drug.externalIds?.chembl === molecule.molecule_chembl_id,
      ) ||
      (sameName.length === 1 ? sameName[0] : null);
    if (prior) {
      prior.molecularFormat ||= molecule.molecule_type;
      prior.proposedTargetIds = [
        ...new Set([...(prior.proposedTargetIds || []), ...molecule.proposedTargetIds]),
      ];
      rows.forEach((row) => {
        row.drugId = prior.id;
      });
      prior.targetEvidence = mergeEvidence(curatedTargetEvidence(prior), evidenceRows);
      continue;
    }
    const drug = {
      id: molecule.molecule_chembl_id,
      name: molecule.pref_name,
      brand: "",
      targetIds: [...new Set(rows.flatMap((row) => row.targetIds))],
      targetSetComplete: false,
      targetEvidence: evidenceRows,
      proposedTargetIds: molecule.proposedTargetIds,
      reportedTargetSets: rows.map((row) => row.targetIds),
      clinicalStage: chemblStage(molecule),
      approval: { agency: "unknown", status: "unknown" },
      sourceId: "chembl-" + molecule.molecule_chembl_id,
      verification: "imported",
      mechanisms: rows.map((row) => row.mechanismDescription),
    };
    online.catalog.drugs.push(drug);
    existing.set(drug.id, drug);
    online.catalog.sources.push({
      id: drug.sourceId,
      title: "ChEMBL · " + drug.name,
      url: "https://www.ebi.ac.uk/chembl/explore/compound/" + drug.id,
      recordId: drug.id,
      verification: "imported",
    });
  }

  // Form equivalence comes from documented product identity, never a stripped name alone.
  const remappedDrugs = new Map();
  for (const drug of online.catalog.drugs) {
    const identity = reviewedMechanism(drug.name)?.identity;
    const molecule = chembl.drugs.find(({ molecule_chembl_id }) => molecule_chembl_id === drug.id);
    const parent = molecule?.molecule_hierarchy?.parent_chembl_id;
    const primaryId = identity?.equivalentIds.includes(drug.id) ? identity.primaryId : parent;
    const primary = existing.get(primaryId);
    if (primary?.clinicalStage === "WITHDRAWN" || drug.clinicalStage === "WITHDRAWN") continue;
    if (
      !primary ||
      drug.id === primary.id
    )
      continue;
    primary.aliases = [
      ...new Set([...(primary.aliases || []), drug.name, ...(drug.aliases || [])]),
    ];
    primary.proposedTargetIds = [
      ...new Set([...(primary.proposedTargetIds || []), ...(drug.proposedTargetIds || [])]),
    ];
    primary.targetEvidence = mergeEvidence(curatedTargetEvidence(primary), curatedTargetEvidence(drug));
    primary.sourceIds = [...new Set([...(primary.sourceIds || []), drug.sourceId].filter(Boolean))];
    if (identity?.source) primary.identityEvidence = identity.source;
    if (
      drug.clinicalStage === "APPROVAL" &&
      !["WITHDRAWN", "SUSPENDED"].includes(primary.clinicalStage)
    )
      primary.clinicalStage = "APPROVAL";
    remappedDrugs.set(drug.id, primary.id);
  }
  if (remappedDrugs.size) {
    for (const [id, parent] of remappedDrugs) {
      if (remappedDrugs.has(parent)) remappedDrugs.delete(id);
    }
    for (const row of mechanisms) {
      row.drugId = remappedDrugs.get(row.drugId) || row.drugId;
    }
  }

  const sourceById = new Map(online.catalog.sources.map((source) => [source.id, source]));
  for (const drug of online.catalog.drugs) {
    const record = sourceById.get(drug.sourceId);
    if (!record || record.id.startsWith("chembl-")) continue;
    const sourceName = record.title.split(" · ")[0];
    const isReviewed = drug.verification === "reviewed";
    const source = evidence(
      sourceName,
      record.recordId || drug.id,
      record.url,
      isReviewed ? null : retrievedAt,
      {
        title: record.title,
        verificationStatus: drug.verification,
        sourceType: isReviewed ? "regulatory_record" : "curated_database",
        evidenceDescription: record.locator,
        checkedAt: record.checkedAt,
      },
    );
    const rows =
      drug.mechanismRecords ||
      (drug.mechanisms || []).map((text) => ({ text, targetIds: drug.targetIds }));
    mechanisms.push(
      ...rows.map(({ text, targetIds, actionType, references }) => ({
        drugId: remappedDrugs.get(drug.id) || drug.id,
        drugName: existing.get(remappedDrugs.get(drug.id))?.name || drug.name,
        targetIds,
        molecularFormat: drug.molecularFormat,
        actionType: actionType || drug.actionType,
        mechanismDescription: text,
        developmentStatus: {
          globalDevelopmentPhase: drug.clinicalStage,
          regulatoryApprovals:
            drug.regulatoryApprovals ||
            (drug.approval.status === "approved" ? [drug.approval] : []),
        },
        evidenceStatus:
          isReviewed || drug.targetSetComplete === true
            ? "direct_evidence"
            : "related_drug_evidence",
        completeTargetSet:
          (isReviewed && drug.targetSetComplete !== false) ||
          (drug.targetSetComplete === true &&
            targetIds.length === drug.targetIds.length &&
            targetIds.every((id) => drug.targetIds.includes(id))),
        sources: [{ ...source, ...(references?.length ? { references } : {}) }],
      })),
    );
  }
  online.catalog.drugs = online.catalog.drugs.filter(({ id }) => !remappedDrugs.has(id));
  const sameScope = (left, right) =>
    left.drugId === right.drugId &&
    left.targetIds.length === right.targetIds.length &&
    left.targetIds.every((id) => right.targetIds.includes(id));
  for (const row of mechanisms) {
    const action = row.actionType?.toUpperCase();
    const opposite =
      action === "AGONIST" ? "ANTAGONIST" : action === "ANTAGONIST" ? "AGONIST" : null;
    if (
      opposite &&
      mechanisms.some(
        (other) =>
          other.actionType?.toUpperCase() === opposite &&
          other.sources[0].sourceName !== row.sources[0].sourceName &&
          sameScope(row, other),
      )
    ) {
      row.evidenceStatus = "conflicting_evidence";
    }
  }
  targets
    .filter(({ biology }) => biology)
    .forEach(({ biology }, index) => {
      const result = pathways[index];
      biology.pathwayStatus =
        result.status === "rejected" ? "failed" : result.value.length ? "ok" : "empty";
    });
  const biologyChecks = (results) =>
    results.map((result, index) => ({
      targetId: eligibleBiology[index].identity.id,
      ...(result.status === "rejected"
        ? providerIssue(result.reason)
        : { state: result.value.length ? "success_with_data" : "success_empty" }),
    }));
  eligibleBiology.forEach(({ biology }, index) => {
    biology.expressionProfiles = expressions[index].value || [];
    biology.diseaseAssociations = associations[index].value || [];
    biology.diseaseExpression = reviewedDiseaseExpression(eligibleBiology[index].identity);
  });
  const normalizeDrugs = () => {
    for (const drug of online.catalog.drugs) {
      const prepared = prepareTargetMatch(drug, resolvedTargets);
      drug.targetIds = [...prepared.direct];
      drug.normalizedTargetEvidence = prepared.evidence;
    }
  };
  normalizeDrugs();
  const [fdaReview, chemblReview] = await Promise.all([
    reviewFdaLabels(online.catalog.drugs, resolvedTargets, {
      fetcher, signal: AbortSignal.any([signal, AbortSignal.timeout(4500)]),
    }),
    reviewChemblDrugs(online.catalog.drugs, resolvedTargets, fetcher,
      AbortSignal.any([signal, AbortSignal.timeout(4500)])).catch((error) => ({
      ...providerIssue(error), queryType: "drug_mechanisms",
    })),
  ]);
  for (const drug of online.catalog.drugs) {
    const records = fdaReview.verified.get(drug.id) || [];
    if (records.length) drug.targetEvidence = mergeEvidence(curatedTargetEvidence(drug), records);
  }
  normalizeDrugs();
  const mechanismKey = (id, ids, text) => JSON.stringify([id, [...ids].sort(), text]);
  const existingDirect = new Set(mechanisms.filter(({ evidenceStatus }) => evidenceStatus === "direct_evidence")
    .map(({ drugId, targetIds, mechanismDescription }) => mechanismKey(drugId, targetIds, mechanismDescription)));
  for (const drug of online.catalog.drugs) {
    const prepared = prepareTargetMatch(drug, resolvedTargets);
    for (const row of prepared.evidence.filter(({ role, text }) => role === "direct" && text)) {
      const ids = row.assertedTargetIds || row.normalizedTargetIds;
      if (!ids.length) continue;
      const reference = row.references?.find(({ urls }) =>
        Array.isArray(urls) && urls.some((url) => typeof url === "string" && /^https:\/\//i.test(url)));
      const originalUrl = reference?.urls.find((url) => typeof url === "string" && /^https:\/\//i.test(url))
        || row.originalUrl || sourceById.get(row.sourceId || drug.sourceId)?.url;
      if (!originalUrl) continue;
      const classification = classifyTargetMatch(prepared, ids);
      const key = mechanismKey(drug.id, ids, row.text);
      if (!row.complete && classification?.state !== "conflict" && existingDirect.has(key)) continue;
      existingDirect.add(key);
      mechanisms.unshift({
        drugId: drug.id,
        drugName: drug.name,
        targetIds: ids,
        actionType: row.actionType,
        molecularFormat: drug.molecularFormat,
        mechanismDescription: row.text,
        evidenceStatus: classification?.state === "conflict" ? "conflicting_evidence" : "direct_evidence",
        completeTargetSet: row.complete && classification?.state === "verified",
        sources: [evidence(reference?.source || row.sourceType, reference?.ids?.[0] || String(row.recordId ?? drug.id),
          originalUrl, retrievedAt, { evidenceDescription: row.text })],
      });
    }
  }
  const aggregateChecks = (rows) =>
    sourceState(
      rows.map(({ state }) =>
        state === "success_with_data"
          ? "ok"
          : ["success_empty", "unresolved_target"].includes(state)
            ? "empty"
            : "failed",
      ),
    );
  const identitySourceChecks = (name) =>
    identityChecks.flatMap((checks, index) =>
      checks?.[name] ? [{ targetId: values[index], ...checks[name] }] : [],
    );
  const sourceStatus = {
    UniProt: aggregateChecks(identitySourceChecks("UniProt")),
    HGNC: aggregateChecks(identitySourceChecks("HGNC")),
    "Human Protein Atlas": aggregateChecks(biologyChecks(expressions)),
    "Open Targets (disease associations)": aggregateChecks(biologyChecks(associations)),
    Reactome: sourceState(
      pathways.map((result) =>
        result.status === "rejected" ? "failed" : result.value.length ? "ok" : "empty",
      ),
    ),
    ChEMBL: chembl.coverage?.some(({ issue }) => issue) ? "partial" : chembl.state,
    "Open Targets": online.openTargetsStatus,
    FDA: aggregateChecks(fdaReview.checks.filter(({ state }) => state !== "not_queried")),
    EMA: "not_queried",
    NMPA: "not_queried",
    "ClinicalTrials.gov": "not_queried",
    PubMed: "not_queried",
  };
  const sourceChecks = {
    ...Object.fromEntries(["UniProt", "HGNC"].map((name) => [name, identitySourceChecks(name)])),
    "Human Protein Atlas": biologyChecks(expressions),
    "Open Targets (disease associations)": biologyChecks(associations),
    Reactome: targets
      .filter(({ biology }) => biology)
      .map(({ identity }, index) => ({
        targetId: identity.id,
        ...(pathways[index].status === "rejected"
          ? providerIssue(pathways[index].reason)
          : { state: pathways[index].value.length ? "success_with_data" : "success_empty" }),
      })),
    ChEMBL:
      chembl.state === "not_queried"
        ? (chemblReview ? [chemblReview] : [])
        : [
            chembl.issue || {
              state: chembl.state === "ok" ? "success_with_data" : "success_empty",
              truncated: chembl.coverage?.some(({ truncated }) => truncated),
              resources: chembl.coverage,
            },
            ...(chemblReview ? [chemblReview] : []),
            ...(chembl.coverage || []).flatMap(({ resource, issue }) =>
              issue ? [{ resource, ...issue }] : [],
            ),
          ],
    "Open Targets": online.openTargetsChecks,
    FDA: [...fdaReview.checks, ...(fdaReview.truncated ? [{ state: "not_queried", truncated: true }] : [])],
  };
  return {
    query: values,
    resolvedTargets: identities,
    trialCandidates: [],
    targetBiology: targets.flatMap(({ biology }) => (biology ? [biology] : [])),
    relatedDrugs: online.catalog.drugs.filter((drug) =>
      drug.targetIds.some((id) => identities.some((target) => target.id === id)),
    ),
    drugMechanisms: mechanisms.filter((row) =>
      row.targetIds.some((id) => identities.some((target) => target.id === id)),
    ),
    sourceStatus,
    sourceChecks,
    sourceErrors: {
      UniProt: proteins.flatMap((result, index) =>
        result.status === "rejected"
          ? [{ input: values[index], code: providerError(result.reason) }]
          : [],
      ),
      Reactome: targets
        .filter(({ biology }) => biology)
        .flatMap(({ identity }, index) =>
          pathways[index].status === "rejected"
            ? [{ targetId: identity.id, code: providerError(pathways[index].reason) }]
            : [],
        ),
      ChEMBL: chembl.error ? [{ code: chembl.error }] : [],
      "Open Targets": online.openTargetsErrors,
    },
    partialFailures: Object.entries(sourceStatus)
      .filter(([, state]) => ["failed", "partial"].includes(state))
      .map(([name]) => name),
    retrievedAt,
    catalog: online.catalog,
  };
}
