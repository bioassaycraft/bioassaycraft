<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import MobileToolHeader from "../components/common/MobileToolHeader.vue";
import SiteFooter from "../components/layout/SiteFooter.vue";
import { useLocale } from "../utils/locale";
import { animateElement, getPanelEnterKeyframes } from "../utils/motion.js";
import { sampleCatalog } from "../lib/target-to-assay/catalog.js";
import { searchDrugs } from "../lib/target-to-assay/search.js";
import InvestigationalDrugs from "../components/target-to-assay/InvestigationalDrugs.vue";
import MechanismEvidence from "../components/target-to-assay/MechanismEvidence.vue";
import { nciDrugLink, targetSourceLinks } from "../lib/target-to-assay/external-links.js";
import CandidateDrugTable from "../components/target-to-assay/CandidateDrugTable.vue";
import BilingualMechanism from "../components/target-to-assay/BilingualMechanism.vue";
import { bilingualMechanism, reviewedMechanism } from "../lib/target-to-assay/bilingual-mechanism.js";
import {
  approvalMilestones,
  evidenceFor,
} from "../lib/target-to-assay/evidence.js";
import { reviewedFdaRecord, validApprovalDate } from "../lib/target-to-assay/approval-records.js";
import { rankMatches, researchProfile } from "../lib/target-to-assay/research.js";
import { candidateView, explorerView, fdaDocumentDisplay, fdaReviewLimit, regulatorGroups, uniqueIndications, visibleReviewDocuments } from "../lib/target-to-assay/presentation.js";
import { displayAssayLiterature, literatureSearchUrl, literatureTerm } from "../lib/target-to-assay/literature.js";
import { loadSupplement } from "../lib/target-to-assay/supplement-client.js";
import {
  conditionName,
  organizationName,
  drugDisplayName,
  drugHeadingName,
  chineseDrugName,
} from "../lib/target-to-assay/display.js";
import { targetAssayCopy } from "../i18n/target-to-assay.js";

const { locale, setLocale } = useLocale();
const c = computed(() => targetAssayCopy[locale.value]);
function stageLabel(stage) {
  if (stage === "UNKNOWN") return c.value.mechanism.unknownStage;
  if (stage === "REPORTED_APPROVAL") return c.value.mechanism.phaseOnly;
  if (stage === "APPROVAL") return c.value.approvalStage;
  if (stage === "EARLY_PHASE_1") return locale.value === "zh" ? "早期临床 1 期" : "Early Phase 1";
  const match = stage.match(/^PHASE_?([1-4])(?:_([1-4]))?$/);
  if (!match) return drugDisplayName(stage.replaceAll("_", " "));
  const phase = match.slice(1).filter(Boolean).join("/");
  return locale.value === "zh" ? `临床 ${phase} 期` : `Phase ${phase}`;
}
const input = ref("");
const mechanismResult = ref(null);
const submitted = ref("CD3 × CD20");
const error = ref(null);
const loading = ref(false);
const activeKey = ref("CD3|CD20");
const data = ref(sampleCatalog);
const resolutions = ref({});
const documents = ref({});
const emaRecords = ref({});
const emaStatus = ref("idle");
const documentState = ref({});
const expandedDocuments = ref({});
const drugPanel = ref(null);
const visibleCount = ref(8);
const visibleMatches = computed(() =>
  showCandidates.value ? [] : rankMatches(active.value.matches, drugPresentation.value).slice(0, visibleCount.value),
);
watch([activeKey, submitted], () => {
  visibleCount.value = 8;
});
let controller;
const documentControllers = new Set();
const isHeaderMorphed = ref(false);
const headerMorphTrigger = ref(null);
let headerMorphObserver;
onMounted(() => {
  if (!("IntersectionObserver" in window) || !headerMorphTrigger.value) return;
  headerMorphObserver = new IntersectionObserver(([entry]) => {
    isHeaderMorphed.value = !entry.isIntersecting;
  }, { rootMargin: "-48px 0px 0px 0px" });
  headerMorphObserver.observe(headerMorphTrigger.value);
});
onBeforeUnmount(() => {
  headerMorphObserver?.disconnect();
  controller?.abort();
  controller = null;
  documentControllers.forEach((v) => v.abort());
});
const result = computed(() =>
  searchDrugs(
    {
      targets: submitted.value,
      matchMode: "verified_scope",
      includeClinical: true,
    },
    data.value,
  ),
);
const view = computed(() => explorerView(result.value, activeKey.value, drugPresentation.value));
const resultGroups = computed(() => view.value.groups);
const fallback = computed(() => resultGroups.value.length > 1 && !resultGroups.value[0].matches.length);
const active = computed(() => view.value.active);
const showCandidates = computed(() => view.value.showCandidates);
function targetNames(ids) {
  return ids
    .map((id) => {
      const target = mechanismResult.value?.resolvedTargets.find((item) => item.id === id);
      const alias = target?.inputName;
      return alias && alias.toLowerCase() !== id.toLowerCase() && !/^ENSG\d+$/i.test(alias)
        ? `${alias} (${id})`
        : id;
    })
    .join(" × ");
}
const discoveryChecks = computed(() => Object.values(mechanismResult.value?.sourceChecks || {}).flat());
const discoveryTruncated = computed(() => discoveryChecks.value.some(({ truncated }) => truncated));
const unresolvedScope = computed(() => mechanismResult.value?.resolvedTargets.some((target) =>
  active.value.targetIds.includes(target.id) && target.resolutionStatus !== "resolved"));
