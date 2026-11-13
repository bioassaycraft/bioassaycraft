<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import MobileToolHeader from "../components/common/MobileToolHeader.vue";
import SiteFooter from "../components/layout/SiteFooter.vue";
import { useLocale } from "../utils/locale";
import { animateElement, getPanelEnterKeyframes } from "../utils/motion.js";
import { sampleCatalog } from "../lib/target-to-assay/catalog.js";
import { searchDrugs } from "../lib/target-to-assay/search.js";
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
import { displayLiterature, literatureTerm } from "../lib/target-to-assay/literature.js";
import { loadSupplement } from "../lib/target-to-assay/supplement-client.js";
import {
  conditionName,
  organizationName,
  drugDisplayName,
  drugHeadingName,
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
onBeforeUnmount(() => {
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
    return { drug, status: match.reason === "non_direct_relationship" ? "nonDirectMatch" : labels[match.state],
      url: sourceById(drug.sourceId)?.url };
  });
});
const sourceById = (id) => data.value.sources.find((source) => source.id === id);
const activeTargets = computed(() =>
  result.value.resolvedTargets.filter((target) => active.value.targetIds.includes(target.id)),
);
const paperTerm = computed(() => literatureTerm(activeTargets.value));
const literature = ref({});
const currentLiterature = computed(() => literature.value[paperTerm.value]);
async function loadLiterature() {
  const term = paperTerm.value;
  if (!term || literature.value[term]?.state === "loading") return;
  literature.value[term] = { state: "loading" };
  const abort = new AbortController();
  documentControllers.add(abort);
  const timeout = setTimeout(() => abort.abort(), 15000);
  try {
    const response = displayLiterature(await loadSupplement("pubmed-literature", { term }, abort.signal), term);
    literature.value[term] = { state: "loaded", ...response };
  } catch {
    literature.value[term] = { state: "error" };
  } finally {
    clearTimeout(timeout);
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
  <div class="target-assay-page">
    <ToolTopbar
      :title="c.title"
      :language="locale"
      :language-label="c.language"
      :home-label="c.home"
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
        <RouterLink to="/learn/" class="ta-back">
          ← {{ locale === "zh" ? "全部探索" : "All Explore" }}
        </RouterLink>
        <h1>{{ c.title }}</h1>
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
            <button type="button" :aria-pressed="showCandidates" @click="chooseCombination(candidateView)">
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
                :key="mechanismResult?.retrievedAt || active.key"
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
                    <span aria-hidden="true">·</span>{{ match.matchType === "direct"
                      ? (match.reason === "additional_direct_targets" ? c.directAdditionalTargets : c.directScopePending)
                      : c.exactBadge }}
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
                    v-if="otherSources(drugById(match.drugId), reviewLists[match.drugId]).length"
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
                    </div>
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
      <section class="ta-literature ta-panel" aria-labelledby="literature-title">
        <div class="ta-section-heading">
          <h2 id="literature-title">{{ c.literatureTitle }}</h2>
          <span>PubMed · {{ targetNames(active.targetIds) }}</span>
        </div>
        <p class="ta-literature-intro">
          {{ c.literatureHelp }}
          <a href="https://www.ncbi.nlm.nih.gov/About/disclaimer.html" target="_blank" rel="noopener noreferrer">{{ c.mechanism.ncbiNotice }} ↗</a>
        </p>
        <div class="ta-literature-content" aria-live="polite">
          <div v-if="currentLiterature?.state !== 'loaded'" class="ta-literature-actions">
            <button
              type="button"
              class="ta-primary"
              :disabled="currentLiterature?.state === 'loading'"
              @click="loadLiterature"
            >
              {{ currentLiterature?.state === "loading" ? c.searching : c.literatureSearch }}
            </button>
          </div>
          <p v-if="currentLiterature?.state === 'error'" role="alert">{{ c.literatureError }}</p>
          <template v-if="currentLiterature?.state === 'loaded'">
            <p v-if="currentLiterature.truncated">{{ coverageLabel }}</p>
            <p v-if="!currentLiterature.papers.length">{{ c.literatureEmpty }}</p>
            <div v-else class="ta-paper-list">
              <article v-for="paper in currentLiterature.papers" :key="paper.id" class="ta-paper">
                <header class="ta-paper-header">
                  <h3>
                    <a :href="paper.url" target="_blank" rel="noopener noreferrer">{{ paper.title }} ↗</a>
                  </h3>
                  <p class="ta-paper-meta">
                    {{
                      [paper.journal, paper.year, c.mechanism.publication[paper.publicationKind], "PMID " + paper.id].filter(Boolean).join(" · ")
                    }}
                  </p>
                </header>
                <p v-if="paper.excerpt" class="ta-paper-excerpt">
                  <strong>{{ c.literatureKinds[paper.kind] }}</strong>
                  <span>{{ paper.excerpt }}</span>
                </p>
                <div v-if="paper.fullText" class="ta-literature-actions">
                  <a
                    class="ta-literature-link"
                    :href="paper.fullText"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ c.literatureFullText }} ↗</a>
                </div>
              </article>
            </div>
            <div class="ta-literature-actions">
              <a
                class="ta-literature-link"
                :href="currentLiterature.url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ c.literatureAll }} ↗</a>
            </div>
          </template>
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
  --ta-panel-gap: 24px;
  display: grid;
  gap: var(--ta-panel-gap);
  width: min(var(--bc-content-max, 1120px), calc(100% - var(--bc-container-inline, 48px)));
  margin: 0 auto;
  padding-top: 72px;
}
.ta-intro {
  display: grid;
  gap: var(--ta-row-gap);
  padding-block-start: 12px;
}
.ta-back {
  font-size: 0.74rem;
  text-decoration: none;
  color: var(--app-muted);
}
.ta-intro h1 {
  font-size: clamp(1.7rem, 2.4vw, 2.25rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.2;
  margin: 0;
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
button {
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
button:not(:disabled):hover {
  border-color: var(--app-accent);
  background: var(--app-accent-soft);
}
button:focus-visible,
textarea:focus-visible,
select:focus-visible,
input:focus-visible,
a:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
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
.ta-tag {
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
.ta-workspace {
  display: grid;
  grid-template-columns: minmax(160px, 0.65fr) minmax(0, 2fr);
  gap: 24px;
}
.ta-combinations {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 660px;
  overflow-y: auto;
}
.ta-combinations p {
  margin: 0 0 10px;
  font-size: 0.68rem;
}
.ta-combinations button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  text-align: left;
  border-color: transparent;
}
.ta-combinations button[aria-pressed="true"] {
  color: var(--app-accent);
  background: var(--app-accent-soft);
}
.ta-count {
  font-size: var(--ta-meta-size);
  font-variant-numeric: tabular-nums;
  color: var(--app-muted);
}
.ta-drugs {
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
  padding-block: calc(var(--ta-panel-gap) / 2);
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
.ta-paper-meta {
  font-size: var(--ta-meta-size);
}
.ta-paper-excerpt {
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
.ta-document { padding: 4px 8px; min-width: 0; overflow-wrap: anywhere; }
.ta-document a {
  overflow-wrap: anywhere;
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
}
.ta-document small {
  display: block;
  color: var(--app-muted);
  font-size: var(--ta-meta-size);
}
.ta-document-overview {
  background: var(--app-accent-soft);
  border-radius: 6px;
  margin: 5px 0;
}
.ta-document-overview { padding: 8px 10px; }
.ta-document-overview a {
  font-weight: 600;
}
.ta-fda-documents {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}
.ta-document-overview, .ta-document-package { grid-column: 1 / -1; }
.ta-document:not(.ta-document-overview) { border-bottom: 1px solid var(--app-rule-subtle); }
.ta-document-package a { font-weight: 600; }
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
    --ta-panel-gap: 20px;
    padding-top: 20px;
  }
  .ta-intro h1 {
    font-size: 1.75rem;
  }
  .ta-fda-documents { grid-template-columns: minmax(0, 1fr); }
  .ta-panel {
    padding: 18px 14px;
  }
  .ta-input-row {
    flex-direction: column;
    gap: 8px;
  }
  .ta-workspace {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
  .ta-combinations {
    flex-direction: row;
    max-height: none;
    padding-bottom: 8px;
  }
  .ta-combinations p {
    display: none;
  }
  .ta-combinations button {
    flex: 0 0 auto;
  }
  .ta-drugs {
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
