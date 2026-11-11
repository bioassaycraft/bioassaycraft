<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import MobileToolHeader from "../components/common/MobileToolHeader.vue";
import SiteFooter from "../components/layout/SiteFooter.vue";
import { useLocale } from "../utils/locale";
import { animateElement, getPanelEnterKeyframes } from "../utils/motion.js";
import { sampleCatalog } from "../lib/target-to-assay/catalog.js";
import { searchDrugs } from "../lib/target-to-assay/search.js";
import { searchOnline } from "../lib/target-to-assay/online.js";
import {
  approvalMilestones,
  evidenceFor,
  fetchFdaDocuments,
  sortReviewEvidence,
} from "../lib/target-to-assay/evidence.js";
import { mechanismLabels, summarizeMechanisms } from "../lib/target-to-assay/mechanisms.js";
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
  if (stage === "APPROVAL") return c.value.approvalStage;
  const match = stage.match(/^PHASE_?([1-4])(?:_([1-4]))?$/);
  if (!match) return drugDisplayName(stage.replaceAll("_", " "));
  const phase = match.slice(1).filter(Boolean).join("/");
  return locale.value === "zh" ? `临床 ${phase} 期` : `Phase ${phase}`;
}
const input = ref("");
const submitted = ref("CD3 × CD20");
const error = ref(null);
const loading = ref(false);
const mode = ref("sample");
const fetchedAt = ref("");
const activeKey = ref("CD3|CD20");
const data = ref(sampleCatalog);
const resolutions = ref({});
const documents = ref({});
const documentState = ref({});
const trialResults = ref({});
const expandedDocuments = ref({});
const drugPanel = ref(null);
const visibleCount = ref(8);
const visibleMatches = computed(() =>
  rankMatches(active.value.matches).slice(0, visibleCount.value),
);
watch([activeKey, submitted], () => {
  visibleCount.value = 8;
});
const searchDate = computed(() =>
  fetchedAt.value
    ? new Intl.DateTimeFormat(locale.value === "zh" ? "zh-CN" : "en-GB", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(fetchedAt.value))
    : "",
);
let controller;
const documentControllers = new Set();
onBeforeUnmount(() => {
  controller?.abort();
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
      const target = result.value.resolvedTargets.find((item) => item.id === id);
      const alias =
        mode.value === "online" && target?.ensemblId
          ? target.aliases.find((name) => name.toLowerCase() !== id.toLowerCase())
          : null;
      return alias ? `${alias} (${id})` : id;
    })
    .join(" × ");
}
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
const externalTargetLinks = computed(() => {
  const acro = {
    CD19: "https://es.acrobiosystems.com/category/target-protein/cd19",
    CD20: "https://jp.acrobiosystems.com/category/target-protein/cd20",
  };
  const links = [];
  if (paperTerm.value) {
    const params = new URLSearchParams({ term: paperTerm.value });
    links.push({ label: "PubMed", url: `https://pubmed.ncbi.nlm.nih.gov/?${params}` });
  }
  const targets = activeTargets.value;
  const isCd20 = (id) => ["CD20", "MS4A1"].includes(id);
  for (const target of targets) {
    const label = isCd20(target.id) ? "CD20" : target.id;
    const ensemblId = target.ensemblId || (label === "CD20" ? "ENSG00000156738" : null);
    if (ensemblId) {
      links.push({
        label: `Open Targets · ${label}`,
        url: `https://platform.opentargets.org/target/${encodeURIComponent(ensemblId)}`,
      });
      const gene = label === "CD20" ? "MS4A1" : target.id;
      const params = new URLSearchParams({ query: `gene_exact:${gene} AND organism_id:9606` });
      links.push({
        label: `UniProt · ${label}`,
        url: `https://www.uniprot.org/uniprotkb?${params}`,
      });
    }
    if (Object.hasOwn(acro, label)) links.push({ label: `ACRO · ${label}`, url: acro[label] });
  }
  if (!links.some(({ label }) => label.startsWith("ACRO ·"))) {
    links.push({ label: c.value.acroCatalog, url: "https://www.acrobiosystems.com/products" });
  }
  links.push(
    targets.some(({ id }) => isCd20(id))
      ? {
          label: c.value.synapseCd20,
          url: "https://synapse.patsnap.com/blog/cd20-target-evaluation-report",
        }
      : { label: c.value.synapseHome, url: "https://synapse.patsnap.com/" },
  );
  return links;
});
const drugById = (id) => data.value.drugs.find((d) => d.id === id);
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

