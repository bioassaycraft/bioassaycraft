<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { activeSingleDrugPhase, investigationalGroups, rankClinicalStudies, rankInvestigational } from "../../lib/target-to-assay/investigational.js";
import { investigationalSources } from "../../lib/target-to-assay/investigational-sources.js";
import { ingredientKey } from "../../lib/target-to-assay/display.js";
import { loadSupplement } from "../../lib/target-to-assay/supplement-client.js";
import { drugDisplayName } from "../../lib/target-to-assay/display.js";
import { animateElement, getPanelEnterKeyframes } from "../../utils/motion.js";

const props = defineProps({
  discovery: { type: Object, default: null },
  searching: Boolean,
  searchError: Boolean,
  catalog: { type: Object, required: true },
  combinations: { type: Array, required: true },
  locale: { type: String, required: true },
  stageLabel: { type: Function, required: true },
});
const emit = defineEmits(["discover"]);
const zh = computed(() => props.locale === "zh");
const t = (cn, en) => zh.value ? cn : en;
const manual = ref(null);
const currentCatalog = computed(() => manual.value?.catalog || props.catalog);
const currentDiscovery = computed(() => manual.value || props.discovery);
const groups = computed(() => investigationalGroups(currentCatalog.value, manual.value?.combinations || props.combinations));
const selection = ref("");
const active = computed(() => groups.value.find(({ key }) => key === selection.value) || groups.value[0]);
const profiles = ref({});
const resources = ref({});
const visibleTrials = ref({});
const reverse = ref(null);
const discovering = ref(false);
const development = import.meta.env.DEV;
const partialSources = computed(() => ["Open Targets", "ChEMBL"].filter((source) =>
  currentDiscovery.value?.sourceChecks?.[source]?.some((check) =>
    check.truncated || !["success_empty", "success_with_data", "not_queried"].includes(check.state))));
let discoveryRequest;
let detailRequest = new AbortController();
const checked = ref(0);
const busy = ref(false);
const panel = ref(null);
let request;
function reset() {
  request?.abort();
  detailRequest.abort();
  detailRequest = new AbortController();
  resources.value = {};
  visibleTrials.value = {};
  reverse.value = null;
  profiles.value = {};
  checked.value = 0;
  busy.value = false;
}
watch(active, () => {
  reset();
  if (currentDiscovery.value && active.value?.candidates.length) void checkNext();
});
watch(() => props.discovery, () => {
  discoveryRequest?.abort();
  manual.value = null;
  selection.value = "";
  discovering.value = false;
});
onBeforeUnmount(() => {
  request?.abort();
  detailRequest.abort();
  discoveryRequest?.abort();
});

const statuses = {
  RECRUITING: ["招募中", "Recruiting"],
  ACTIVE_NOT_RECRUITING: ["进行中，停止招募", "Active, not recruiting"],
  NOT_YET_RECRUITING: ["尚未招募", "Not yet recruiting"],
  ENROLLING_BY_INVITATION: ["邀请入组", "Enrolling by invitation"],
  COMPLETED: ["已完成", "Completed"],
  SUSPENDED: ["已暂停", "Suspended"],
  TERMINATED: ["已终止", "Terminated"],
  WITHDRAWN: ["已撤回", "Withdrawn"],
  UNKNOWN: ["状态未知", "Unknown"],
};
const statusLabel = (status) => t(...(statuses[status] || statuses.UNKNOWN));
const rows = computed(() => (active.value?.candidates || []).flatMap((item) => {
  const profile = profiles.value[item.drug.id];
  if (!profile || profile.approval === "approved") return [];
  return [{ ...item, profile, studies: rankClinicalStudies(profile.studies) }];
}).sort(rankInvestigational));
const confirmedScope = (match) => match.state === "verified" ||
  (active.value.targetIds.length === 1 && match.reason === "additional_direct_targets");
const verified = computed(() => rows.value.filter(({ profile, approvalSignal, studies, match }) =>
  profile.approval === "checked" && !approvalSignal && confirmedScope(match) && studies.length > 0));
const preclinical = computed(() => rows.value.filter(({ drug, profile, approvalSignal, studies, match }) =>
  confirmedScope(match) && drug.clinicalStage === "PRECLINICAL" && profile.approval === "checked" && !approvalSignal && !studies.length));
