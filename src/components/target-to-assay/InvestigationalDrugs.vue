<script setup>
import { summarizeDeveloper } from "../../lib/target-to-assay/developer-evidence.js";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { activeSingleDrugPhase, investigationalGroups, rankClinicalStudies, rankInvestigational, supplementInvestigationalMatch } from "../../lib/target-to-assay/investigational.js";
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
  targetNames: { type: Function, required: true },
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
const discovering = ref(false);
const candidateLimit = 18;
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
  return [{ ...supplementInvestigationalMatch(item, profile.supplement?.evidence.targets, active.value.targetIds), profile, studies: rankClinicalStudies(profile.studies), sources: cardSources(item.drug, profile), developer: summarizeDeveloper(profile.developerEvidence) }];
}).sort(rankInvestigational));
const failedProfiles = computed(() => Object.values(profiles.value).some(({ issues, supplement, truncated, developerSearchTruncated }) =>
  truncated || developerSearchTruncated || Object.keys(issues || {}).length || Object.keys(supplement?.issues || {}).length));
const confirmedScope = (match) => match.state === "verified" ||
  (active.value.targetIds.length === 1 && match.reason === "additional_direct_targets");
const verified = computed(() => rows.value.filter(({ profile, approvalSignal, studies, match }) =>
  profile.approval === "checked" && !approvalSignal && confirmedScope(match) && studies.length > 0));
const preclinical = computed(() => rows.value.filter(({ drug, profile, approvalSignal, studies, match }) =>
  confirmedScope(match) && drug.clinicalStage === "PRECLINICAL" && profile.approval === "checked" && !approvalSignal && !studies.length));
const pending = computed(() => rows.value.filter((row) =>
  !verified.value.includes(row) && !preclinical.value.includes(row)));
const discoveryFailed = computed(() => {
  const checks = ["Open Targets", "ChEMBL"].flatMap((source) => currentDiscovery.value?.sourceChecks?.[source] || [])
    .filter(({ state }) => state !== "not_queried");
  return checks.length > 0 && checks.every(({ state }) => !["success_empty", "success_with_data"].includes(state));
});
const sections = computed(() => [
  { label: t("有临床登记 · 核验范围内未发现上市许可", "Clinical records · No approval found in sources checked"), rows: verified.value },
  { label: t("来源报告临床前研究", "Reported preclinical research"), rows: preclinical.value },
  { label: t("其他候选药物", "Other candidates"), rows: pending.value.filter(({ match }) => confirmedScope(match)) },
  { label: t("补充候选与部分匹配", "Additional candidates and partial matches"), rows: pending.value.filter(({ match }) => !confirmedScope(match)) },
]);