const discoveryFailed = computed(() => discoveryChecks.value.some(({ state }) => !["success_with_data", "success_empty", "unresolved_target", "not_queried"].includes(state)));
const additionalCandidates = computed(() => {
  const candidates = view.value.candidates;
  const labels = {
    partial: "partialMatch", unverified: "unverifiedMatch",
    other: "otherTargets", conflict: "conflictingMatch",
  };
  return candidates.map((match) => {
    const { drugId } = match;
    const drug = drugById(drugId);
    const status = {
      non_direct_relationship: "nonDirectMatch", scope_not_established: "scopePending",
    }[match.reason] || labels[match.state];
    return {
      drug: status === "conflictingMatch" ? {
        ...drug, normalizedTargetEvidence: drug.normalizedTargetEvidence?.map((row) => ({
          ...row, sourceUrl: sourceById(row.sourceId)?.url,
        })),
      } : drug,
      status, url: sourceById(drug.sourceId)?.url,
    };
  });
});
const sourceById = (id) => data.value.sources.find((source) => source.id === id);
const activeTargets = computed(() =>
  result.value.resolvedTargets.filter((target) => active.value.targetIds.includes(target.id)),
);
const paperTerm = computed(() => literatureTerm(activeTargets.value));
const paperDrugs = computed(() => active.value.matches.slice(0, 4).flatMap(({ drugId }) => {
  const drug = drugById(drugId);
  return [drug.name, drug.brand].filter((name) => typeof name === "string" &&
    /^[\p{L}\p{N}][\p{L}\p{N} .()/'’+,-]{0,139}$/u.test(name));
}));
const paperKey = computed(() => JSON.stringify([paperTerm.value, paperDrugs.value]));
const literature = ref({});
const currentLiterature = computed(() => literature.value[paperKey.value]);
async function supplementAbstracts(papers, signal) {
  const missing = papers.filter(({ publicAbstract }) => !publicAbstract);
  const pmids = missing.flatMap(({ pmid }) => /^\d{1,10}$/.test(pmid || "") ? [pmid] : []);
  const dois = missing.flatMap(({ pmid, doi }) =>
    !pmid && /^10\.\d{4,9}\/[a-z0-9._;()/+:-]{1,140}$/i.test(doi || "") ? [doi] : []);
  if (!pmids.length && !dois.length) return;
  try {
    const { rows } = await loadSupplement("literature-abstracts", { pmids, dois }, signal);
    for (const paper of missing) {
      const sameVersion = rows.find((row) => (paper.pmid && row.pmid === paper.pmid) ||
        (paper.doi && row.doi === paper.doi));
      if (sameVersion?.publicAbstract) paper.publicAbstract = sameVersion.publicAbstract;
      paper.abstractSource ||= sameVersion?.abstractSource;
    }
  } catch {
    // Metadata and abstracts from the initial search remain available.
  }
}
async function loadLiterature() {
  const term = paperTerm.value;
  const key = paperKey.value;
  const drugs = paperDrugs.value;
  if (!term || Object.values(literature.value).some(({ state }) => state === "loading")) return;
  literature.value[key] = { state: "loading" };
  const abort = new AbortController();
  documentControllers.add(abort);
  const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]);
  try {
    const response = displayAssayLiterature(await loadSupplement("assay-literature", { term, drugs }, signal), term, drugs);
    literature.value[key] = { ...response, state: "loaded" };
    await supplementAbstracts(literature.value[key].papers, AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]));
  } catch (error) {
    if (abort.signal.aborted) return;
    literature.value[key] = {
      state: "error",
      code: signal.aborted || error.name === "TimeoutError" ? "timeout" : error.message,
    };
  } finally {
    documentControllers.delete(abort);
  }
}
const resultCount = computed(
  () =>
    new Set(
      resultGroups.value.flatMap((group) =>
        result.value.combinations
          .find((item) => item.key === group.key)
          .matches.map((match) => match.drugId),
      ),
    ).size,
);
const externalTargetLinks = computed(() =>
  targetSourceLinks(activeTargets.value, mechanismResult.value?.resolvedTargets || [], paperTerm.value, c.value),
);
const drugById = (id) => data.value.drugs.find((d) => d.id === id);
const drugPresentation = computed(() => Object.fromEntries(data.value.drugs.map((drug) => {
  const reviewed = reviewedFdaRecord(drug);
  const regional = approvalMilestones(drug, documents.value[drug.id], emaRecords.value[drug.name]);
  const earliest = regional.filter((item) => !item.certificate &&
    !["Withdrawn", "Suspended"].includes(item.status) && validApprovalDate(item.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.region.localeCompare(b.region))[0];
  const special = ["WITHDRAWN", "SUSPENDED", "TERMINATED", "DISCONTINUED"].includes(drug.clinicalStage);
  const euStatus = regional.find((item) => item.region === "EU")?.status;
  const stage = special ? drug.clinicalStage : earliest || drug.approval.status === "approved" ? "APPROVAL" : ["Withdrawn", "Suspended"].includes(euStatus) ? euStatus.toUpperCase() :
      drug.clinicalStage === "APPROVAL" ? "REPORTED_APPROVAL" : drug.clinicalStage || "UNKNOWN";
  const format = drug.molecularFormat || researchProfile(drug)?.type.en || "";
  const isZynlonta = documents.value[drug.id]?.some((doc) => doc.kind === "overview" && doc.application === "BLA761196") ||
    emaRecords.value[drug.name]?.url === "https://www.ema.europa.eu/en/medicines/human/EPAR/zynlonta";
  const type = reviewedMechanism(drug.name)?.type || reviewed?.type || (isZynlonta ? "adc" : /car[- ]?t|cell therapy/i.test(format) ? "car_t" :
    /antibody.drug conjugate|\badc\b/i.test(format) ? "adc" :
    /trispecific/i.test(format) ? "trispecific" : /bispecific/i.test(format) ? "bispecific" :
      (/monoclonal/i.test(format) && !/bispecific|trispecific/i.test(format)) ? "monoclonal" : "other");
  return [drug.id, { name: drug.name, brand: drug.brand || reviewed?.brand, stage, date: earliest?.date, earliest, regional, type, reviewed, isZynlonta }];
})));
const approvalScope = computed(() => active.value.matches.map(({ drugId }) => drugById(drugId))
  .filter((drug) => drug.clinicalStage === "APPROVAL" || drug.approval.status === "approved")
  .map(({ id }) => id).sort().join("|"));
watch(approvalScope, async (scope, _, onCleanup) => {
  if (!scope || typeof window === "undefined") return;
  const drugs = scope.split("|").map(drugById);
  const abort = new AbortController();
  onCleanup(() => abort.abort());
  const names = [...new Set(drugs.map(({ name }) => name))];
  emaStatus.value = "loading";
  const emaTask = async () => {
    try {
      for (let offset = 0; offset < names.length && !abort.signal.aborted; offset += 50) {
        const response = await fetch("/api/v1/target-to-assay/ema-approvals", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: names.slice(offset, offset + 50) }), signal: abort.signal,
        });
        if (!response.ok) throw new Error("ema_unavailable");
        const { records } = await response.json();
        if (!abort.signal.aborted) emaRecords.value = { ...emaRecords.value, ...records };
      }
      if (!abort.signal.aborted) emaStatus.value = "loaded";
    } catch {
      if (!abort.signal.aborted) emaStatus.value = "error";
    }
  };
  const missing = drugs.filter((drug) => !validApprovalDate(drugPresentation.value[drug.id].regional
    .find((item) => item.region === "US")?.date));
  const fdaTask = async (offset) => {
    for (let index = offset; index < missing.length && !abort.signal.aborted; index += 3)
      await loadDocuments(missing[index]);
  };
  await Promise.all([emaTask(), ...[0, 1, 2].map(fdaTask)]);
}, { immediate: true, flush: "post" });

function drugMechanism(drug, details) {
  const card = targetAssayCopy.zh.drugCard;
  const translations = {
    BLA761142: card.inebilizumab,
    BLA761163: card.tafasitamab,
    BLA125557: card.blinatumomab,
    BLA761263: card.cd20Bispecific,
    BLA761309: card.cd20Bispecific,
    BLA761324: card.cd20Bispecific,
    "EMEA/H/C/006215": card.cd20Bispecific,
  };
  const application = details.reviewed?.application || drug.approval?.identifier?.replace(/\s+/g, "");
  const zh = details.isZynlonta ? card.zynlonta : details.type === "car_t" && details.reviewed
    ? card.cd19CarT : translations[application];
  const rows = mechanismResult.value?.drugMechanisms.filter((row) => row.drugId === drug.id &&
    row.evidenceStatus === "direct_evidence" && active.value.targetIds.every((id) => row.targetIds.includes(id)));
  const row = rows?.find((row) => row.completeTargetSet) || rows?.[0];
  const original = details.type === "car_t" && details.reviewed ? targetAssayCopy.en.drugCard.cd19CarT :
    details.isZynlonta ? targetAssayCopy.en.drugCard.zynlonta : (row?.mechanismDescription || drug.mechanisms?.[0]);
  return bilingualMechanism(drug.name, original, row?.sources[0], zh);
}

function drugStatusLabel(drugId) {
  const { name, stage, date } = drugPresentation.value[drugId];
  if (!date && (stage === "APPROVAL" || reviewedMechanism(name)?.chinaApproved))
    return c.value.drugCard.approvedWithoutDate;
  return c.value.drugCard.stages[stage] || c.value.drugCard.highest + " " + stageLabel(stage);
}

function regionRows(drugId) {
  const drug = drugById(drugId);
  const rows = drugPresentation.value[drugId].regional;
  const reviewed = reviewedMechanism(drug.name);
  if (!reviewed?.chinaApproved) return rows;
  return rows.map((row) => row.region === "CN" && !row.date
    ? { ...row, approvedWithoutDate: true, url: reviewed.mechanismSource.originalUrl }
    : row);
}