const overviewScopes = computed(() =>
  resultGroups.value.map((group) => ({
    ...group,
    drugs: rankMatches(group.matches).map(({ drugId }) => drugById(drugId)),
  })),
);
const overviewSample = computed(() => {
  const samples = [0, 1, 2, 3].flatMap((index) =>
    overviewScopes.value.map((scope) => scope.drugs[index]).filter(Boolean),
  );
  return [...new Map(samples.map((drug) => [drug.id, drug])).values()].slice(0, 12);
});
const chemblKey = computed(() =>
  overviewSample.value
    .map((drug) => drug.id)
    .filter((id) => /^CHEMBL\d+$/.test(id))
    .join(","),
);
const chemblResults = ref({});
const openApprovals = ref(null);
function toggleApprovals(key) {
  openApprovals.value = openApprovals.value === key ? null : key;
}
watch(result, () => {
  openApprovals.value = null;
});
const overviewCards = computed(() =>
  overviewScopes.value.map((scope) => {
    const sample = overviewSample.value.filter((drug) => scope.drugs.includes(drug));
    const rows = (chemblResults.value[chemblKey.value]?.rows || []).filter((row) =>
      sample.some((drug) => drug.id === row.id),
    );
    const stages = new Map();
    for (const drug of scope.drugs) {
      const stage = drug.clinicalStage || "APPROVAL";
      stages.set(stage, (stages.get(stage) || 0) + 1);
    }
    return {
      ...scope,
      mechanisms: summarizeMechanisms(scope.drugs),
      approvedDrugs: scope.drugs
        .filter((drug) => (drug.clinicalStage || "APPROVAL") === "APPROVAL")
        .map((drug) => ({
          drug,
          profile: researchProfile(drug),
          mechanisms: summarizeMechanisms([drug]),
        })),
      stages: [...stages].sort(([a], [b]) => a.localeCompare(b)),
      profiles: scope.drugs.map(researchProfile).filter(Boolean),
      indications: rows
        .filter(
          (row, index) =>
            rows.findIndex((other) => other.name.toLowerCase() === row.name.toLowerCase()) ===
            index,
        )
        .slice(0, 6),
    };
  }),
);

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
  if (loading.value) return;
  controller?.abort();
  controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  loading.value = true;
  error.value = null;
  try {
    const next = await searchOnline(
      { targets: input.value, resolutions: resolutions.value, includeClinical: true },
      { signal: controller.signal },
    );
    data.value = next.catalog;
    submitted.value = next.resolvedTargets.map((t) => t.id);
    activeKey.value = "";
    mode.value = "online";
    fetchedAt.value = next.fetchedAt;
    await nextTick();
    animateElement(drugPanel.value, getPanelEnterKeyframes());
  } catch (e) {
    error.value = {
      code: c.value.errors[e.code] ? e.code : "network",
      input: e.details?.input,
      candidates: e.details?.candidates || [],
    };
  } finally {
    clearTimeout(timeout);
    loading.value = false;
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
            /><button class="ta-primary" type="submit" :disabled="loading">
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
        <div class="ta-section-heading">
          <h2>{{ c.overview }}</h2>
          <span v-if="mode === 'online'">{{ c.online }}{{ searchDate ? " · " + searchDate : "" }}</span>
        </div>
        <article v-for="(card, index) in overviewCards" :key="card.key" class="ta-overview-scope">
          <div class="ta-section-heading">
            <h3>{{ targetNames(card.targetIds) }}</h3>
            <span v-if="overviewCards.length > 1">{{
              index === 0 ? c.fullOverview : c.singleOverview
            }}</span>
          </div>
          <p class="ta-overview-mechanisms">
            <strong>{{ c.mechanismTypes }}</strong>{{ locale === "zh" ? "：" : ": " }}<span>{{
              card.mechanisms.length
                ? card.mechanisms.map(([kind]) => mechanismLabels[kind][locale]).join(locale === "zh" ? "、" : ", ")
                : c.mechanismUnavailable
            }}</span>
          </p>
          <ul v-if="card.mechanisms.length" class="ta-mechanism-summaries">
            <li v-for="[kind] in card.mechanisms" :key="kind">
              <strong v-if="card.mechanisms.length > 1">{{ mechanismLabels[kind][locale] }}：</strong>
              {{ c.mechanismSummaries[kind] }}
            </li>
          </ul>
          <div class="ta-overview-stage-group">
            <div class="ta-overview-stages">
              <strong>{{ mode === "sample" ? c.sampleCount(card.drugs.length) : card.drugs.length + " " + c.matches }}</strong>
              <template v-for="[stage, count] in card.stages" :key="stage">
                <button
                  v-if="stage === 'APPROVAL'"
                  type="button"
                  class="ta-tag ta-approval-trigger"
                  :aria-expanded="openApprovals === card.key"
                  :aria-controls="`ta-approved-${index}`"
                  @click="toggleApprovals(card.key)"
                  @keydown.esc="openApprovals === card.key && (openApprovals = null)"
                >
                  {{ c.approvalList }} · {{ count }} <span aria-hidden="true">▾</span>
                </button>
                <span v-else class="ta-tag">{{ stageLabel(stage) }} · {{ count }}</span>
              </template>
            </div>
            <ul
              v-if="card.approvedDrugs.length"
              v-show="openApprovals === card.key"
              :id="`ta-approved-${index}`"
              class="ta-approved-list"
              :aria-label="c.approvalList"
            >
              <li v-for="{ drug, profile, mechanisms } in card.approvedDrugs" :key="drug.id">
                <strong>{{ drugHeadingName(drug.name, locale) }}</strong>
                <dl class="ta-approved-fields">
                  <div>
                    <dt>{{ c.brandName }}</dt>
                    <dd>{{ profile?.brand || (drug.brand && drugDisplayName(drug.brand)) || c.approvalUnknown }}</dd>
                  </div>
                  <div>
                    <dt>{{ c.euHolder }}</dt>
                    <dd>{{ profile?.sponsor ? organizationName(profile.sponsor, locale) : c.approvalUnknown }}</dd>
                  </div>
                  <div v-if="mechanisms.length">
                    <dt>{{ c.mechanismTypes }}</dt>
                    <dd>{{ mechanisms.map(([kind]) => mechanismLabels[kind][locale]).join(" · ") }}</dd>
                  </div>
                </dl>
              </li>
            </ul>
          </div>
          <div v-if="card.profiles.length || card.indications.length" class="ta-overview-grid">
            <h4>{{ c.indications }}</h4>
            <p v-if="card.profiles.length">
              <a
                v-for="profile in card.profiles"
                :key="profile.url"
                :href="profile.url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ profile.indication[locale] }} ↗</a>
            </p>
            <p v-if="card.indications.length" class="ta-chembl">
              <span>{{ c.chemblIndications }}</span>
              <a
                v-for="row in card.indications"
                :key="row.name"
                :href="row.url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ conditionName(row.name, locale) }} ↗</a>
            </p>
          </div>
        </article>
      </section>
      <section class="ta-results ta-panel" aria-labelledby="results-title" :aria-busy="loading">
        <div class="ta-section-heading">
          <h2 id="results-title"><span class="ta-step">02</span>{{ c.results }}</h2>
          <p aria-live="polite">
            {{ resultGroups.length }} {{ c.combinations }} · <strong>{{ resultCount }}</strong>
            {{ c.uniqueDrugs }}
          </p>
        </div>
        <div class="ta-source-bar">
          <a
            v-for="link in externalTargetLinks"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
          >{{ link.label }} ↗</a>
        </div>
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
            <article v-for="(match, index) in visibleMatches" :key="match.drugId" class="ta-drug">
              <div class="ta-drug-choice">
                <h4>
                  {{ drugHeadingName(drugById(match.drugId).name, locale) }}
                  <span v-if="drugById(match.drugId).brand" class="ta-brand">{{
                    drugDisplayName(drugById(match.drugId).brand)
                  }}</span>
                </h4>
                <span class="ta-tag">{{
                  match.matchType === "reported" ? c.reported : c.exactBadge
                }}</span>
              </div>
              <p class="ta-drug-targets">{{ targetNames(drugById(match.drugId).targetIds) }}</p>
              <p>
                {{ drugById(match.drugId).clinicalStage ? c.stage : c.recordStage }} ·
                {{ stageLabel(drugById(match.drugId).clinicalStage || "APPROVAL") }}
              </p>
              <dl class="ta-approvals" :aria-label="c.regionalApprovals">
                <div
                  v-for="item in approvalMilestones(
                    drugById(match.drugId),
                    documents[match.drugId],
                  )"
                  :key="item.region"
                >
                  <dt>
                    {{ c.approvalRegions[item.region]
                    }}<small v-if="item.date && item.certificate"> · {{ c.certificateDate }}</small>
                  </dt>
                  <dd>
                    <a
                      v-if="item.date && item.url"
                      :href="item.url"
                      target="_blank"
                      rel="noopener noreferrer"
                    >{{ item.date }} ↗</a>
                    <span v-else>{{ c.approvalUnknown }}</span>
                  </dd>
                </div>
              </dl>
              <p
                v-for="[kind] in summarizeMechanisms([drugById(match.drugId)])"
                :key="kind"
                class="ta-tag ta-drug-mechanism"
              >
                {{ mechanismLabels[kind][locale] }}
              </p>
              <p v-if="drugById(match.drugId).mechanisms?.length">
                {{ drugById(match.drugId).mechanisms.join("; ") }}
              </p>
              <p v-if="researchProfile(drugById(match.drugId))">
                {{ researchProfile(drugById(match.drugId)).type[locale] }} ·
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
                :open="index === 0"
                @toggle="$event.currentTarget.open && loadDocuments(drugById(match.drugId))"
              >
                <summary>{{ c.evidence }}</summary>
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
                    :href="`https://platform.opentargets.org/drug/${match.drugId}`"
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
          </div>
        </div>
      </section>
      <section class="ta-literature ta-panel" aria-labelledby="literature-title">
        <div class="ta-section-heading">
          <h2 id="literature-title">{{ c.literatureTitle }}</h2>
          <span>PubMed · {{ targetNames(active.targetIds) }}</span>
        </div>
        <p class="ta-literature-intro">{{ c.literatureHelp }}</p>
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
                      [paper.journal, paper.year, "PMID " + paper.id].filter(Boolean).join(" · ")
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
  line-height: 1.65;
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
.ta-panel {
  padding: 24px;
  border: 1px solid var(--app-rule-subtle);
  border-radius: var(--bc-panel-radius, 16px);
  background: var(--app-surface);
  box-shadow: var(--app-card-shadow);
}
.ta-step {
  font: 0.7rem var(--font-mono, monospace);
  color: var(--app-faint);
  margin-right: 14px;
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
  font-size: 0.72rem;
  margin: 9px 0;
  overflow-wrap: anywhere;
}
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
  margin-top: 22px;
  padding: 16px;
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
.ta-paper h3 {
  line-height: 1.45;
}
.ta-paper p,
.ta-literature-content > p {
  margin: 0;
}
.ta-paper-meta {
  font-size: 0.74rem;
  line-height: 1.5;
}
.ta-paper-excerpt {
  display: grid;
  gap: 3px;
  line-height: 1.65;
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
.ta-overview {
  margin: 12px 0 22px;
}
.ta-overview-scope {
  padding-top: 16px;
}
.ta-overview-scope + .ta-overview-scope {
  margin-top: 14px;
  border-top: 1px solid var(--app-rule-subtle);
}
.ta-overview-stages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 14px 0;
  font-size: 0.85rem;
}
.ta-overview-mechanisms {
  margin: 14px 0 0;
  font-size: 0.95rem;
  line-height: 1.5;
}
.ta-mechanism-summaries {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  color: var(--app-muted);
  font-size: 0.85rem;
  line-height: 1.55;
}
.ta-overview-stage-group {
  display: flow-root;
}
.ta-approval-trigger {
  cursor: pointer;
  min-height: 32px;
}
.ta-approval-trigger:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 2px;
}
.ta-approved-list {
  list-style: none;
  padding: 0 12px;
  margin: 0 0 14px;
  border: 1px solid var(--app-rule-subtle);
  border-radius: 8px;
  overflow-wrap: anywhere;
}
.ta-approved-list li {
  padding: 12px 0;
  font-size: 0.85rem;
  line-height: 1.5;
}
.ta-approved-list li + li {
  border-top: 1px solid var(--app-rule-subtle);
}
.ta-approved-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  gap: 8px 16px;
  margin: 6px 0 0;
}
.ta-approved-fields dt {
  color: var(--app-muted);
  font-size: 0.75rem;
}
.ta-approved-fields dd {
  margin: 1px 0 0;
}
.ta-approvals {
  display: flex;
  gap: 8px 24px;
  flex-wrap: wrap;
  margin: 12px 0;
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
.ta-overview-grid a + a {
  margin-inline-start: 12px;
}
.ta-overview-grid h4 {
  font-size: 0.8rem;
}
.ta-source-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  margin: 16px 0 24px;
  line-height: 1.5;
  color: var(--app-muted);
  font-size: 0.75rem;
}
details.ta-evidence {
  border: 1px solid var(--app-rule-subtle);
  color: var(--app-text);
}
.ta-evidence summary {
  cursor: pointer;
  font-size: 0.83rem;
  font-weight: 600;
}
.ta-evidence summary:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 4px;
}
.ta-evidence[open] summary {
  margin-bottom: 12px;
}
.ta-trial-details {
  margin-top: 10px;
}
.ta-trial-details summary {
  color: var(--app-muted);
  font-size: 0.75rem;
  font-weight: 500;
}
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
  gap: 10px;
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid var(--app-rule-subtle);
}
.ta-document {
  padding-bottom: 10px;
}
.ta-document a {
  display: block;
  font-size: 0.72rem;
  line-height: 1.65;
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
  margin: 4px 0 !important;
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
</style>