function publicSources(drug, aliases) {
  const names = new Set([drug.name, ...aliases].map(ingredientKey));
  return investigationalSources.find((row) => row.chemblId
    ? [drug.id, drug.externalIds?.chembl].includes(row.chemblId)
    : row.names.some((name) => names.has(ingredientKey(name))));
}
function cardSources(drug, profile) {
  const ids = [drug.sourceId, ...(drug.sourceIds || [])];
  const sources = currentCatalog.value.sources
    .filter(({ id, url }) => url && ids.includes(id))
    .map(({ title, url }) => ({ title, url }));
  const supplemental = Object.values(profile.supplement?.evidence || {}).flat();
  for (const entry of [...supplemental, ...(profile.developerEvidence || [])])
    sources.push({ title: entry.source, url: entry.url });
  if (profile.url) sources.push({ title: "ClinicalTrials.gov", url: profile.url });
  return [...new Map(sources.map((source) => [source.url, source])).values()];
}
function displayedTargets(directTargets) {
  return directTargets.map((target) => ({ IL3RA: "CD123", MS4A1: "CD20" })[target] || target);
}
function mechanisms(drug, profile) {
  return [...new Set([...(drug.mechanisms || []),
    ...(profile.supplement?.evidence.mechanisms || []).map(({ value }) => value)].filter((value) => value?.trim()))];
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
  const batch = active.value.candidates.slice(0, candidateLimit);
  if (!batch.length) return;
  request = new AbortController();
  const current = request;
  busy.value = true;
  for (let offset = 0; offset < batch.length; offset += 3) {
    const results = await Promise.all(batch.slice(offset, offset + 3).map(async ({ drug, aliases, directTargets }) => {
      try {
        return [drug.id, await loadSupplement("investigational-profile", {
          ...requestBody(drug, aliases),
          supplement: !directTargets.length || directTargets.some((id) => /^CD3(?:[DEG])?$/.test(id)) || !drug.mechanisms?.length,
          developerLookup: true,
        }, AbortSignal.any([current.signal, AbortSignal.timeout(14000)]))];
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
      "本区汇总公开药物及临床研究数据库的检索结果，可能包含部分靶点匹配的候选药物。",
      "This section summarizes search results from public drug and clinical research databases and may include candidates that match only some targets."
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
  <div v-else-if="active" class="ta-workspace investigational-workspace">
    <nav class="ta-combinations" :aria-label="t('在研药物靶点组合', 'Investigational target combinations')">
      <p>{{ t("靶点组合", "Target combinations") }}</p>
      <button
        v-for="group in groups" :key="group.key" type="button" :aria-pressed="active.key === group.key"
        @click="selection = group.key"
      >
        <span>{{ targetNames(group.targetIds) }}</span>
        <span class="ta-count">{{ group.candidates.length }}</span>
      </button>
    </nav>
    <div ref="panel" class="results ta-drugs">
      <p v-if="discoveryFailed && !active.candidates.length" role="alert">{{ t("药物来源检索失败，请重试。", "Drug source searches failed. Please retry.") }}</p>
      <p v-else-if="!active.candidates.length">
        {{ partialSources.length
          ? t("当前已返回的资料不足以确认候选。", "Retrieved sources do not establish any candidates.")
          : t("当前靶点范围暂无候选。", "No candidates for this target scope.") }}
      </p>
      <p v-else-if="busy" role="status">{{ t("正在加载候选药物资料…", "Loading candidate information…") }}</p>
      <p v-else-if="checked && !rows.length">{{ t("当前无可展示的候选药物。", "No candidate records to show.") }}</p>
      <p v-if="partialSources.length || failedProfiles || active.candidates.length > candidateLimit" class="scope">
        {{ t("当前结果仅覆盖已返回的资料。", "Results cover the records retrieved so far.") }}
      </p>
      <section v-for="section in sections.filter(({ rows }) => rows.length)" :key="section.label" class="drug-section">
        <h3>{{ section.label }}</h3>
        <article v-for="{ drug, match, profile, studies, aliases, directTargets, sources, developer } in section.rows" :key="drug.id">
          <header class="drug-heading">
            <h4>{{ drugDisplayName(drug.name) }}</h4>
            <span v-if="activeSingleDrugPhase(studies)" class="ta-tag">{{ stageLabel(activeSingleDrugPhase(studies)) }}</span>
            <span v-else-if="profile.highestTrialPhase" class="ta-tag">{{ stageLabel(profile.highestTrialPhase) }} · {{ t("历史最高", "Historical maximum") }}</span>
            <span v-else-if="drug.clinicalStage === 'PRECLINICAL' && !studies.length" class="ta-tag">{{ t("来源报告临床前阶段", "Reported preclinical") }}</span>
          </header>

          <dl class="drug-identity">
            <div>
              <dt>{{ t("靶点", "Targets") }}</dt>
              <dd>{{ displayedTargets(directTargets).join(" × ") || "—" }}</dd>
            </div>
            <div>
              <dt>{{ t("研发企业", "Developer") }}</dt>
              <dd v-if="developer.record">
                <a :href="developer.record.url" target="_blank" rel="noopener noreferrer">{{ developer.record.value }} ↗</a>
                <span class="scope"> · {{ developer.record.role === "historical_developer" ? t("历史开发", "Historical developer") : t("文献所述", "As reported") }} · {{ developer.record.publishedYear }}</span>
              </dd>
              <dd v-else>{{ developer.conflict ? t("来源说法不一致", "Sources disagree") : "—" }}</dd>
            </div>
          </dl>

          <section v-if="mechanisms(drug, profile).length" class="drug-field">
            <h5>{{ t("作用机制（MoA）", "Mechanism of action (MoA)") }}</h5>
            <p v-for="mechanism in mechanisms(drug, profile)" :key="mechanism">{{ mechanism }}</p>
          </section>

          <details class="research-sources" @toggle="$event.currentTarget.open && research(drug, aliases)">
            <summary>
              <span class="scope">
                {{ t("来源：", "Sources: ") }}{{ [...new Set([...sources.map(({ title }) => title), ...(studies.length ? ["ClinicalTrials.gov"] : [])])].join(" · ") || "—" }}
              </span>
              <span class="source-action">{{ t("查看资料", "View sources") }} <span aria-hidden="true">⌄</span></span>
            </summary>

            <div v-if="sources.length" class="source-links">
              <a v-for="source in sources" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }} ↗</a>
            </div>
            <p v-if="aliases.length" class="scope">{{ aliases.slice(0, 3).join(" · ") }}</p>
            <details v-if="aliases.length > 3" class="scope">
              <summary>{{ t("更多别名", "More aliases") }}</summary>
              <p>{{ aliases.slice(3).join(" · ") }}</p>
            </details>
            <p class="scope">
              {{ match.state === "verified" ? t("完整匹配", "Complete match") :
                confirmedScope(match) ? t("扩展匹配", "Extended match") : t("靶点范围待核实", "Target scope unverified") }}
              <template v-if="drug.molecularFormat"> · {{ drug.molecularFormat }}</template>
              <template v-if="!activeSingleDrugPhase(studies) && !profile.highestTrialPhase && drug.clinicalStage !== 'PRECLINICAL'">
                · {{ t("临床阶段待核实", "Clinical phase unverified") }}
              </template>
            </p>
            <section class="drug-field">
              <h5>{{ t("临床研发概况", "Clinical development overview") }}</h5>
              <dl class="drug-fields">
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
            <p v-if="directTargets.length" class="scope">{{ t("记录中的直接靶点", "Recorded direct targets") }} · {{ directTargets.join(" · ") }}</p>
            <p v-if="profile.retrievedAt" class="scope">{{ t("检索日期", "Retrieved") }} · {{ profile.retrievedAt.slice(0, 10) }}</p>
            <section v-if="publicSources(drug, aliases)">
              <h5>{{ t("公司官方资料", "Official company resources") }}</h5>
              <ul>
                <li v-for="item in publicSources(drug, aliases).official" :key="item.url">
                  <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.title }} ↗</a><template v-if="item.date"> · {{ item.date }}</template>
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
.investigational-workspace { font-size: var(--ta-body-size); line-height: var(--ta-body-line); }
.investigational-workspace a, .more-trials { color: var(--app-accent); overflow-wrap: anywhere; }
.trial-list { display: grid; gap: var(--ta-field-gap); list-style: none; padding: 0; margin: 0; }
.trial { margin: 0; padding-block: 4px; }
.drug-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) fit-content(45%);
  align-items: start;
  gap: var(--ta-field-gap);
}
.drug-field { display: grid; gap: 4px; }
.drug-field h5 { font-size: var(--ta-label-size); }
.drug-identity {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
  gap: var(--ta-field-gap) var(--ta-group-gap);
  margin: 0;
}
.drug-identity > div { display: grid; align-content: start; gap: 4px; overflow-wrap: anywhere; }
.drug-identity dt { color: var(--app-muted); font-size: var(--ta-label-size); }
.drug-identity dd { margin: 0; }
.source-links { display: flex; flex-wrap: wrap; gap: 4px 12px; }
.drug-fields { display: grid; gap: 4px; margin: 0; }
.drug-fields > div { display: grid; grid-template-columns: minmax(8rem, 11rem) minmax(0, 1fr); gap: 4px 16px; }
.drug-fields dt { color: var(--app-muted); font-size: var(--ta-label-size); }
.drug-fields dd { margin: 0; overflow-wrap: anywhere; }
.trial-title { overflow-wrap: anywhere; }
.trial-detail { margin-block-start: 2px; }
.trial-detail summary, .research-sources > summary { color: var(--app-accent); font-size: var(--ta-meta-size); }
.trial-detail > p, .research-sources > :not(summary) { margin-block-start: var(--ta-field-gap); }
.trial-detail .when-open, .trial-detail[open] .when-closed { display: none; }
.trial-detail[open] .when-open { display: inline; }
.research-sources { min-width: 0; }
.research-sources > summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px var(--ta-field-gap);
}
.research-sources > summary::-webkit-details-marker { display: none; }
.source-action { margin-inline-start: auto; }
.research-sources > summary:hover .source-action { text-decoration: underline; }
.research-sources > summary:focus-visible, .investigational-workspace a:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 3px;
}
.scope { color: var(--app-muted); font-size: var(--ta-meta-size); }
.results, article { display: grid; gap: var(--ta-row-gap); align-content: start; min-width: 0; }
button:not(.ta-combinations button) { font: inherit; justify-self: start; min-height: 40px; padding: 6px 10px; border: 1px solid var(--app-rule); border-radius: 8px; color: var(--app-text); background: var(--app-surface); }
article {
  padding-block: calc(var(--ta-drug-spacing) / 2);
  gap: var(--ta-group-gap);
}
.drug-section article + article, .drug-section + .drug-section { border-block-start: 1px solid var(--app-rule-subtle); }
summary { cursor: pointer; }
li { margin-block: 6px; overflow-wrap: anywhere; }
@media (max-width: 767px) {
  .drug-fields > div { grid-template-columns: minmax(0, 1fr); gap: 0; }
}
</style>