const visibleDocuments = (drug) => [
  ...evidenceFor(drug, data.value.sources),
  ...(documents.value[drug.id] || []),
];
const reviewLists = computed(() => Object.fromEntries(visibleMatches.value.map(({ drugId }) => {
  const drug = drugById(drugId);
  const docs = visibleDocuments(drug).map((doc) => doc.kind === "activity"
    ? { ...doc, kind: "review", url: doc.url.split("#")[0] } : doc);
  const epar = emaRecords.value[drug.name]?.url || researchProfile(drug)?.url;
  if (epar) docs.push({ agency: "EMA", kind: "overview", title: "EPAR – Medicine Overview", url: epar });
  else {
    const history = docs.find((doc) => doc.agency === "EMA" && doc.kind === "history");
    if (history) docs.push({ agency: "EMA", kind: "overview", title: "EPAR – Medicine Overview", url: history.url.split("#")[0] });
  }
  return [drugId, regulatorGroups(docs)];
})));
function otherSources(drug, groups) {
  const displayed = new Set(groups.flatMap(({ docs }) => docs.map(({ url }) => url)));
  const sources = [drug.sourceId, ...(drug.sourceIds || [])].map(sourceById).filter(Boolean)
    .filter(({ url }) => !/^https:\/\/(?:www\.)?(?:accessdata\.fda\.gov|fda\.gov|ema\.europa\.eu)\//i.test(url))
    .map(({ title, url }) => ({ title: title.split(" · ")[0], url }));
  for (const id of chemblIds(drug)) sources.push({ title: "ChEMBL", url: `https://www.ebi.ac.uk/chembl/explore/compound/${id}` });
  const nci = nciDrugLink(drug.name);
  if (nci) sources.push({ title: c.value.mechanism.nci, url: nci });
  const identity = drug.identityEvidence;
  const mechanism = reviewedMechanism(drug.name)?.mechanismSource;
  if (identity) sources.push({ title: identity.sourceName || identity.recordId, url: identity.originalUrl });
  if (mechanism) sources.push({ title: mechanism.sourceName, url: mechanism.originalUrl });
  return [...new Map(sources.filter(({ url }) => url && !displayed.has(url)).map((source) => [source.url, source])).values()];
}
const fdaReviewCount = (id) => reviewLists.value[id]?.find(({ agency }) => agency === "FDA")
  ?.docs.filter((doc) => doc.kind === "review").length || 0;
const chemblIds = (drug) => [drug.id, drug.externalIds?.chembl].filter((id) => /^CHEMBL\d+$/.test(id));
const chemblKey = computed(() => [...new Set(visibleMatches.value.flatMap(({ drugId }) =>
  chemblIds(drugById(drugId))))].sort().join(","));
const chemblResults = ref({});
const drugIndications = (drugId) =>
  uniqueIndications((chemblResults.value[chemblKey.value]?.rows || [])
    .filter((row) => chemblIds(drugById(drugId)).includes(row.id)));
const expandedIndications = ref({});
watch(chemblKey, async (key) => {
  if (!key || chemblResults.value[key] || typeof window === "undefined") return;
  chemblResults.value[key] = { state: "loading" };
  const abort = new AbortController();
  documentControllers.add(abort);
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    const ids = key.split(",");
    const rows = [];
    let truncated = false;
    for (let i = 0; i < ids.length; i += 12) {
      if (abort.signal.aborted) break;
      const result = await loadSupplement("chembl-indications", { ids: ids.slice(i, i + 12) }, abort.signal);
      rows.push(...result.rows);
      truncated ||= result.truncated;
    }
    chemblResults.value[key] = { state: "loaded", rows, truncated };
  } catch {
    chemblResults.value[key] = { state: "error" };
  } finally {
    clearTimeout(timer);
    documentControllers.delete(abort);
  }
});
function toggleDocuments(key, event) {
  const element = event.currentTarget.parentElement;
  expandedDocuments.value[key] = !expandedDocuments.value[key];
  nextTick(() => animateElement(element, getPanelEnterKeyframes(2)));
}
const cdeCopyState = ref({});
async function copyCdeKeyword(drug) {
  try {
    await navigator.clipboard.writeText(chineseDrugName(drug.name) || drug.name);
    cdeCopyState.value[drug.id] = "copied";
  } catch {
    cdeCopyState.value[drug.id] = "manual";
  }
}
function chooseCombination(key) {
  activeKey.value = key;
  nextTick(() => animateElement(drugPanel.value, getPanelEnterKeyframes(4)));
}
function submitOnEnter(event) {
  if (event.shiftKey || event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  if (!event.repeat) submit();
}
async function submit() {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  const timeout = setTimeout(() => request.abort(), 27000);
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch("/api/v1/target-to-assay/mechanisms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targets: input.value, resolutions: resolutions.value }),
      signal: request.signal,
    });
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw { code: "mechanism_response" };
    const next = await response.json();
    if (controller !== request) return;
    if (!response.ok) throw next?.error;
    if (!next?.catalog || !Array.isArray(next.resolvedTargets) || !next.sourceChecks)
      throw { code: "mechanism_response" };
    data.value = next.catalog;
    submitted.value = next.resolvedTargets.map((t) => t.id);
    mechanismResult.value = next;
    activeKey.value = resultGroups.value[0].key;
    await nextTick();
    if (controller === request) animateElement(drugPanel.value, getPanelEnterKeyframes());
  } catch (e) {
    if (controller !== request) return;
    error.value = {
      code: c.value.errors[e?.code] ? e.code : e?.name === "SyntaxError" ? "mechanism_response" : "network",
      input: e?.input,
      candidates: e?.candidates || [],
    };
  } finally {
    clearTimeout(timeout);
    if (controller === request) loading.value = false;
  }
}
function confirmTarget(candidate) {
  resolutions.value = { ...resolutions.value, [error.value.input]: candidate.id };
  submit();
}
const supplementIdentity = (drug) => ({
  name: drug.name,
  brand: drug.brand,
  aliases: (drug.aliases || []).filter((value) =>
    /^[\p{L}\p{N}][\p{L}\p{N} .()/'’+,-]{0,139}$/u.test(value)).slice(0, 5),
});
const fdaCoverage = ref({});
const coverageLabel = computed(() => locale.value === "zh" ? "来源覆盖不完整" : "Incomplete source coverage");
const developmentCopy = computed(() => locale.value === "zh" ? {
  heading: "研发概况", developer: "开发公司", holder: "欧盟上市许可持有人",
  applicationSponsor: "FDA 申请方", approvedIndication: "获批适应症",
  status: "研发状态", official: "官方来源", complete: "查看完整适应症", more: "查看更多适应症", less: "收起适应症",
  reported: "ChEMBL 收录的适应症", original: "官方原文",
  indicationCoverage: "ChEMBL 适应症仅显示本次查询取得的记录。",
} : {
  heading: "Development overview", developer: "Developer", holder: "EU marketing authorisation holder",
  applicationSponsor: "FDA application sponsor", approvedIndication: "Approved indication",
  status: "Development status", official: "Official sources", complete: "View full indication", more: "Show more indications", less: "Show fewer indications",
  reported: "Indications recorded in ChEMBL", original: "Official wording",
  indicationCoverage: "ChEMBL indications are limited to records retrieved in this search.",
});
function developmentProfile(drug) {
  const fda = reviewedFdaRecord(drug);
  const epar = emaRecords.value[drug.name];
  const verified = researchProfile(drug);
  const reviewed = !epar || epar.url === verified?.url ? verified : null;
  const ema = epar?.status === "Authorised" ? epar : reviewed;
  const applications = (documents.value[drug.id] || []).filter(({ applicationSponsor }) => applicationSponsor);
  const application = applications.length === 1 ? applications[0] : null;
  const parties = [
    (ema?.holder || (ema && reviewed?.holder)) && {
      role: "holder", name: ema.holder || reviewed.holder, url: ema.url, source: "EMA", brand: ema.brand || reviewed?.brand,
    },
    application && { role: "applicationSponsor", name: application.applicationSponsor, url: application.url, source: application.application },
    fda?.developer && { role: "developer", name: fda.developer, url: fda.indicationUrl || fda.url, source: "FDA" },
  ].filter(Boolean);
  const original = typeof ema?.indication === "string" ? ema.indication : "";
  const summary = ema && (reviewed?.indication?.[locale.value] || ema.indication?.[locale.value]);
  const indication = (summary || original) ? { summary, original, url: ema.url, source: "EMA", brand: ema.brand || reviewed?.brand } :
    fda?.approvedIndication ? { summary: fda.approvedIndication[locale.value], url: fda.indicationUrl, source: "FDA", brand: fda.brand } : null;
  const fdaOverview = visibleDocuments(drug).find(({ agency, kind, application }) =>
    agency === "FDA" && kind === "overview" && /^(BLA|NDA|ANDA)\d{6}$/.test(application || ""));
  const sources = [...new Map([
    ...(ema?.url ? [{ url: ema.url, source: "EMA", brand: ema.brand || reviewed?.brand }] : []),
    ...(fdaOverview ? [{ url: fdaOverview.url, source: "FDA", brand: fdaOverview.application.replace(/^(BLA|NDA|ANDA)(\d+)/, "$1 $2") }] : []),
    ...parties.filter(({ role }) => role !== "applicationSponsor"),
    indication,
  ].filter(Boolean).map((item) => [item.url, item])).values()];
  return { parties, indication, sources };
}
const developmentProfiles = computed(() => Object.fromEntries(visibleMatches.value.map(({ drugId }) =>
  [drugId, developmentProfile(drugById(drugId))],
)));
const sourceError = (error) => locale.value === "zh"
  ? { rate_limited: "来源请求受限，请稍后重试", timeout: "来源查询超时，请重试" }[error]
  : { rate_limited: "Source rate limited; try again shortly", timeout: "Source timed out; please retry" }[error];
const fdaErrors = ref({});

async function loadDocuments(drug) {
  if (["loading", "loaded", "empty"].includes(documentState.value[drug.id])) return;
  documentState.value[drug.id] = "loading";
  const abort = new AbortController();
  documentControllers.add(abort);
  const timer = setTimeout(() => abort.abort(), 20000);
  try {
    const result = await loadSupplement("fda-documents", supplementIdentity(drug), abort.signal);
    documents.value[drug.id] = result.rows;
    fdaCoverage.value[drug.id] = result.truncated || result.state === "partial";
    documentState.value[drug.id] = documents.value[drug.id].length ? "loaded" : "empty";
  } catch (error) {
    fdaErrors.value[drug.id] = error.message;
    documentState.value[drug.id] = "error";
  } finally {
    clearTimeout(timer);
    documentControllers.delete(abort);
  }
}
</script>

<template>
  <div class="target-assay-page morph-header-v1" :class="{ 'is-header-morphed': isHeaderMorphed }">
    <ToolTopbar
      :title="c.title"
      :language="locale"
      :language-label="c.language"
      :home-label="c.home"
      :is-morphed="isHeaderMorphed"
      @set-language="setLocale"
    />
    <MobileToolHeader
      class="ta-mobile-header"
      :aria-label="c.title"
      :selector-label="c.title"
      :page-title="c.title"
      :options="[]"
      selected-value=""
      :show-selector="false"
      :language="locale"
      :language-label="c.language"
      :home-label="c.home"
      @set-language="setLocale"
    />
    <main class="ta-container">
      <header class="ta-intro">
        <h1>{{ c.title }}</h1>
        <span ref="headerMorphTrigger" class="ta-header-trigger" aria-hidden="true"></span>
      </header>
      <section class="ta-input ta-panel" :aria-label="c.inputTitle">
        <form @submit.prevent="submit">
          <div class="ta-input-row">
            <textarea
              id="target-input"
              v-model="input"
              rows="1"
              maxlength="1000"
              :aria-invalid="!!error"
              :aria-label="c.label"
              :aria-describedby="error ? 'target-help target-error' : 'target-help'"
              @input="resolutions = {}"
              @keydown.enter="submitOnEnter"
            /><button class="ta-primary" type="submit">
              {{ loading ? c.searching : c.searchShort }}
            </button>
          </div>
          <p id="target-help" class="ta-input-hint">{{ c.inputHint }}</p>
          <div v-if="error" id="target-error" role="alert" class="ta-error">
            <p>{{ c.errors[error.code] }}{{ error.input ? `: ${error.input}` : "" }}</p>
            <fieldset v-if="error.candidates.length" class="ta-candidates">
              <legend>{{ c.chooseTarget }}</legend>
              <button
                v-for="candidate in error.candidates"
                :key="candidate.id"
                type="button"
                :disabled="loading"
                @click="confirmTarget(candidate)"
              >
                <strong>{{ candidate.name }}</strong><span>{{ candidate.description }} · {{ candidate.id }}</span>
              </button>
            </fieldset>
          </div>
        </form>
      </section>
      <section class="ta-panel ta-overview" :aria-busy="loading">
        <div class="ta-section-heading ta-mechanism-heading">
          <h2>{{ c.mechanismTypes }}</h2>
          <div class="ta-literature-actions">
            <button type="button" class="ta-planned" disabled>{{ c.mechanism.ai }}</button>
            <button type="button" class="ta-planned" disabled>{{ c.assayOptions }}</button>
          </div>
        </div>
        <MechanismEvidence :result="mechanismResult" :locale="locale" :stage-label="stageLabel" :drug-presentation="drugPresentation" :matches="resultGroups[0].matches" />
      </section>
      <section class="ta-results ta-panel" aria-labelledby="results-title" :aria-busy="loading">
        <div class="ta-section-heading">
          <h2 id="results-title">{{ c.results }}</h2>
          <p aria-live="polite">
            {{ resultGroups.length }} {{ c.combinations }} ·
            {{ mechanismResult ? c.mechanism.verifiedCount(resultCount) : `${resultCount} ${c.uniqueDrugs}` }}
          </p>
        </div>
        <div v-if="externalTargetLinks.length" class="ta-source-bar">
          <a
            v-for="link in externalTargetLinks"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
          >{{ link.label }}<span v-if="link.note">（{{ link.note }}）</span> ↗</a>
        </div>
        <p v-if="mechanismResult" class="ta-coverage">
          {{ c.mechanism.coverage }}
          <span v-if="discoveryTruncated">{{ c.mechanism.truncated }}. </span>
          <span v-if="discoveryFailed">{{ c.mechanism.sourceFailures }}. </span>
        </p>
        <p v-if="fallback" role="status">{{ c.fallback }}</p>
        <div class="ta-workspace">
          <nav class="ta-combinations" :aria-label="c.choose">
            <p>{{ c.choose }}</p>
            <button
              v-for="combo in resultGroups"
              :key="combo.key"
              type="button"
              :aria-pressed="!showCandidates && active.key === combo.key"
              @click="chooseCombination(combo.key)"
            >
              <span>{{ targetNames(combo.targetIds) }}</span><span class="ta-count">{{
                result.combinations.find((item) => item.key === combo.key).matches.length
              }}</span>
            </button>
            <button type="button" :aria-pressed="showCandidates" @click="chooseCombination(active.key + candidateView)">
              <span>{{ c.mechanism.candidates }}</span><span class="ta-count">({{ additionalCandidates.length }})</span>
            </button>
          </nav>
          <div ref="drugPanel" class="ta-drugs">
            <section v-if="showCandidates" class="ta-candidate-list">
              <div class="ta-section-heading">
                <h3>{{ c.mechanism.candidates }}</h3>
                <span>{{ targetNames(active.targetIds) }}</span>
              </div>
              <CandidateDrugTable
                v-if="additionalCandidates.length"
                :key="active.key + (mechanismResult?.retrievedAt || '')"
                :candidates="additionalCandidates"
                :mechanisms="mechanismResult?.drugMechanisms || []"
                :copy="c.mechanism"
                :more="c.more"
              />
              <p v-else class="ta-empty">{{ locale === "zh" ? "当前结果没有补充候选。" : "No additional candidates in the current results." }}</p>
            </section>
            <template v-else>
              <div class="ta-section-heading">
                <h3>{{ targetNames(active.targetIds) }}</h3>
                <span>{{ active.matches.length }} {{ c.matches }}</span>
              </div>
              <div v-if="!active.matches.length" class="ta-empty">
                <p v-if="unresolvedScope || discoveryFailed || discoveryTruncated">{{ coverageLabel }}</p>
                <p v-else>{{ c.empty }}</p>
                <p>{{ c.emptyNote }}</p>
              </div>
              <article v-for="match in visibleMatches" :key="match.drugId" class="ta-drug">
                <div class="ta-drug-choice">
                  <h4>
                    {{ drugHeadingName(drugById(match.drugId).name, locale) }}
                    <span v-if="drugPresentation[match.drugId].brand" class="ta-brand">{{
                      drugDisplayName(drugPresentation[match.drugId].brand)
                    }}</span>
                  </h4>
                  <div class="ta-drug-labels">
                    <span class="ta-tag">{{ c.drugCard.types[drugPresentation[match.drugId].type] }}</span>
                    <span class="ta-tag">{{ drugStatusLabel(match.drugId) }}</span>
                  </div>
                </div>
                <p class="ta-drug-targets">
                  <span>{{ targetNames(drugById(match.drugId).targetIds) }}</span>
                  <span v-if="match.matchType !== 'reported'" class="ta-status-item">
                    <span aria-hidden="true">·</span>{{ c.exactBadge }}
                  </span>
                  <span v-if="drugPresentation[match.drugId].earliest" class="ta-status-item">
                    <span aria-hidden="true">·</span>{{ c.drugCard.firstApproval }}
                  </span>
                  <a
                    v-if="drugPresentation[match.drugId].earliest" class="ta-approval-link"
                    :href="drugPresentation[match.drugId].earliest.url" target="_blank" rel="noopener noreferrer"
                  >
                    {{ drugPresentation[match.drugId].date }} · {{ c.approvalRegions[drugPresentation[match.drugId].earliest.region] }} ↗
                  </a>
                </p>
                <section class="ta-drug-moa">
                  <h5>{{ c.drugCard.moa }}</h5>
                  <BilingualMechanism
                    :entry="drugMechanism(drugById(match.drugId), drugPresentation[match.drugId])"
                    :empty-text="c.drugCard.limited"
                  />
                </section>
                <section class="ta-regional">
                  <h5>{{ c.regionalApprovals }}</h5>
                  <dl v-if="regionRows(match.drugId).some((item) => item.date || item.approvedWithoutDate || item.status)" class="ta-approvals">
                    <div v-for="item in regionRows(match.drugId)" :key="item.region">
                      <dt>{{ c.approvalRegions[item.region] }}<small v-if="item.certificate && item.date"> · {{ c.certificateDate }}</small></dt>
                      <dd>
                        <a v-if="item.date && item.url" :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.date }} ↗</a>
                        <a v-else-if="item.approvedWithoutDate" :href="item.url" target="_blank" rel="noopener noreferrer">{{ c.drugCard.approvedWithoutDate }} ↗</a>
                        <span v-else>{{ item.region === 'US' && documentState[match.drugId] === 'error' || item.region === 'EU' && emaStatus === 'error' ? c.drugCard.queryFailed : c.approvalUnknown }}</span>
                        <span v-if="item.status && item.status !== 'Authorised'"> · {{ c.drugCard.stages[item.status.toUpperCase()] }}</span>
                      </dd>
                    </div>
                  </dl>
                  <p v-else>{{ documentState[match.drugId] === 'error' || emaStatus === 'error' ? c.drugCard.queryFailed : c.drugCard.regionsUnverified }}</p>
                </section>
                <div
                  v-for="doc in visibleDocuments(drugById(match.drugId)).filter(
                    (item) => item.kind === 'activity',
                  )"
                  :key="doc.url"
                  class="ta-evidence ta-activity"
                >
                  <h4>{{ c.activity }}</h4>
                  <p>{{ locale === "zh" ? doc.summaryZh : doc.summary }}</p>
                  <a :href="doc.url" target="_blank" rel="noopener noreferrer">{{ doc.title }} ↗</a>
                </div>

                <details
                  class="ta-evidence"
                  @toggle="$event.currentTarget.open && loadDocuments(drugById(match.drugId))"
                >
                  <summary>{{ c.evidence }}</summary>
                  <div v-for="group in reviewLists[match.drugId]" :key="group.agency" class="ta-evidence-group">
                    <h5>{{ group.agency }}</h5>
                    <ul class="ta-document-list" :class="{ 'ta-fda-documents': group.agency === 'FDA' }">
                      <li
                        v-for="doc in visibleReviewDocuments(group, expandedDocuments[match.drugId])"
                        :key="doc.url"
                        :class="{ 'ta-document-overview': group.agency === 'FDA' && doc.kind === 'overview',
                                  'ta-document-package': group.agency === 'FDA' && doc.kind === 'review_package' }"
                        class="ta-document"
                      >
                        <a :href="doc.url" target="_blank" rel="noopener noreferrer">
                          {{ (group.agency === "FDA" ? fdaDocumentDisplay(doc).title : (locale === "zh" && doc.titleZh) || doc.title) }} ↗
                        </a>
                        <template v-if="group.agency === 'FDA'">
                          <small v-if="fdaDocumentDisplay(doc).metadata">{{ fdaDocumentDisplay(doc).metadata }}</small>
                          <small v-if="fdaDocumentDisplay(doc).fileId">{{ fdaDocumentDisplay(doc).fileId }}</small>
                          <small v-if="fdaDocumentDisplay(doc).supplementApprovedAt">
                            {{ locale === "zh" ? "补充申请获批" : "Supplement approved" }} · {{ fdaDocumentDisplay(doc).supplementApprovedAt }}
                          </small>
                        </template>
                      </li>
                    </ul>
                    <button
                      v-if="group.agency === 'FDA' && fdaReviewCount(match.drugId) > fdaReviewLimit"
                      type="button" class="ta-text-button"
                      :aria-expanded="Boolean(expandedDocuments[match.drugId])"
                      @click="toggleDocuments(match.drugId, $event)"
                    >
                      {{ expandedDocuments[match.drugId] ? c.fewerDocuments : c.moreDocuments }}
                      ({{ fdaReviewCount(match.drugId) - fdaReviewLimit }})
                    </button>
                  </div>
                  <button
                    v-if="(!documentState[match.drugId] || documentState[match.drugId] === 'error') && !documents[match.drugId]?.some(({ kind }) => kind === 'review')"
                    type="button"
                    class="ta-text-button"
                    @click="loadDocuments(drugById(match.drugId))"
                  >
                    {{ c.loadFda }} ↗
                  </button>
                  <p v-if="fdaCoverage[match.drugId]">{{ coverageLabel }}</p>
                  <p v-if="documentState[match.drugId] === 'loading'" role="status">
                    {{ c.fdaLoading }}
                  </p>
                  <p v-if="documentState[match.drugId] === 'error'" role="alert">
                    {{ sourceError(fdaErrors[match.drugId]) || c.fdaFailed }}
                  </p>
                  <p
                    v-if="
                      documentState[match.drugId] === 'loaded' && !fdaCoverage[match.drugId] && !fdaReviewCount(match.drugId)
                    "
                  >
                    {{ c.fdaApplicationOnly }}
                  </p>
                  <p v-if="documentState[match.drugId] === 'empty'" role="status">
                    {{ c.fdaEmpty }}
                  </p>
                  <div
                    class="ta-evidence-group"
                  >
                    <h5>{{ locale === "zh" ? "其他数据来源" : "Other data sources" }}</h5>
                    <div class="ta-source-links">
                      <a
                        v-for="source in otherSources(drugById(match.drugId), reviewLists[match.drugId])"
                        :key="source.url"
                        :href="source.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >{{ source.title }} ↗</a>
                      <a href="https://www.cde.org.cn/main/xxgk/listpage/b40868b5e21c038a6aa8b4319d21b07d" target="_blank" rel="noopener noreferrer">{{ locale === "zh" ? "CDE 上市药品信息查询" : "CDE marketed drug lookup" }} ↗</a>
                      <button type="button" class="ta-text-button" @click="copyCdeKeyword(drugById(match.drugId))">{{ locale === "zh" ? "复制检索关键词" : "Copy search term" }}</button>
                    </div>
                    <small v-if="cdeCopyState[match.drugId]" role="status">
                      {{ cdeCopyState[match.drugId] === "copied" ? (locale === "zh" ? "已复制" : "Copied") : (locale === "zh" ? "检索关键词" : "Search term") }}
                      · {{ chineseDrugName(drugById(match.drugId).name) || drugById(match.drugId).name }}
                    </small>
                  </div>
                </details>
                <section class="ta-evidence ta-development">
                  <h4>{{ developmentCopy.heading }}</h4>
                  <dl class="ta-development-fields">
                    <div>
                      <dt>{{ developmentCopy.status }}</dt>
                      <dd>{{ drugStatusLabel(match.drugId) }}</dd>
                    </div>
                    <div v-for="party in developmentProfiles[match.drugId].parties" :key="party.role">
                      <dt>{{ developmentCopy[party.role] }}</dt>
                      <dd>{{ organizationName(party.name, locale) }}</dd>
                    </div>
                    <div v-if="developmentProfiles[match.drugId].indication">
                      <dt>{{ developmentCopy.approvedIndication }}</dt>
                      <dd v-for="item in [developmentProfiles[match.drugId].indication]" :key="item.url">
                        <p v-if="item.summary">{{ item.summary }}</p>
                        <details v-if="item.original" class="ta-indication-original">
                          <summary>{{ developmentCopy.complete }} · {{ developmentCopy.original }}</summary>
                          <p lang="en">{{ item.original }}</p>
                        </details>
                        <a v-else :href="item.url" target="_blank" rel="noopener noreferrer">{{ developmentCopy.complete }} ↗</a>
                      </dd>
                    </div>
                    <div v-if="drugIndications(match.drugId).length || (chemblResults[chemblKey]?.state === 'error' && chemblIds(drugById(match.drugId)).length)" class="ta-indications">
                      <dt>{{ developmentCopy.reported }}</dt>
                      <dd>
                        <ul>
                          <li v-for="row in drugIndications(match.drugId).slice(0, expandedIndications[match.drugId] ? undefined : 3)" :key="row.name">
                            <a :href="row.url" :title="row.name" target="_blank" rel="noopener noreferrer">{{ conditionName(row.name, locale) }} ↗</a>
                          </li>
                        </ul>
                        <button
                          v-if="drugIndications(match.drugId).length > 3" type="button" class="ta-text-button"
                          :aria-expanded="Boolean(expandedIndications[match.drugId])"
                          @click="expandedIndications[match.drugId] = !expandedIndications[match.drugId]"
                        >
                          {{ expandedIndications[match.drugId] ? developmentCopy.less : developmentCopy.more }} ({{ drugIndications(match.drugId).length - 3 }})
                        </button>
                        <p v-if="chemblResults[chemblKey]?.state === 'error'" class="ta-source-note">{{ c.chemblUnavailable }}</p>
                        <p v-else-if="chemblResults[chemblKey]?.truncated" class="ta-source-note">{{ developmentCopy.indicationCoverage }}</p>
                      </dd>
                    </div>
                    <div v-if="developmentProfiles[match.drugId].sources.length">
                      <dt>{{ developmentCopy.official }}</dt>
                      <dd class="ta-official-links">
                        <a v-for="item in developmentProfiles[match.drugId].sources" :key="item.url" :href="item.url" target="_blank" rel="noopener noreferrer">{{ [item.source, item.brand].filter(Boolean).join(' · ') }} ↗</a>
                      </dd>
                    </div>
                  </dl>
                </section>
              </article>
              <button
                v-if="visibleCount < active.matches.length"
                type="button"
                class="ta-more"
                @click="visibleCount += 8"
              >
                {{ c.more }} ({{ active.matches.length - visibleCount }}) ↓
              </button>
            </template>
          </div>
        </div>
      </section>
      <section class="ta-literature ta-panel" aria-labelledby="investigational-title">
        <InvestigationalDrugs
          :catalog="data" :combinations="resultGroups" :locale="locale" :stage-label="stageLabel" :target-names="targetNames"
          :discovery="mechanismResult" :searching="loading" :search-error="Boolean(error)" @discover="submit"
        />
      </section>
      <section class="ta-literature ta-panel" aria-labelledby="literature-title">
        <div class="ta-section-heading">
          <h2 id="literature-title">{{ c.literatureTitle }}</h2>
          <span>PubMed · Europe PMC · OpenAlex · {{ targetNames(active.targetIds) }}</span>
        </div>
        <p class="ta-literature-intro">
          {{ c.literatureHelp }}
        </p>
        <div class="ta-literature-content" aria-live="polite">
          <div v-if="currentLiterature?.state !== 'loaded'" class="ta-literature-actions">
            <button
              type="button"
              class="ta-primary"
              :disabled="Object.values(literature).some(({ state }) => state === 'loading')"
              @click="loadLiterature"
            >
              {{ currentLiterature?.state === "loading" ? c.searching :
                currentLiterature?.state === "error" ? c.literatureRetry : c.literatureSearch }}
            </button>
          </div>
          <p v-if="currentLiterature?.state === 'error'" role="alert">
            {{ c.literatureErrors[currentLiterature.code] || c.literatureError }}
          </p>
          <template v-if="currentLiterature?.state === 'loaded'">
            <p v-for="(issue, source) in currentLiterature.issues" :key="source" role="status">
              {{ source }} · {{ c.literatureErrors[issue] || c.literatureError }}
            </p>
            <button v-if="Object.keys(currentLiterature.issues).length" type="button" class="ta-primary" @click="loadLiterature">{{ c.literatureRetry }}</button>
            <p v-if="!currentLiterature.papers.length">{{ c.literatureEmpty }}</p>
            <div v-else :key="paperKey" class="ta-paper-list">
              <article v-for="paper in currentLiterature.papers" :key="paper.id" class="ta-paper">
                <header class="ta-paper-header">
                  <h3>
                    <a :href="paper.url" target="_blank" rel="noopener noreferrer">{{ paper.title }} ↗</a>
                  </h3>
                  <p class="ta-paper-meta">
                    {{
                      [paper.sources?.join(" / ") || paper.source, paper.journal, paper.year, paper.pmid ? "PMID " + paper.pmid : paper.pmcid].filter(Boolean).join(" · ")
                    }}
                  </p>
                </header>
                <div class="ta-paper-links">
                  <a v-if="paper.doi" :href="'https://doi.org/' + encodeURI(paper.doi)" target="_blank" rel="noopener noreferrer">DOI {{ paper.doi }} ↗</a>
                  <a v-if="paper.fullText" :href="paper.fullText" target="_blank" rel="noopener noreferrer">{{ c.literatureFullText }} ↗</a>
                  <a v-for="version in paper.preprints" :key="version.url" :href="version.url" target="_blank" rel="noopener noreferrer">{{ locale === "zh" ? "预印本" : "Preprint" }} ↗</a>
                </div>
                <details v-if="paper.publicAbstract" class="ta-paper-excerpt">
                  <summary><span class="ta-expand-abstract">{{ locale === "zh" ? "展开摘要" : "Show abstract" }}</span><span class="ta-collapse-abstract">{{ locale === "zh" ? "收起摘要" : "Hide abstract" }}</span></summary>
                  <p v-if="paper.publicAbstract.preprint" class="ta-paper-meta">{{ locale === "zh" ? "预印本摘要" : "Preprint abstract" }}</p>
                  <p>{{ paper.publicAbstract.text }}</p>
                  <a :href="paper.publicAbstract.url" target="_blank" rel="noopener noreferrer">{{ paper.publicAbstract.source }} ↗</a>
                  · <a v-if="paper.publicAbstract.license.url" :href="paper.publicAbstract.license.url" target="_blank" rel="noopener noreferrer">{{ paper.publicAbstract.license.label }}</a>
                  <span v-else>{{ paper.publicAbstract.license.label }}</span>
                </details>
                <a
                  v-if="paper.abstractSource && (!paper.publicAbstract || paper.publicAbstract.preprint)" class="ta-paper-meta" :href="paper.abstractSource.url"
                  target="_blank" rel="noopener noreferrer"
                >
                  {{ locale === "zh" ? "在来源网站查看摘要" : "Read abstract at source" }} · {{ paper.abstractSource.source }} ↗
                </a>
              </article>
            </div>
          </template>
          <div v-if="['loaded', 'error'].includes(currentLiterature?.state)" class="ta-literature-actions">
            <a
              class="ta-literature-link"
              :href="literatureSearchUrl(paperTerm)"
              target="_blank"
              rel="noopener noreferrer"
            >{{ c.literatureAll }} ↗</a>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  </div>