const pending = computed(() => rows.value.filter((row) =>
  !verified.value.includes(row) && !preclinical.value.includes(row)));
const sections = computed(() => [
  { label: t("有临床登记 · 核验范围内未发现上市许可", "Clinical records · No approval found in sources checked"), rows: verified.value },
  { label: t("来源报告临床前研究", "Reported preclinical research"), rows: preclinical.value },
  { label: t("上市状态或临床资料待核实", "Approval or clinical evidence pending"), rows: pending.value },
]);

function publicSources(drug, aliases) {
  const names = new Set([drug.name, ...aliases].map(ingredientKey));
  return investigationalSources.find((row) => row.names.some((name) => names.has(ingredientKey(name))));
}
const requestBody = (drug, aliases) => ({
  name: drug.name, brand: drug.brand,
  aliases: aliases.filter((name) => /^[\p{L}\p{N}][\p{L}\p{N} .()/'’+,-]{0,139}$/u.test(name)).slice(0, 6),
});
async function discover() {
  if (discovering.value) return;
  discovering.value = true;
  const current = new AbortController();
  discoveryRequest = current;
  try {
    manual.value = await loadSupplement("investigational-discovery", {
      targets: props.combinations[0].targetIds,
    }, AbortSignal.any([current.signal, AbortSignal.timeout(26000)]));
  } catch {
    if (!current.signal.aborted) manual.value = { failed: true };
  } finally {
    if (!current.signal.aborted) discovering.value = false;
  }
}
async function discoverReverse() {
  const signal = detailRequest.signal;
  reverse.value = { loading: true };
  try {
    const result = await loadSupplement("investigational-trials", { targets: active.value.targetIds }, signal);
    if (!signal.aborted) reverse.value = result;
  } catch {
    if (!signal.aborted) reverse.value = { failed: true };
  }
}
const unmatchedTrials = computed(() => {
  const known = new Set(currentCatalog.value.drugs.flatMap(({ name, brand, aliases }) =>
    [name, brand, ...(aliases || [])].filter(Boolean).map(ingredientKey)));
  return (reverse.value?.rows || []).filter(({ name, aliases }) =>
    ![name, ...aliases].some((value) => known.has(ingredientKey(value))));
});
async function research(drug, aliases) {
  if (resources.value[drug.id] && !resources.value[drug.id].failed) return;
  const signal = detailRequest.signal;
  resources.value[drug.id] = { loading: true };
  try {
    const result = await loadSupplement("investigational-research", requestBody(drug, aliases), signal);
    if (!signal.aborted) resources.value[drug.id] = result;
  } catch {
    if (!signal.aborted) resources.value[drug.id] = { failed: true };
  }
}

async function checkNext() {
  if (busy.value) return;
  const batch = active.value.candidates.slice(checked.value, checked.value + 6);
  if (!batch.length) return;
  request = new AbortController();
  const current = request;
  const signal = AbortSignal.any([current.signal, AbortSignal.timeout(28000)]);
  busy.value = true;
  for (let offset = 0; offset < batch.length; offset += 3) {
    const results = await Promise.all(batch.slice(offset, offset + 3).map(async ({ drug, aliases }) => {
      try {
        return [drug.id, await loadSupplement("investigational-profile", requestBody(drug, aliases), signal)];
      } catch {
        return [drug.id, { approval: "unknown", issues: { request: "unavailable" } }];
      }
    }));
    if (current.signal.aborted || current !== request) return;
    profiles.value = { ...profiles.value, ...Object.fromEntries(results) };
  }
  checked.value += batch.length;
  busy.value = false;
  if (panel.value) animateElement(panel.value, getPanelEnterKeyframes(2));
}
</script>

<template>
  <h2 id="investigational-title">{{ t("未上市药物资料", "Investigational Drug Information") }}</h2>
  <p class="scope">
    {{ t(
      "核验范围为本站已核对的监管记录、Drugs@FDA 和 EMA EPAR。临床资料来自 ClinicalTrials.gov，全球上市覆盖有限。",
      "Checks cover the site’s reviewed regulatory records, Drugs@FDA and EMA EPAR. Clinical records come from ClinicalTrials.gov. Global approval coverage is limited."
    ) }}
  </p>
  <p v-if="searching || discovering" role="status">{{ t("正在发现候选药物…", "Discovering drug candidates…") }}</p>
  <div v-else-if="!currentDiscovery || manual?.failed || searchError" class="results">
    <p role="status">
      {{ searchError || manual?.failed
        ? t("发现请求未完成，可重试。", "Discovery did not complete. You can retry.")
        : t("当前为示例靶点。检索后会查询实时在研候选。", "Showing example targets. Run discovery to query live candidates.") }}
    </p>
    <button type="button" @click="discover">{{ t("检索在研药物", "Discover investigational drugs") }}</button>
    <button v-if="searchError" type="button" @click="emit('discover')">{{ t("重试当前输入", "Retry entered targets") }}</button>
  </div>
  <div v-else-if="active" class="workspace">
    <nav :aria-label="t('在研药物靶点组合', 'Investigational target combinations')">
      <button
        v-for="group in groups" :key="group.key" type="button" :aria-pressed="active.key === group.key"
        @click="selection = group.key"
      >
        {{ group.targetIds.join(" × ") }}
      </button>
    </nav>
    <div ref="panel" class="results" :aria-busy="busy">
      <p v-if="partialSources.length" class="scope" role="status">{{ t("部分来源查询失败或返回不完整", "Some sources failed or returned partial results") }} · {{ partialSources.join(", ") }}</p>
      <p v-if="!active.candidates.length">
        {{ partialSources.length
          ? t("当前已返回的资料不足以确认候选。", "Retrieved sources do not establish any candidates.")
          : t("当前靶点范围暂无可核验候选。", "No candidates to check for this target scope.") }}
      </p>
      <button v-if="checked < active.candidates.length" type="button" :disabled="busy" @click="checkNext">
        {{ busy ? t("核验中…", "Checking…") : checked ? t("核验更多候选", "Check more candidates") : t("核验在研候选", "Check investigational candidates") }}
      </button>
      <button
        v-if="checked && rows.some(({ profile }) => Object.keys(profile.issues || {}).length)" type="button"
        :disabled="busy" @click="reset(); checkNext()"
      >
        {{ t("重试候选核验", "Retry candidate checks") }}
      </button>
      <p v-if="checked" class="scope" role="status">{{ t("已核验", "Checked") }} {{ checked }} / {{ active.candidates.length }}</p>
      <p v-if="checked && !rows.length">{{ t("本批候选暂无可展示资料。", "No records to display for the checked candidates.") }}</p>
      <details v-if="development">
        <summary>{{ t("查询诊断", "Discovery diagnostics") }}</summary>
        <p>{{ active.counts }} · {{ t("在线排除", "Online exclusions") }} {{ Object.values(profiles).filter((profile) => profile.approval === "approved").length }} · {{ t("可展示", "Displayed") }} {{ rows.length }} · {{ t("待核实", "Pending") }} {{ pending.length }}</p>
        <p v-for="source in ['Open Targets', 'ChEMBL']" :key="source">{{ source }} · {{ currentDiscovery.sourceChecks?.[source]?.map(({ state, returned, count, status }) => [state, returned != null && `${returned}/${count}`, status].filter(Boolean).join(" ")).join(" / ") }}</p>
        <p v-if="reverse?.returned != null">ClinicalTrials.gov · {{ reverse.returned }} / {{ reverse.total ?? '—' }}</p>
      </details>
      <details>
        <summary>{{ t("从临床登记补查待核实干预", "Check the registry for unverified interventions") }}</summary>
        <button type="button" :disabled="reverse?.loading" @click="discoverReverse">{{ t("查询 ClinicalTrials.gov", "Search ClinicalTrials.gov") }}</button>
        <p v-if="reverse?.failed" role="alert">{{ t("临床登记暂不可用。", "Registry unavailable.") }}</p>
        <p v-else-if="reverse && !reverse.loading">{{ t("以下仅为靶点检索命中的试验干预，靶点及上市状态待核实。", "These interventions were found in target-related trials. Target and approval status are unverified.") }}</p>
        <ul v-if="unmatchedTrials.length">
          <li v-for="item in unmatchedTrials" :key="item.name">
            {{ item.name }} ·
            <a v-for="study in item.studies.slice(0, 3)" :key="study.id" :href="study.url" target="_blank" rel="noopener noreferrer">{{ study.id }} ↗ </a>
          </li>
        </ul>
      </details>
      <section v-for="section in sections.filter(({ rows }) => rows.length)" :key="section.label">
        <h3>{{ section.label }}</h3>
        <article v-for="{ drug, match, profile, studies, aliases, directTargets } in section.rows" :key="drug.id">
          <header class="drug-heading">
            <h4>{{ drugDisplayName(drug.name) }}</h4>
            <p v-if="aliases.length" class="scope">{{ aliases.slice(0, 3).join(" · ") }}</p>
            <details v-if="aliases.length > 3" class="scope">
              <summary>{{ t("更多别名", "More aliases") }}</summary>
              <p>{{ aliases.slice(3).join(" · ") }}</p>
            </details>
            <p class="drug-meta">
              <span v-if="match.supported.length">{{ (match.state === "verified" ? directTargets : match.supported).join(match.state === "verified" ? " × " : " · ") }}</span>
              <span v-if="drug.molecularFormat">{{ drug.molecularFormat }}</span>
              <strong v-if="activeSingleDrugPhase(studies)">{{ stageLabel(activeSingleDrugPhase(studies)) }}</strong>
              <strong v-else-if="profile.highestTrialPhase">{{ stageLabel(profile.highestTrialPhase) }} · {{ t("历史最高", "Historical maximum") }}</strong>
              <span v-else-if="drug.clinicalStage === 'PRECLINICAL' && !studies.length">{{ t("来源报告临床前阶段", "Reported preclinical") }}</span>
              <span v-else>{{ t("临床阶段待核实", "Clinical phase unverified") }}</span>
              <span class="scope">{{ match.state === "verified" ? t("完整匹配", "Complete match") :
                confirmedScope(match) ? t("扩展匹配", "Extended match") : t("靶点范围待核实", "Target scope unverified") }}</span>
            </p>
          </header>

          <section v-if="drug.mechanisms?.[0]" class="drug-field">
            <h5>{{ t("作用机制（MoA）", "Mechanism of action (MoA)") }}</h5>
            <p>
              {{ drug.mechanisms[0] }}
              <a
                v-if="currentCatalog.sources.find(({ id }) => id === drug.sourceId)?.url"
                :href="currentCatalog.sources.find(({ id }) => id === drug.sourceId).url"
                target="_blank" rel="noopener noreferrer"
              >{{ t("来源", "Source") }} ↗</a>
            </p>
          </section>

          <section class="drug-field">
            <h5>{{ t("临床研发概况", "Clinical development overview") }}</h5>
            <dl class="drug-fields">
              <div v-if="publicSources(drug, aliases)?.developer">
                <dt>{{ t("研发公司", "Developer") }}</dt><dd>{{ publicSources(drug, aliases).developer }}</dd>
              </div>
              <div v-if="activeSingleDrugPhase(studies)">
                <dt>{{ t("活跃单药最高阶段", "Highest active monotherapy phase") }}</dt><dd>{{ stageLabel(activeSingleDrugPhase(studies)) }}</dd>
              </div>
              <div v-if="profile.highestTrialPhase">
                <dt>{{ t("所查单药最高阶段", "Highest retrieved monotherapy phase") }}</dt><dd>{{ stageLabel(profile.highestTrialPhase) }}</dd>
              </div>
              <div v-if="studies.length">
                <dt>{{ t("首列试验状态", "Lead study status") }}</dt><dd>{{ statusLabel(studies[0].status) }}</dd>
              </div>
              <div v-if="profile.sponsors?.length">
                <dt>{{ t("主要试验申办方", "Lead trial sponsors") }}</dt><dd>{{ profile.sponsors.join(" · ") }}</dd>
              </div>
              <div v-if="profile.researchIndications?.length">
                <dt>{{ t("单药研究适应症", "Monotherapy study indications") }}</dt><dd>{{ profile.researchIndications.join(" · ") }}</dd>
              </div>
            </dl>
          </section>
          <p v-if="Object.keys(profile.issues || {}).length" class="scope">{{ t("暂未取得资料", "Sources unavailable") }} · {{ Object.keys(profile.issues).join(", ") }}</p>
          <p v-if="profile.truncated" class="scope">{{ t("还有未读取的临床登记页。", "Additional registry pages were not retrieved.") }}</p>
          <ul v-if="studies.length" class="trial-list">
            <li v-for="study in studies.slice(0, visibleTrials[drug.id] || 3)" :key="study.id" class="trial">
              <p class="trial-title">
                <a :href="study.url" target="_blank" rel="noopener noreferrer">{{ study.id }} ↗</a>
                <span v-if="study.title"> · {{ study.title }}</span>
              </p>
              <p class="scope">
                {{ [study.phase && stageLabel(study.phase), statusLabel(study.status),
                    study.updatedAt].filter(Boolean).join(" · ") }}
              </p>
              <details class="trial-detail">
                <summary>
                  <span class="when-closed">{{ t("展开试验详情", "Show trial details") }}</span>
                  <span class="when-open">{{ t("收起试验详情", "Hide trial details") }}</span>
                </summary>
                <p v-if="study.combined" class="scope">{{ t("联合治疗 · 分期适用于该试验", "Combination therapy · Phase applies to this study") }}</p>
                <p class="scope">{{ [study.sponsor, study.collaborators?.join(', '), study.conditions.join(', ')].filter(Boolean).join(' · ') }}</p>
                <p v-if="study.startedAt || study.completedAt" class="scope">{{ t("开始 / 结束", "Start / completion") }} · {{ study.startedAt || '—' }} / {{ study.completedAt || '—' }}</p>
                <p v-if="study.summary">{{ study.summary }}</p>
              </details>
            </li>
          </ul>
          <button
            v-if="studies.length > 3" type="button" class="more-trials"
            :aria-expanded="Boolean(visibleTrials[drug.id])" @click="visibleTrials[drug.id] = visibleTrials[drug.id] ? 0 : studies.length"
          >
            {{ visibleTrials[drug.id] ? t("收起更多试验", "Show fewer trials") : t("显示更多试验", "Show more trials") }}
          </button>
          <details class="research-sources" @toggle="$event.currentTarget.open && research(drug, aliases)">
            <summary>{{ t("临床研究与公开资料", "Clinical studies and public sources") }}</summary>

            <p v-if="directTargets.length" class="scope">{{ t("记录中的直接靶点", "Recorded direct targets") }} · {{ directTargets.join(" · ") }}</p>
            <div class="source-links">
              <a
                v-for="source in currentCatalog.sources.filter(({ id, url }) => url && [drug.sourceId, ...(drug.sourceIds || [])].includes(id))"
                :key="source.id" :href="source.url" target="_blank" rel="noopener noreferrer"
              >{{ source.title }} ↗</a>
            </div>
            <a v-if="profile.url" :href="profile.url" target="_blank" rel="noopener noreferrer">ClinicalTrials.gov ↗</a>
            <p v-if="profile.retrievedAt" class="scope">{{ t("检索日期", "Retrieved") }} · {{ profile.retrievedAt.slice(0, 10) }}</p>
            <section v-if="publicSources(drug, aliases)">
              <h5>{{ t("公司官方资料", "Official company resources") }}</h5>
              <ul>
                <li v-for="item in publicSources(drug, aliases).official" :key="item.url">
                  <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.title }} ↗</a> · {{ item.date }}
                </li>
              </ul>
              <h5>{{ t("学术会议资料", "Conference materials") }}</h5>
              <ul>
                <li v-for="item in publicSources(drug, aliases).conferences" :key="item.url">
                  <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.title }} ↗</a> · {{ item.meeting }} · {{ item.number }}
                </li>
              </ul>
            </section>
            <p v-if="resources[drug.id]?.loading" role="status">{{ t("正在查询药物论文…", "Looking up drug publications…") }}</p>
            <button v-if="resources[drug.id]?.failed" type="button" @click="research(drug, aliases)">{{ t("重试论文查询", "Retry publication lookup") }}</button>
            <p v-if="Object.keys(resources[drug.id]?.issues || {}).length">{{ t("部分文献来源不可用", "Some literature sources are unavailable") }} · {{ Object.keys(resources[drug.id].issues).join(", ") }}</p>
            <section v-if="resources[drug.id]?.papers?.length">
              <h5>{{ t("研究论文 · 标题匹配药物名称", "Research papers · Drug name matched in title") }}</h5>
              <ul>
                <li v-for="paper in resources[drug.id].papers" :key="paper.url">
                  <a :href="paper.url" target="_blank" rel="noopener noreferrer">{{ paper.title }} ↗</a>
                  <p>{{ [paper.journal, paper.year, paper.sources.join(" / ")].filter(Boolean).join(" · ") }}</p>
                </li>
              </ul>
            </section>
            <section v-if="resources[drug.id]?.papers?.some(({ methods }) => methods.length)">
              <h5>{{ t("公开活性方法 · 标题明确提及", "Public assay methods · Explicitly named in title") }}</h5>
              <ul>
                <li v-for="paper in resources[drug.id].papers.filter(({ methods }) => methods.length)" :key="paper.url">
                  <a :href="paper.url" target="_blank" rel="noopener noreferrer">{{ paper.methods.join(" · ") }} ↗</a>
                </li>
              </ul>
            </section>
          </details>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped>
