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
  fetchFdaDocuments,
  sortReviewEvidence,
} from "../lib/target-to-assay/evidence.js";
import { reviewedFdaRecord, validApprovalDate } from "../lib/target-to-assay/approval-records.js";
import { researchGroups, rankMatches, researchProfile } from "../lib/target-to-assay/research.js";
import { fetchLiterature, literatureTerm } from "../lib/target-to-assay/literature.js";
import { fetchDrugTrials } from "../lib/target-to-assay/trials.js";
import { fetchChemblIndications } from "../lib/target-to-assay/chembl.js";
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
const trialResults = ref({});
const expandedDocuments = ref({});
const drugPanel = ref(null);
const visibleCount = ref(8);
const visibleMatches = computed(() =>
  rankMatches(active.value.matches, drugPresentation.value).slice(0, visibleCount.value),
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
      matchMode: "recorded_exact",
      includeClinical: true,
    },
    data.value,
  ),
);
const baseline = computed(() =>
  searchDrugs(
    { targets: submitted.value, includeClinical: true, matchMode: "recorded_exact" },
    data.value,
  ),
);
const resultGroups = computed(() => researchGroups(baseline.value));
const fallback = computed(
  () => resultGroups.value.length > 1 && !resultGroups.value[0].matches.length,
);
const active = computed(() => {
  const group =
    resultGroups.value.find((item) => item.key === activeKey.value) ||
    resultGroups.value.find((item) => item.matches.length) ||
    resultGroups.value[0];
  return result.value.combinations.find((item) => item.key === group.key);
});
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
const discoveryFailed = computed(() => discoveryChecks.value.some(({ state }) => !["success_with_data", "success_empty", "unresolved_target", "not_queried"].includes(state)));
const additionalCandidates = computed(() => {
  if (!mechanismResult.value) return [];
  const scope = active.value.targetIds;
  const matches = new Set(active.value.matches.map(({ drugId }) => drugId));
  return rankMatches(data.value.drugs.filter((drug) => !matches.has(drug.id) &&
    [...drug.targetIds, ...(drug.proposedTargetIds || [])].some((id) => scope.includes(id)))
    .map(({ id }) => ({ drugId: id })), drugPresentation.value)
    .map(({ drugId }) => {
      const drug = drugById(drugId);
      const recorded = scope.filter((id) => drug.targetIds.includes(id)).length;
      const status = recorded && recorded < scope.length ? "partialMatch"
        : recorded && drug.targetIds.some((id) => !scope.includes(id)) ? "otherTargets" : "unverifiedMatch";
      return { drug, status, url: sourceById(drug.sourceId)?.url };
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
    const response = await fetchLiterature(term, { signal: abort.signal });
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
  const stage = earliest || drug.approval.status === "approved" ? "APPROVAL" :
    special ? drug.clinicalStage : ["Withdrawn", "Suspended"].includes(euStatus) ? euStatus.toUpperCase() :
      drug.clinicalStage === "APPROVAL" ? "REPORTED_APPROVAL" : drug.clinicalStage || "UNKNOWN";
  const format = drug.molecularFormat || researchProfile(drug)?.type.en || "";
  const isZynlonta = documents.value[drug.id]?.some((doc) => doc.kind === "application" && doc.application === "BLA761196") ||
    emaRecords.value[drug.name]?.url === "https://www.ema.europa.eu/en/medicines/human/EPAR/zynlonta";
  const type = reviewedMechanism(drug.name)?.type || reviewed?.type || (isZynlonta ? "adc" : /car[- ]?t|cell therapy/i.test(format) ? "car_t" :
    /antibody.drug conjugate|\badc\b/i.test(format) ? "adc" :
    /trispecific/i.test(format) ? "trispecific" : /bispecific/i.test(format) ? "bispecific" :
      /monoclonal/i.test(format) ? "monoclonal" : "other");
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
  const row = mechanismResult.value?.drugMechanisms.find(({ drugId }) => drugId === drug.id);
  const original = details.type === "car_t" && details.reviewed ? targetAssayCopy.en.drugCard.cd19CarT :
    details.isZynlonta ? targetAssayCopy.en.drugCard.zynlonta : drug.mechanisms?.[0] || row?.mechanismDescription;
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

const visibleDocuments = (drug) => {
  const fetched = documents.value[drug.id] || [];
  const initialDates = new Map(
    fetched
      .filter((doc) => doc.kind === "application")
      .map((doc) => [doc.application, doc.approvedAt]),
  );
  const curated = evidenceFor(drug, data.value.sources).map((doc) =>
    doc.application
      ? { ...doc, approvedAt: initialDates.get(doc.application) || doc.approvedAt }
      : doc,
  );
  return [...curated, ...fetched];
};
const reviewLists = computed(() =>
  Object.fromEntries(
    visibleMatches.value.map(({ drugId }) => [
      drugId,
      sortReviewEvidence([
        ...new Map(
          visibleDocuments(drugById(drugId))
            .filter(
              (doc) =>
                ["FDA", "EMA", "CDE", "NMPA"].includes(doc.agency) && doc.kind !== "activity",
            )
            .map((doc) => [doc.url, doc]),
        ).values(),
      ]),
    ]),
  ),
);

const chemblKey = computed(() => visibleMatches.value.map(({ drugId }) => drugId)
  .filter((id) => /^CHEMBL\d+$/.test(id)).join(","));
const chemblResults = ref({});
const drugIndications = (drugId) =>
  (chemblResults.value[chemblKey.value]?.rows || []).filter((row) => row.id === drugId);
watch(chemblKey, async (key) => {
  if (!key || chemblResults.value[key]) return;
  chemblResults.value[key] = { state: "loading" };
  const abort = new AbortController();
  documentControllers.add(abort);
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    const rows = await fetchChemblIndications(key.split(","), { signal: abort.signal });
    chemblResults.value[key] = { state: "loaded", rows };
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
    activeKey.value = next.resolvedTargets.map(({ id }) => id).join("|");
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
async function loadDocuments(drug) {
  if (["loading", "loaded", "empty"].includes(documentState.value[drug.id])) return;
  documentState.value[drug.id] = "loading";
  const abort = new AbortController();
  documentControllers.add(abort);
  const timer = setTimeout(() => abort.abort(), 20000);
  try {
    documents.value[drug.id] = await fetchFdaDocuments(drug, { signal: abort.signal });
    documentState.value[drug.id] = documents.value[drug.id].length ? "loaded" : "empty";
  } catch {
    documentState.value[drug.id] = "error";
  } finally {
    clearTimeout(timer);
    documentControllers.delete(abort);
  }
}
async function loadTrials(drug) {
  if (trialResults.value[drug.id]?.state === "loading") return;
  trialResults.value[drug.id] = { state: "loading" };
  const abort = new AbortController();
  documentControllers.add(abort);
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    const result = await fetchDrugTrials(drug, { signal: abort.signal });
    trialResults.value[drug.id] = { state: "loaded", ...result };
  } catch {
    trialResults.value[drug.id] = { state: "error" };
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
          <button type="button" class="ta-primary" disabled>
            <span aria-hidden="true">✦</span> {{ c.mechanism.ai }}
          </button>
        </div>
        <MechanismEvidence :result="mechanismResult" :locale="locale" />
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
              :aria-pressed="active.key === combo.key"
              @click="chooseCombination(combo.key)"
            >
              <span>{{ targetNames(combo.targetIds) }}</span><span class="ta-count">{{
                result.combinations.find((item) => item.key === combo.key).matches.length
              }}</span>
            </button>
          </nav>
          <div ref="drugPanel" class="ta-drugs">
            <div class="ta-section-heading">
              <h3>{{ targetNames(active.targetIds) }}</h3>
              <span>{{ active.matches.length }} {{ c.matches }}</span>
            </div>
            <div v-if="!active.matches.length" class="ta-empty">
              <p>{{ c.empty }}</p>
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
                {{ targetNames(drugById(match.drugId).targetIds) }}
                <template v-if="match.matchType !== 'reported'"> · {{ c.exactBadge }}</template>
                <template v-if="drugPresentation[match.drugId].earliest">
                  · {{ c.drugCard.firstApproval }}
                  <a :href="drugPresentation[match.drugId].earliest.url" target="_blank" rel="noopener noreferrer">
                    {{ drugPresentation[match.drugId].date }} · {{ c.approvalRegions[drugPresentation[match.drugId].earliest.region] }} ↗
                  </a>
                </template>
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
                class="ta-evidence"
              >
                <h4>{{ c.activity }}</h4>
                <p>{{ locale === "zh" ? doc.summaryZh : doc.summary }}</p>
                <a :href="doc.url" target="_blank" rel="noopener noreferrer">{{ locale === "zh" ? doc.titleZh : doc.title }} ↗</a>
              </div>

              <details
                class="ta-evidence"
                @toggle="$event.currentTarget.open && loadDocuments(drugById(match.drugId))"
              >
                <summary>{{ c.evidence }}</summary>
                <p v-if="nciDrugLink(drugById(match.drugId).name)">
                  <a :href="nciDrugLink(drugById(match.drugId).name)" target="_blank" rel="noopener noreferrer">{{ c.mechanism.nci }} · {{ drugDisplayName(drugById(match.drugId).name) }} ↗</a>
                </p>
                <p v-if="drugById(match.drugId).identityEvidence">
                  <a :href="drugById(match.drugId).identityEvidence.originalUrl" target="_blank" rel="noopener noreferrer">{{ drugById(match.drugId).identityEvidence.recordId }} ↗</a>
                </p>
                <p v-if="reviewedMechanism(drugById(match.drugId).name)">
                  <a :href="reviewedMechanism(drugById(match.drugId).name).mechanismSource.originalUrl" target="_blank" rel="noopener noreferrer">
                    {{ reviewedMechanism(drugById(match.drugId).name).mechanismSource.sourceName }} · {{ c.drugCard.moa }} ↗
                  </a>
                </p>
                <p v-if="researchProfile(drugById(match.drugId))">
                  {{ researchProfile(drugById(match.drugId)).indication[locale] }} ·
                  <template v-if="researchProfile(drugById(match.drugId)).sponsor">
                    {{ organizationName(researchProfile(drugById(match.drugId)).sponsor, locale) }} ·
                  </template>
                  <a
                    :href="researchProfile(drugById(match.drugId)).url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ c.profileSource }} ↗</a>
                </p>
                <p v-if="drugIndications(match.drugId).length" class="ta-chembl">
                  {{ c.chemblIndications }}
                  <a v-for="row in drugIndications(match.drugId)" :key="row.name" :href="row.url" target="_blank" rel="noopener noreferrer">
                    {{ conditionName(row.name, locale) }} ↗
                  </a>
                </p>
                <p
                  v-if="
                    !reviewLists[match.drugId].length &&
                      ['loaded', 'empty'].includes(documentState[match.drugId])
                  "
                >
                  {{ c.noDirectEvidence }}
                </p>
                <div
                  v-for="doc in expandedDocuments[match.drugId]
                    ? reviewLists[match.drugId]
                    : reviewLists[match.drugId].slice(0, 6)"
                  :key="doc.url"
                  class="ta-evidence-group"
                >
                  <h5>{{ doc.agency }}</h5>
                  <div class="ta-document">
                    <a :href="doc.url" target="_blank" rel="noopener noreferrer">{{ (locale === "zh" && doc.titleZh) || doc.title }} ↗</a>
                    <p v-if="doc.approvedAt">{{ c.approvalDate }} · {{ doc.approvedAt }}</p>
                    <p v-if="doc.locator">{{ doc.locator }}</p>
                  </div>
                </div>
                <button
                  v-if="reviewLists[match.drugId].length > 6"
                  type="button"
                  class="ta-text-button"
                  @click="toggleDocuments(match.drugId, $event)"
                >
                  {{ expandedDocuments[match.drugId] ? c.fewerDocuments : c.moreDocuments }} ({{
                    reviewLists[match.drugId].length
                  }})
                </button>
                <button
                  v-if="!documentState[match.drugId] || documentState[match.drugId] === 'error'"
                  type="button"
                  class="ta-text-button"
                  @click="loadDocuments(drugById(match.drugId))"
                >
                  {{ c.loadFda }} ↗
                </button>
                <p v-if="documentState[match.drugId] === 'loading'" role="status">
                  {{ c.fdaLoading }}
                </p>
                <p v-if="documentState[match.drugId] === 'error'" role="alert">
                  {{ c.fdaFailed }}
                </p>
                <p
                  v-if="
                    documentState[match.drugId] === 'loaded' &&
                      reviewLists[match.drugId]
                        .filter((doc) => doc.agency === 'FDA')
                        .every((doc) => doc.kind === 'application')
                  "
                >
                  {{ c.fdaApplicationOnly }}
                </p>
                <p v-if="documentState[match.drugId] === 'empty'" role="status">
                  {{ c.fdaEmpty }}
                </p>
                <p v-if="drugById(match.drugId).verification === 'imported'" class="ta-origin">
                  <a
                    v-if="sourceById(drugById(match.drugId).sourceId)?.title.startsWith('Open Targets')"
                    :href="sourceById(drugById(match.drugId).sourceId).url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ c.targetEvidence }} · Open Targets ↗</a>
                  <a
                    v-if="/^CHEMBL\d+$/.test(match.drugId)"
                    :href="`https://www.ebi.ac.uk/chembl/explore/compound/${match.drugId}`"
                    target="_blank"
                    rel="noopener noreferrer"
                  >ChEMBL ↗</a>
                </p>
              </details>
              <details class="ta-evidence ta-trial-details">
                <summary>{{ c.trialTitle }} · ClinicalTrials.gov</summary>
                <p v-if="drugById(match.drugId).clinicalEvidence?.length">
                  <a v-for="study in drugById(match.drugId).clinicalEvidence.slice(0, 5)" :key="study.id" :href="study.url" target="_blank" rel="noopener noreferrer">{{ study.id }} ↗ </a>
                </p>
                <div class="ta-trials" aria-live="polite">
                  <button
                    v-if="trialResults[match.drugId]?.state !== 'loaded'"
                    type="button"
                    class="ta-text-button"
                    :disabled="trialResults[match.drugId]?.state === 'loading'"
                    @click="loadTrials(drugById(match.drugId))"
                  >
                    {{
                      trialResults[match.drugId]?.state === "loading" ? c.searching : c.trialSearch
                    }}
                  </button>
                  <p v-if="trialResults[match.drugId]?.state === 'error'">{{ c.trialError }}</p>
                  <template v-if="trialResults[match.drugId]?.state === 'loaded'">
                    <p>
                      {{ c.trialCount }} {{ trialResults[match.drugId].count }} ·
                      <a
                        :href="trialResults[match.drugId].url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >{{ c.trialAll }} ↗</a>
                    </p>
                    <p v-if="!trialResults[match.drugId].records.length">{{ c.mechanism.noVerifiedTrial }}</p>
                    <div
                      v-for="trial in trialResults[match.drugId].records"
                      :key="trial.id"
                      class="ta-trial"
                    >
                      <a
                        :href="`https://clinicaltrials.gov/study/${trial.id}`"
                        target="_blank"
                        rel="noopener noreferrer"
                      >{{ trial.title }} ↗</a>
                      <p>
                        {{
                          [
                            trial.id,
                            trial.ongoingInterventional && c.mechanism.ongoingTrial,
                            ...trial.phases.map(stageLabel),
                            trial.status && drugDisplayName(trial.status.replaceAll("_", " ")),
                            trial.sponsor && organizationName(trial.sponsor, locale),
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        }}
                      </p>
                      <p v-if="trial.conditions.length">
                        {{ c.trialConditions }} ·
                        {{
                          trial.conditions.map((name) => conditionName(name, locale)).join(" · ")
                        }}
                      </p>
                      <p v-if="trial.countries.length">
                        {{ c.trialCountries }} · {{ trial.countries.join(", ") }}
                      </p>
                    </div>
                  </template>
                </div>
              </details>
            </article>
            <button
              v-if="visibleCount < active.matches.length"
              type="button"
              class="ta-more"
              @click="visibleCount += 8"
            >
              {{ c.more }} ({{ active.matches.length - visibleCount }}) ↓
            </button>
            <details v-if="additionalCandidates.length" :key="active.key" class="ta-evidence ta-candidate-list">
              <summary>{{ c.mechanism.candidates }} ({{ additionalCandidates.length }})</summary>
              <CandidateDrugTable
                :key="mechanismResult.retrievedAt"
                :candidates="additionalCandidates"
                :mechanisms="mechanismResult.drugMechanisms"
                :copy="c.mechanism"
                :more="c.more"
              />
            </details>
            <details v-if="mechanismResult?.trialCandidates?.length" class="ta-evidence ta-candidate-list">
              <summary>{{ c.mechanism.trialCandidates }} ({{ mechanismResult.trialCandidates.length }})</summary>
              <p>{{ c.mechanism.trialCandidateNote }}</p>
              <ul>
                <li v-for="candidate in mechanismResult.trialCandidates" :key="candidate.name">
                  {{ candidate.name }} ·
                  <a v-for="study in candidate.studies.slice(0, 3)" :key="study.id" :href="study.url" target="_blank" rel="noopener noreferrer">{{ study.id }} ↗ </a>
                </li>
              </ul>
            </details>
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
      <section class="ta-assay-footer" aria-labelledby="assay-options-title">
        <h2 id="assay-options-title">{{ c.assayOptions }}</h2>
        <div class="ta-assay-options">
          <button type="button" disabled>{{ c.bindingActivity }}</button>
          <button type="button" disabled>{{ c.cellActivity }}</button>
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
  --ta-body-size: 0.72rem;
  --ta-body-line: 1.55;
  --ta-heading-line: 1.35;
  --ta-action-width: 9.625rem;
  --ta-language-gap: 5px;
  --ta-field-gap: 8px;
  --ta-group-gap: 14px;
  width: min(var(--bc-content-max, 1120px), calc(100% - var(--bc-container-inline, 48px)));
  margin: 0 auto;
  padding-top: 72px;
}
.ta-intro {
  padding: 12px 0 32px;
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
  margin: 0 0 18px;
}
p {
  color: var(--app-muted);
  line-height: var(--ta-body-line);
  font-size: 0.82rem;
}
a {
  color: var(--app-accent);
  text-underline-offset: 4px;
  overflow-wrap: anywhere;
}
h2,
h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
}
h4 {
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0;
}
h5 {
  font: 600 0.68rem var(--font-mono, monospace);
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
form {
  margin-top: 24px;
}
label {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--app-muted);
}
.ta-input-row {
  display: flex;
  gap: 10px;
  margin-top: 8px;
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
  .ta-input-row > .ta-primary,
  .ta-mechanism-heading > .ta-primary {
    box-sizing: border-box;
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
  margin: 8px 0 0;
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
  font-size: 0.65rem;
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
  font: 0.7rem var(--font-mono, monospace);
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
  padding: 22px 0;
  border-bottom: 1px solid var(--app-rule-subtle);
}
.ta-drug:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.ta-drug p {
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
  margin: var(--ta-field-gap) 0;
  overflow-wrap: anywhere;
}
.ta-drug-labels { display: flex; flex-wrap: wrap; gap: 6px; }
.ta-drug-moa, .ta-regional {
  margin-top: var(--ta-group-gap);
  display: grid;
  gap: var(--ta-field-gap);
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
}
.ta-drug-moa h5, .ta-regional h5 { margin: 0; font-size: .82rem; font-weight: 600; }
.ta-regional p { margin: 0; }
.ta-drug-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  cursor: pointer;
  flex-wrap: wrap;
}
.ta-drug-choice strong {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--app-text);
  overflow-wrap: anywhere;
}
.ta-drug-choice > .ta-tag {
  margin-left: auto;
}
.ta-brand {
  display: block;
  color: var(--app-muted);
  font-size: 0.65rem;
  letter-spacing: 0.02em;
  margin-top: 3px;
}
.ta-drug-targets {
  color: var(--app-accent);
  font-family: var(--font-mono, monospace);
}
.ta-evidence {
  margin-top: var(--ta-group-gap);
  padding: 14px;
  border-radius: 10px;
  background: var(--app-section);
}
.ta-literature {
  margin-top: 24px;
}
.ta-literature-intro {
  margin: 8px 0 16px;
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
  font-size: 0.74rem;
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
.ta-intro {
  display: grid;
  gap: 12px;
  padding-bottom: 14px;
}
.ta-input form {
  margin: 0;
}
.ta-input-row {
  margin-top: 0;
}
#results-title { scroll-margin-top: 88px; }
.ta-mechanism-heading {
  flex-wrap: wrap;
  gap: 8px;
}
.ta-mechanism-heading > * {
  min-width: 0;
}
.ta-overview {
  margin: 12px 0 22px;
}
.ta-approvals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 100px), 1fr));
  gap: var(--ta-field-gap) 16px;
  margin: 0;
  overflow-wrap: anywhere;
}
.ta-approvals dt {
  color: var(--app-muted);
  font-size: 0.72rem;
}
.ta-approvals dd {
  margin: 4px 0 0;
  font-size: 0.8rem;
}
.ta-drug p.ta-drug-mechanism {
  display: inline-block;
  margin-inline-end: 6px;
}
.ta-assay-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.ta-source-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ta-field-gap) var(--ta-group-gap);
  margin: var(--ta-group-gap) 0;
  line-height: var(--ta-body-line);
  color: var(--app-muted);
  font-size: 0.75rem;
}
.ta-source-bar:has(+ .ta-coverage) {
  margin-bottom: var(--ta-field-gap);
}
.ta-source-bar a {
  max-inline-size: 100%;
}
.ta-coverage {
  margin: 0 0 var(--ta-group-gap);
}
.ta-coverage a {
  display: inline-block;
  max-inline-size: 100%;
}
.ta-results > [role="status"] {
  margin: 0 0 var(--ta-group-gap);
}
details.ta-evidence {
  border: 1px solid var(--app-rule-subtle);
  color: var(--app-text);
}
.ta-evidence summary {
  cursor: pointer;
  font-size: 0.83rem;
  font-weight: 600;
  line-height: var(--ta-body-line);
}
.ta-evidence summary:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 4px;
}
.ta-container :deep(details > summary) {
  cursor: pointer;
  line-height: var(--ta-body-line);
}
.ta-evidence[open] > :nth-child(2) { margin-top: 0; }
.ta-evidence[open] > :last-child { margin-bottom: 0; }
.ta-container :deep(details[open] > summary) { margin-bottom: var(--ta-field-gap); }
.ta-chembl {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}
.ta-drug-choice h4 {
  font-size: 1rem;
}
.ta-trial {
  padding: 12px 0;
  border-top: 1px solid var(--app-rule-subtle);
  font-size: 0.78rem;
}
.ta-origin a + a {
  margin-inline-start: 12px;
}
.ta-evidence-group {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: var(--ta-field-gap);
  padding-top: var(--ta-field-gap);
  margin-top: var(--ta-field-gap);
  border-top: 1px solid var(--app-rule-subtle);
}
.ta-document a {
  display: block;
  font-size: 0.72rem;
  line-height: var(--ta-body-line);
}
.ta-doc-status {
  display: inline-block;
  font-size: 0.61rem;
  color: var(--app-faint);
  margin-top: 3px;
}
.ta-document p,
.ta-source-note {
  font-size: 0.66rem !important;
  margin: var(--ta-language-gap) 0 0 !important;
}
.ta-documents .ta-text-button {
  font-size: 0.68rem;
}
.ta-origin {
  border-top: 1px solid var(--app-rule-subtle);
  padding-top: 12px;
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
.ta-assay-footer {
  margin: 32px 4px;
}
.ta-assay-footer h2 {
  font-size: 0.75rem;
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
    padding-top: 20px;
  }
  .ta-intro {
    padding-bottom: 22px;
  }
  .ta-intro h1 {
    font-size: 1.75rem;
  }
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
  .ta-drug-choice > .ta-tag {
    margin-left: 30px;
  }
  .ta-evidence {
    padding: 12px;
  }
  .ta-evidence-group {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }
}
.ta-coverage, .ta-candidate-list {
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
  overflow-wrap: anywhere;
}
.ta-candidate-list ul { margin-block: var(--ta-field-gap) 0; padding-inline-start: 20px; }
.ta-candidate-list li + li { margin-top: var(--ta-language-gap); }
</style>