</template>
<style scoped>
.target-assay-page {
  --paper: var(--app-bg);
  --ink: var(--app-text);
  --muted: var(--app-muted);
  --accent: var(--app-accent);
  --accent-border: var(--app-rule);
  --soft-line: var(--app-rule-subtle);
  --panel-soft: var(--app-surface);
  --selected-bg: var(--app-accent-soft);
  --focus-ring: var(--app-focus);
  --topbar-sticky-height: 48px;
  color: var(--app-text);
  background: var(--app-bg);
  min-height: 100svh;
}
.ta-container {
  --ta-body-size: 0.9rem;
  --ta-section-size: 1.15rem;
  --ta-card-title-size: 1.0625rem;
  --ta-label-size: 0.83rem;
  --ta-card-padding: 12px;
  --ta-meta-size: 0.8rem;
  --ta-subheading-size: 0.98rem;
  --ta-body-line: 1.55;
  --ta-heading-line: 1.35;
  --ta-action-width: 9.625rem;
  --ta-language-gap: 8px;
  --ta-field-gap: 8px;
  --ta-row-gap: 12px;
  --ta-group-gap: 16px;
  --ta-drug-spacing: 24px;
  display: grid;
  gap: 12px;
  width: min(var(--bc-content-max, 1120px), calc(100% - var(--bc-container-inline, 48px)));
  margin: 0 auto;
  padding-top: calc(var(--topbar-sticky-height) + 10px);
}
.ta-intro { position: relative; padding: 4px 0 5px; }
.ta-header-trigger { position: absolute; inset: auto auto 0 0; width: 1px; height: 1px; pointer-events: none; }
.ta-intro h1 {
  margin: 0;
  font-size: clamp(1.5rem, 2.25vw, 2.25rem);
  font-weight: 600;
  line-height: 1;
  transform-origin: left center;
  transition: opacity 280ms ease, transform 280ms ease;
}
.is-header-morphed .ta-intro h1 { opacity: 0; transform: translateY(-10px) scale(0.92); }
@media (prefers-reduced-motion: reduce) {
  .ta-intro h1 { transition: none; }
}