h2, h3, h4, h5, p { margin: 0; overflow-wrap: anywhere; }
h2 { font-size: var(--ta-section-size); font-weight: 600; line-height: var(--ta-heading-line); }
h3, h5 { font-size: var(--ta-subheading-size); line-height: var(--ta-heading-line); font-weight: 600; }
h4 { font-size: var(--ta-card-title-size); line-height: var(--ta-heading-line); font-weight: 600; }
.workspace { font-size: var(--ta-body-size); line-height: var(--ta-body-line); }
.workspace a, .more-trials { color: var(--app-accent); overflow-wrap: anywhere; }
.trial-list { display: grid; gap: var(--ta-field-gap); list-style: none; padding: 0; margin: 0; }
.trial { margin: 0; padding-block: 4px; }
.drug-heading, .drug-field { display: grid; gap: 4px; }
.drug-field { margin-block-start: var(--ta-field-gap); }
.drug-meta, .source-links { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
.drug-meta > * + *::before {
  content: "·";
  margin-inline-end: 8px;
  color: var(--app-muted);
}
.drug-meta strong { color: var(--app-text); }
.drug-fields { display: grid; gap: 4px; margin: 0; }
.drug-fields > div { display: grid; grid-template-columns: minmax(8rem, 11rem) minmax(0, 1fr); gap: 4px 16px; }
.drug-fields dt { color: var(--app-muted); font-size: var(--ta-label-size); }
.drug-fields dd { margin: 0; overflow-wrap: anywhere; }
.trial-title { overflow-wrap: anywhere; }
.trial-detail { margin-block-start: 2px; }
.trial-detail summary, .research-sources summary { color: var(--app-accent); font-size: var(--ta-meta-size); }
.trial-detail > p, .research-sources > :not(summary) { margin-block-start: var(--ta-field-gap); }
.trial-detail .when-open, .trial-detail[open] .when-closed { display: none; }
.trial-detail[open] .when-open { display: inline; }
.source-links:empty { display: none; }
button { font: inherit; }
.scope { color: var(--app-muted); font-size: var(--ta-meta-size); }
.workspace { display: grid; grid-template-columns: minmax(110px, 22%) minmax(0, 1fr); gap: var(--ta-group-gap); }
nav, .results, article { display: grid; gap: var(--ta-row-gap); align-content: start; min-width: 0; }
button { justify-self: start; min-height: 40px; padding: 6px 10px; border: 1px solid var(--app-rule); border-radius: 8px; color: var(--app-text); background: var(--app-surface); }
button[aria-pressed="true"] { background: var(--app-accent-soft); }
article { border-bottom: 1px solid var(--app-rule-subtle); padding-block: var(--ta-row-gap); gap: var(--ta-field-gap); }
summary { cursor: pointer; }
li { margin-block: 6px; overflow-wrap: anywhere; }
@media (max-width: 767px) {
  .workspace { grid-template-columns: minmax(0, 1fr); }
  nav { display: flex; flex-wrap: wrap; }
  .drug-fields > div { grid-template-columns: minmax(0, 1fr); gap: 0; }
}
</style>