p {
  color: var(--app-muted);
  line-height: var(--ta-body-line);
  font-size: var(--ta-body-size);
}
a {
  color: var(--app-accent);
  text-underline-offset: 4px;
  overflow-wrap: anywhere;
}
h2,
h3 {
  font-size: var(--ta-subheading-size);
  font-weight: 600;
  margin: 0;
}
h2 { font-size: var(--ta-section-size); }
h4 {
  font-size: var(--ta-subheading-size);
  font-weight: 600;
  margin: 0;
}
h5 {
  font-size: var(--ta-label-size);
  font-weight: 600;
  margin: 3px 0 0;
  color: var(--app-muted);
}
.ta-panel :is(h2, h3, h4, h5) {
  line-height: var(--ta-heading-line);
}
.ta-panel {
  line-height: var(--ta-body-line);
  padding: 24px;
  border: 1px solid var(--app-rule-subtle);
  border-radius: var(--bc-panel-radius, 16px);
  background: var(--app-surface);
  box-shadow: var(--app-card-shadow);
}
.ta-input form {
  display: grid;
  gap: var(--ta-field-gap);
  margin: 0;
}
label {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--app-muted);
}
.ta-input-row {
  display: flex;
  gap: var(--ta-row-gap);
}
textarea,
select,
input[type="search"] {
  color: var(--app-text);
  background: var(--bc-bg-input, var(--app-surface));
  border: 1px solid var(--app-rule);
  border-radius: 8px;
  font: inherit;
  padding: 10px 12px;
  min-height: 44px;
  min-width: 0;
  box-sizing: border-box;
}
textarea {
  flex: 1;
  resize: vertical;
  font-size: 1rem;
  line-height: 1.5;
}
button, .ta-container :deep(.investigational-workspace .ta-combinations button) {
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--app-rule);
  border-radius: 8px;
  color: var(--app-text);
  min-height: 44px;
  padding: 8px 14px;
  font: inherit;
  font-size: 0.75rem;
}
button:disabled {
  opacity: 0.45;
  cursor: default;
}
button:not(:disabled):hover, .ta-container :deep(.investigational-workspace .ta-combinations button:not(:disabled):hover) {
  border-color: var(--app-accent);
  background: var(--app-accent-soft);
}
button:focus-visible, .ta-container :deep(.investigational-workspace .ta-combinations button:focus-visible),
textarea:focus-visible,
select:focus-visible,
input:focus-visible,
a:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
.ta-input-row textarea:focus {
  border-color: var(--app-accent);
  outline: 2px solid var(--app-accent);
  outline-offset: -2px;
  box-shadow: none;
}
.ta-primary {
  color: var(--app-accent);
  background: var(--app-accent-soft);
  border-color: var(--app-accent);
  font-weight: 600;
  white-space: nowrap;
}
.ta-primary > span {
  margin-left: 12px;
}
@media (min-width: 768px) {
  .ta-input-row > .ta-primary {
    flex: 0 0 var(--ta-action-width);
    inline-size: var(--ta-action-width);
  }
}
.ta-text-button {
  border: none;
  padding: 0 4px;
  color: var(--app-accent);
  text-align: left;
}
.ta-input-hint {
  margin: 0;
  font-size: 0.75rem;
}
.ta-error {
  border-left: 2px solid var(--app-accent);
  padding-left: 12px;
}
.ta-candidates {
  border: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.ta-candidates legend {
  font-size: 0.78rem;
  padding: 8px 0;
}
.ta-candidates button {
  display: grid;
  gap: 4px;
  text-align: left;
}
.ta-candidates button span {
  color: var(--app-muted);
  font-size: 0.7rem;
  overflow-wrap: anywhere;
}
.ta-tag, .ta-container :deep(.drug-heading > .ta-tag) {
  padding: 3px 7px;
  background: var(--app-section);
  border-radius: 4px;
  font-size: var(--ta-meta-size);
  color: var(--app-muted);
  overflow-wrap: anywhere;
}
.ta-help {
  color: var(--app-accent);
  font-size: 0.7rem;
  cursor: help;
}
.ta-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.ta-section-heading p {
  margin: 0;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}
.ta-section-heading > span {
  color: var(--app-muted);
  font-size: 0.68rem;
}
.ta-workspace, .ta-container :deep(.investigational-workspace.ta-workspace) {
  display: grid;
  grid-template-columns: minmax(160px, 0.65fr) minmax(0, 2fr);
  gap: 24px;
}
.ta-combinations, .ta-container :deep(.investigational-workspace .ta-combinations) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 660px;
  overflow-y: auto;
}
.ta-combinations p, .ta-container :deep(.investigational-workspace .ta-combinations p) {
  margin: 0 0 10px;
  font-size: 0.68rem;
}
.ta-combinations button, .ta-container :deep(.investigational-workspace .ta-combinations button) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  text-align: left;
  border-color: transparent;
}
.ta-combinations button[aria-pressed="true"], .ta-container :deep(.investigational-workspace .ta-combinations button[aria-pressed="true"]) {
  color: var(--app-accent);
  background: var(--app-accent-soft);
}
.ta-count, .ta-container :deep(.investigational-workspace .ta-count) {
  font-size: var(--ta-meta-size);
  font-variant-numeric: tabular-nums;
  color: var(--app-muted);
}
.ta-drugs, .ta-container :deep(.investigational-workspace .ta-drugs) {
  min-width: 0;
  border-left: 1px solid var(--app-rule-subtle);
  padding-left: 24px;
}
.ta-drugs > .ta-section-heading {
  min-height: 40px;
}
.ta-drugs h3 {
  overflow-wrap: anywhere;
}
.ta-drug {
  display: grid;
  gap: var(--ta-group-gap);
  padding-block: calc(var(--ta-drug-spacing) / 2);
  border-bottom: 1px solid var(--app-rule-subtle);
}
.ta-drug:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.ta-drug p {
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
  margin: 0;
  overflow-wrap: anywhere;
}
.ta-drug-labels { display: flex; flex-wrap: wrap; gap: 6px; }
.ta-drug-moa, .ta-regional {
  display: grid;
  gap: var(--ta-field-gap);
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
}
.ta-drug-moa h5, .ta-regional h5 { margin: 0; font-size: var(--ta-label-size); font-weight: 600; }
.ta-regional p { margin: 0; }
.ta-drug-choice {
  display: flex;
  align-items: baseline;
  gap: 8px 12px;
  flex-wrap: wrap;
}
.ta-drug-choice strong {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--app-text);
  overflow-wrap: anywhere;
}
.ta-brand {
  display: block;
  color: var(--app-muted);
  font-size: var(--ta-meta-size);
  margin-top: 3px;
}
.ta-drug-targets {
  color: var(--app-accent);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px var(--ta-field-gap);
  letter-spacing: normal;
}
.ta-status-item { display: inline-flex; align-items: baseline; gap: var(--ta-field-gap); }
.ta-approval-link { white-space: nowrap; font-variant-numeric: tabular-nums; }
.ta-evidence {
  padding: var(--ta-card-padding);
  border-radius: 10px;
}
.ta-evidence:not(details) {
  background: var(--app-section);
}
.ta-activity { display: grid; gap: var(--ta-field-gap); }
.ta-literature { display: grid; gap: var(--ta-group-gap); }
.ta-literature-intro {
  margin: 0;
}
.ta-literature-content,
.ta-paper-list {
  display: grid;
  gap: 14px;
}
.ta-paper {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: clamp(14px, 2vw, 20px);
  border: 1px solid var(--app-rule-subtle);
  border-radius: 10px;
  background: var(--app-section);
}
.ta-paper-header {
  display: grid;
  gap: 5px;
}
.ta-paper p,
.ta-literature-content > p {
  margin: 0;
}
.ta-paper-header h3 {
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.ta-paper-meta, .ta-paper > a, .ta-paper .ta-literature-link {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.ta-paper-links { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; }
.ta-paper-links:empty { display: none; }
.ta-collapse-abstract, .ta-paper-excerpt[open] .ta-expand-abstract { display: none; }
.ta-paper-excerpt[open] .ta-collapse-abstract { display: inline; }
.ta-paper-excerpt > p { white-space: pre-line; margin-block: 6px; }
.ta-paper-excerpt {
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  display: grid;
  gap: 3px;
}
.ta-paper-excerpt strong {
  color: var(--app-text);
  font-size: 0.74rem;
}
.ta-literature-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.ta-literature-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 6px 10px;
  border: 1px solid var(--app-rule);
  border-radius: 8px;
  font-size: 0.78rem;
  text-decoration: none;
}
.ta-literature-link:hover {
  background: var(--app-accent-soft);
}
#results-title { scroll-margin-top: 88px; }
.ta-mechanism-heading {
  flex-wrap: wrap;
  gap: 8px;
}
.ta-mechanism-heading > * {
  min-width: 0;
}
.ta-planned {
  min-height: 44px;
  padding: 6px 10px;
  border: 1px solid var(--app-rule);
  border-radius: 8px;
  background: var(--app-section);
  color: var(--app-muted);
  font: inherit;
  font-size: var(--ta-meta-size);
}
.ta-overview { display: grid; gap: var(--ta-group-gap); }
.ta-approvals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ta-field-gap) 16px;
  margin: 0;
  overflow-wrap: anywhere;
}
.ta-approvals dt {
  color: var(--app-muted);
  font-size: var(--ta-label-size);
}
.ta-approvals dd {
  margin: 4px 0 0;
  font-size: var(--ta-body-size);
}
.ta-results { display: grid; gap: var(--ta-group-gap); }
.ta-source-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ta-field-gap) var(--ta-group-gap);
  line-height: var(--ta-body-line);
  color: var(--app-muted);
  font-size: var(--ta-meta-size);
}
.ta-source-bar a {
  max-inline-size: 100%;
}
.ta-coverage { margin: 0; }
.ta-coverage a {
  display: inline-block;
  max-inline-size: 100%;
}
.ta-results > [role="status"] {
  margin: 0;
}
details.ta-evidence {
  border: 1px solid var(--app-rule-subtle);
  color: var(--app-text);
}
.ta-evidence summary {
  cursor: pointer;
  font-size: var(--ta-subheading-size);
  font-weight: 600;
  line-height: var(--ta-heading-line);
}
.ta-evidence summary:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 4px;
}
.ta-container :deep(details > summary) {
  cursor: pointer;
  line-height: var(--ta-body-line);
}
.ta-evidence[open] { display: grid; gap: var(--ta-row-gap); }
.ta-evidence[open] > summary { display: list-item; }
.ta-indication-original[open] > summary { margin-block-end: var(--ta-field-gap); }
.ta-drug-choice h4 {
  font-size: var(--ta-card-title-size);
}
.ta-evidence-group {
  padding-top: var(--ta-field-gap);
  border-top: 1px solid var(--app-rule-subtle);
}
.ta-evidence-group h5 {
  margin: 0 0 4px;
  color: var(--app-text);
}
.ta-document-list,
.ta-indications ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ta-document { padding: 0; min-width: 0; overflow-wrap: anywhere; }
.ta-document a {
  overflow-wrap: anywhere;
  font-size: 0.875rem;
  line-height: 1.45;
  font-weight: 400;
}
.ta-document small {
  display: block;
  color: var(--app-muted);
  font-size: var(--ta-meta-size);
}
.ta-document-list { display: grid; gap: var(--ta-field-gap) 16px; }
.ta-evidence-group .ta-source-links { align-items: baseline; }
.ta-evidence-group small { color: var(--app-muted); font-size: 0.75rem; }
.ta-evidence-group .ta-source-links a, .ta-evidence-group .ta-source-links button {
  font-size: 0.875rem;
  line-height: 1.45;
}
.ta-fda-documents {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ta-field-gap) 16px;
}
.ta-document-overview, .ta-document-package { grid-column: 1 / -1; }
.ta-evidence-group h5, .ta-development h4 { font-size: var(--ta-subheading-size); }
.ta-development {
  display: grid;
  gap: var(--ta-row-gap);
  font-size: var(--ta-body-size);
  line-height: 1.5;
}
.ta-development-fields { display: grid; gap: var(--ta-row-gap); max-inline-size: 46rem; margin: 0; }
.ta-development-fields > div { display: grid; grid-template-columns: 10.5rem minmax(0, 1fr); gap: 4px 16px; align-items: baseline; }
.ta-development-fields dt { color: var(--app-muted); font-size: var(--ta-label-size); }
.ta-development-fields dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
.ta-development-fields dd p { margin: 0; font-size: inherit; line-height: inherit; }
.ta-indication-original { margin-block-start: 4px; }
.ta-development-fields .ta-indication-original summary { font-size: var(--ta-meta-size); font-weight: 400; color: var(--app-accent); }
.ta-development-fields .ta-indication-original p { max-inline-size: 65ch; }
.ta-development-fields .ta-source-note { font-size: var(--ta-meta-size); color: var(--app-muted); }
.ta-official-links { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 16px; }
.ta-official-links a {
  display: inline-block;
  white-space: nowrap;
  padding-block: 2px;
  font-size: var(--ta-meta-size);
  line-height: 1.5;
}
@media (max-width: 767px) {
  .ta-development-fields > div { grid-template-columns: minmax(0, 1fr); }
}
.ta-source-links,
.ta-indications ul {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.ta-source-links a,
.ta-indications li a {
  display: inline-block;
  padding-block: 4px;
  overflow-wrap: anywhere;
}
.ta-empty {
  padding: 48px 0 64px;
  max-width: 56ch;
}
.ta-empty p:first-child {
  color: var(--app-text);
  font-size: 0.95rem;
}
.ta-more {
  width: 100%;
  margin-top: 18px;
}
.mobile-tool-header {
  display: none;
}
@media (max-width: 767px) {
  .tool-topbar {
    display: none;
  }
  .ta-mobile-header {
    --mobile-header-control-border: var(--bc-border-subtle);
    --mobile-header-control-bg: var(--bc-bg-glass);
    --mobile-header-control-shadow: var(--bc-shadow-card);
    display: grid;
    width: calc(100% - var(--bc-container-inline, 32px));
    margin-inline: auto;
  }
  .ta-container {
    --ta-drug-spacing: 20px;
    padding-top: 12px;
  }
  .ta-intro {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    padding: 0;
  }
  .ta-fda-documents { grid-template-columns: minmax(0, 1fr); }
  .ta-panel {
    padding: 18px 14px;
  }
  .ta-input-row > .ta-primary { min-height: 46px; }
  .ta-input-row {
    flex-direction: column;
    gap: 8px;
  }
  .ta-workspace, .ta-container :deep(.investigational-workspace.ta-workspace) {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
  .ta-combinations, .ta-container :deep(.investigational-workspace .ta-combinations) {
    flex-direction: row;
    max-height: none;
    padding-bottom: 8px;
  }
  .ta-combinations p, .ta-container :deep(.investigational-workspace .ta-combinations p) {
    display: none;
  }
  .ta-combinations button, .ta-container :deep(.investigational-workspace .ta-combinations button) {
    flex: 0 0 auto;
  }
  .ta-drugs, .ta-container :deep(.investigational-workspace .ta-drugs) {
    padding: 16px 0 0;
    border-left: none;
    border-top: 1px solid var(--app-rule-subtle);
  }
}
.ta-coverage, .ta-candidate-list {
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
  overflow-wrap: anywhere;
}
</style>
