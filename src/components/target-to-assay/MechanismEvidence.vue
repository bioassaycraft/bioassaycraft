<script setup>
import { computed } from "vue";
import BilingualMechanism from "./BilingualMechanism.vue";
import {
  bilingualMechanism,
  reviewedMechanism,
} from "../../lib/target-to-assay/bilingual-mechanism.js";
import { drugDisplayName, ingredientKey } from "../../lib/target-to-assay/display.js";
import { targetAssayCopy } from "../../i18n/target-to-assay.js";

const props = defineProps({
  result: { type: Object, default: null },
  locale: { type: String, required: true },
});
const copy = computed(() => targetAssayCopy[props.locale].mechanism);
// These verified Reactome records are promoted only when the live mapping returns them.
const preferredPathways = {
  PCSK9: ["R-HSA-8964038", "R-HSA-8866427"],
  MS4A1: ["R-HSA-983695"],
  CD19: ["R-HSA-983695"],
};
const targets = computed(() =>
  (props.result?.resolvedTargets || []).map((target) => {
    const biology = props.result.targetBiology.find(({ targetId }) => targetId === target.id);
    const preferred = Object.hasOwn(preferredPathways, target.id)
      ? preferredPathways[target.id]
      : [];
    const paths = biology?.pathways || [];
    const pathways = [...paths].sort((a, b) => {
      const priority = (id) => (preferred.includes(id) ? preferred.indexOf(id) : preferred.length);
      return priority(a.id) - priority(b.id);
    });
    return { ...target, biology, pathways };
  }),
);
const matching = computed(() =>
  (props.result?.drugMechanisms || []).filter(
    ({ targetIds }) =>
      targetIds.length === targets.value.length &&
      targets.value.every(({ id }) => targetIds.includes(id)),
  ),
);
const direct = computed(() =>
  matching.value.filter(
    (row) =>
      row.evidenceStatus !== "conflicting_evidence" &&
      (row.completeTargetSet ||
        (targets.value.length === 1 && row.evidenceStatus === "direct_evidence")),
  ),
);
const hasConflict = computed(() =>
  matching.value.some(({ evidenceStatus }) => evidenceStatus === "conflicting_evidence"),
);
const sharedCd3Cd20 = computed(
  () =>
    targets.value.length === 2 &&
    targets.value.some(({ id }) => id === "CD3") &&
    targets.value.some(({ id }) => id === "MS4A1") &&
    direct.value.some(({ sources }) =>
      sources.some(({ recordId }) =>
        ["761263s010", "761309s006", "761324s003", "EMEA/H/C/006215"].includes(recordId),
      ),
    ),
);
const examples = computed(() => {
  if (hasConflict.value || sharedCd3Cd20.value) return [];
  const singleTarget = targets.value.length === 1;
  const isPcsk9 = singleTarget && targets.value[0].id === "PCSK9";
  const eligible = matching.value.filter(
    (row) => direct.value.includes(row) || (singleTarget && reviewedMechanism(row.drugName)),
  );
  const order = ["evolocumab", "tafolecimab", "inclisiran"];
  const sorted = [...eligible].sort((a, b) => {
    const priority = (row) => {
      const index = order.indexOf(ingredientKey(row.drugName));
      return index < 0 ? order.length : index;
    };
    return (
      priority(a) - priority(b) ||
      Number(b.developmentStatus?.globalDevelopmentPhase === "APPROVAL") -
        Number(a.developmentStatus?.globalDevelopmentPhase === "APPROVAL") ||
      a.drugName.localeCompare(b.drugName, "en") ||
      a.mechanismDescription.localeCompare(b.mechanismDescription)
    );
  });
  const supported = new Map();
  for (const row of sorted) {
    const reviewedCategory = reviewedMechanism(row.drugName)?.category;
    if (isPcsk9 && !reviewedCategory) continue;
    const category = reviewedCategory || [row.actionType, row.molecularFormat].filter(Boolean).join("|") || row.drugId;
    if (!supported.has(category)) supported.set(category, row);
  }
  return [...supported.values()].slice(0, singleTarget ? 2 : 1);
});
const mechanismEntries = computed(() =>
  examples.value.map((row) => ({
    name: drugDisplayName(row.drugName),
    ...bilingualMechanism(
      row.drugName,
      row.mechanismDescription,
      row.sources[0],
      ingredientKey(row.drugName) === "blinatumomab"
        ? targetAssayCopy.zh.drugCard.blinatumomab
        : undefined,
    ),
  })),
);
const combinationMechanism = computed(() => ({
  mechanismOriginal: targetAssayCopy.en.mechanism.cd3Cd20,
  mechanismZh: targetAssayCopy.zh.mechanism.cd3Cd20,
  translationStatus: "reviewed",
}));
const conclusion = computed(() => {
  if (hasConflict.value) return copy.value.status.conflicting_evidence;
  return targets.value.length > 1 ? copy.value.unconfirmed : copy.value.noDrugMechanism;
});
const sentences = new Intl.Segmenter("en", { granularity: "sentence" });
function functionSummary(target) {
  const item = target.biology?.biologicalFunctions[0];
  if (!item) return "";
  const reviewed = copy.value.functions[item.source?.recordId];
  if (reviewed) return reviewed;
  const cleaned = item.text.replace(/\s*\(PubMed:[\d,\sA-Za-z:]+\)/g, "");
  const parts = [...sentences.segment(cleaned)].map(({ segment }) => segment.trim());
  const first = parts[0] || cleaned;
  return first.length <= 245 ? first : first.slice(0, 242).replace(/\s+\S*$/, "") + "…";
}
function expressionText(profile, limit = profile.values.length) {
  return profile.values.slice(0, limit)
    .map(({ name, value }) => [name, value, profile.unit].filter((item) => item !== "").join(" "))
    .join(" · ");
}
const evidenceGroups = computed(() => {
  const biology = targets.value.flatMap((target) => {
    const source = target.biology?.biologicalFunctions[0]?.source;
    return [
      ...(target.identitySource
        ? [{ source: target.identitySource, supports: target.canonicalName }]
        : []),
      ...(source ? [{ source, supports: target.id + " · " + functionSummary(target) }] : []),
    ];
  });
  const expression = targets.value.flatMap((target) => [
    ...(target.biology?.expressionProfiles || []).map((profile) => ({
      source: profile.source,
      supports:
        target.id + " · " + copy.value.modalities[profile.kind] + " · " + expressionText(profile),
    })),
    ...(target.biology?.diseaseExpression || []).map(({ source, description }) => ({
      source,
      supports: target.id + " · " + description[props.locale],
    })),
    ...(target.biology?.diseaseAssociations || []).map(({ name, source }) => ({
      source,
      supports: target.id + " · " + copy.value.association + " · " + name,
    })),
  ]);
  const pathways = [
    ...new Map(
      targets.value.flatMap((target) =>
        target.pathways.map((path) => [path.id, { source: path.source, supports: path.name }]),
      ),
    ).values(),
  ];
  const pathwayLinks = new Map(pathways.map((row) => [row.source.originalUrl, row]));
  const distinctBiology = biology.filter((row) => {
    const pathway = pathwayLinks.get(row.source.originalUrl);
    if (!pathway) return true;
    pathway.supports += " · " + row.supports;
    return false;
  });
  const mechanismRows = hasConflict.value
    ? matching.value.filter((row) => row.evidenceStatus === "conflicting_evidence")
    : sharedCd3Cd20.value
      ? direct.value
      : examples.value;
  const mechanisms = mechanismRows.flatMap((row) =>
    [
      ...new Map(
        [reviewedMechanism(row.drugName)?.mechanismSource, ...row.sources]
          .filter(Boolean)
          .map((source) => [source.originalUrl, source]),
      ).values(),
    ].map((source) => ({
      source,
      supports: drugDisplayName(row.drugName) + " · " + row.mechanismDescription,
    })),
  );
  return [
    { name: copy.value.function, rows: distinctBiology },
    { name: copy.value.expression, rows: expression },
    { name: copy.value.pathways, rows: pathways },
    { name: copy.value.drugMechanism, rows: mechanisms },
  ].filter(({ rows }) => rows.length);
});
const checks = computed(() => props.result?.sourceChecks || {});
const queryTime = computed(() =>
  new Intl.DateTimeFormat(props.locale === "zh" ? "zh-CN" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(props.result.retrievedAt)),
);
</script>

<template>
  <div class="ta-live-mechanism">
    <p v-if="!result">{{ copy.sample }}</p>
    <template v-else>
      <section class="ta-mechanism-group">
        <h4>{{ copy.function }}</h4>
        <div class="ta-target-grid">
          <div v-for="target in targets" :key="target.id" class="ta-target-info">
            <p>
              <strong>{{ target.id }}</strong> ·
              {{
                target.id === "CD3"
                  ? copy.types.CD3
                  : copy.types[target.uniprotIds[0]] || copy.entity[target.entityType]
              }}
            </p>
            <p
              v-if="
                target.id !== 'CD3' &&
                  !copy.types[target.uniprotIds[0]] &&
                  target.resolutionStatus === 'resolved'
              "
              class="ta-source-note"
              lang="en"
            >
              {{ target.canonicalName }}
            </p>
            <p v-if="target.subunits?.length && target.id !== 'CD3'" class="ta-source-note">
              {{ target.subunits.join(" + ") }}
            </p>
            <p>
              {{
                target.resolutionStatus === "resolved"
                  ? functionSummary(target) || copy.noData
                  : copy.resolution[target.resolutionStatus]
              }}
            </p>
          </div>
        </div>
      </section>

      <section class="ta-mechanism-group">
        <h4>{{ copy.expression }}</h4>
        <div class="ta-target-grid">
          <div v-for="target in targets" :key="target.id" class="ta-target-info">
            <strong v-if="targets.length > 1">{{ target.id }}</strong>
            <p
              v-for="profile in (target.biology?.expressionProfiles || []).slice(0, 2)"
              :key="profile.kind"
            >
              <a :href="profile.source.originalUrl" target="_blank" rel="noopener noreferrer">{{
                copy.modalities[profile.kind]
              }}</a>
              · {{ expressionText(profile, 1) }}
            </p>
            <p v-if="!target.biology?.expressionProfiles?.length" class="ta-source-note">
              {{
                target.entityType === "protein_complex" ? copy.complexExpression : copy.noExpression
              }}
            </p>
            <p
              v-for="record in target.biology?.diseaseExpression || []"
              :key="record.source.recordId"
            >
              {{ record.description[locale] }}
              <a :href="record.source.originalUrl" target="_blank" rel="noopener noreferrer">{{ record.source.sourceName }} ↗</a>
            </p>
            <template v-if="target.biology?.diseaseAssociations?.length">
              <p>
                {{ copy.association }} ·
                {{
                  target.biology.diseaseAssociations
                    .slice(0, 2)
                    .map(({ name }) => name)
                    .join(" · ")
                }}
              </p>
              <p class="ta-source-note">{{ copy.associationNote }}</p>
            </template>
          </div>
        </div>
      </section>

      <section class="ta-mechanism-group">
        <h4>{{ copy.pathways }}</h4>
        <div class="ta-target-grid">
          <div v-for="target in targets" :key="target.id">
            <strong v-if="targets.length > 1">{{ target.id }}</strong>
            <ul v-if="target.pathways.length">
              <li v-for="path in target.pathways.slice(0, 2)" :key="path.id">
                <a :href="path.source.originalUrl" target="_blank" rel="noopener noreferrer">{{ copy.pathwayNames[path.id] || path.name }} ↗</a>
              </li>
            </ul>
            <p v-else>
              {{
                target.biology?.pathwayStatus === "failed" ? copy.pathwayFailed : copy.noPathways
              }}
            </p>
            <details v-if="target.pathways.length > 2">
              <summary>{{ copy.morePathways }}</summary>
              <ul>
                <li v-for="path in target.pathways.slice(2)" :key="path.id">
                  <a :href="path.source.originalUrl" target="_blank" rel="noopener noreferrer">{{ path.name }} · {{ path.id }} ↗</a>
                </li>
              </ul>
            </details>
          </div>
        </div>
      </section>

      <section class="ta-mechanism-group">
        <h4>{{ copy.drugMechanism }}</h4>
        <BilingualMechanism
          v-if="sharedCd3Cd20 && !hasConflict"
          :entry="combinationMechanism"
        />
        <BilingualMechanism
          v-for="entry in mechanismEntries"
          :key="entry.name"
          :entry="entry"
          :name="entry.name"
        />
        <p v-if="!mechanismEntries.length && (!sharedCd3Cd20 || hasConflict)">{{ conclusion }}</p>
        <a href="#results-title">{{ copy.viewDrugs }} ↓</a>
      </section>

      <details class="ta-source-details">
        <summary>
          {{ copy.sourceStatus }}
        </summary>
        <section v-for="group in evidenceGroups" :key="group.name">
          <h5>{{ group.name }}</h5>
          <ul>
            <li v-for="{ source, supports } in group.rows" :key="source.originalUrl + supports">
              {{ supports }} ·
              <a :href="source.originalUrl" target="_blank" rel="noopener noreferrer">{{ source.sourceName }} · {{ source.recordId }} ↗</a>
              <small v-if="source.citationUrl">
                ·
                <a :href="source.citationUrl" target="_blank" rel="noopener noreferrer">{{
                  copy.citation
                }}</a></small>
              <small v-if="source.license">
                ·
                <a :href="source.license.url" target="_blank" rel="noopener noreferrer">{{
                  source.license.name
                }}</a></small>
            </li>
          </ul>
        </section>
        <details class="ta-source-note">
          <summary>{{ copy.diagnostics }}</summary>
          <p>
            {{ copy.retrieval }} · <time :datetime="result.retrievedAt">{{ queryTime }}</time>
          </p>
          <ul>
            <li v-for="(rows, name) in checks" :key="name">
              <strong>{{ name }}</strong> ·
              {{
                rows.length
                  ? [
                    ...new Set(
                      rows.map(
                        ({ state, status, count, returned, truncated }) =>
                          (copy.source[state] || state) +
                          (status ? " · HTTP " + status : "") +
                          (Number.isInteger(count) ? ` · ${returned}/${count}` : "") +
                          (truncated ? " · " + copy.truncated : ""),
                      ),
                    ),
                  ].join(" / ")
                  : copy.source.not_queried
              }}
              <a
                v-if="name === 'ChEMBL' && rows.some(({ state }) => !state.startsWith('success_'))"
                href="https://www.ebi.ac.uk/chembldb/"
                target="_blank"
                rel="noopener noreferrer"
              >{{ copy.officialSearch }} ↗</a>
            </li>
          </ul>
        </details>
      </details>
    </template>
  </div>
</template>

<style scoped>
.ta-live-mechanism {
  display: grid;
  gap: var(--ta-group-gap);
  margin-top: var(--ta-group-gap);
  min-width: 0;
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
  overflow-wrap: anywhere;
}
.ta-mechanism-group {
  display: grid;
  gap: var(--ta-field-gap);
  min-width: 0;
}
.ta-mechanism-group + .ta-mechanism-group {
  padding-top: var(--ta-group-gap);
  border-top: 1px solid var(--app-rule-subtle);
}
.ta-target-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: var(--ta-field-gap) 24px;
}
.ta-target-grid > div:only-child {
  grid-column: 1 / -1;
}
.ta-target-info {
  display: grid;
  gap: var(--ta-language-gap);
}
.ta-live-mechanism h4,
.ta-live-mechanism h5 {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: var(--ta-heading-line);
}
.ta-live-mechanism p {
  margin: 0;
}
.ta-live-mechanism ul {
  margin: 0;
  padding-inline-start: 18px;
}
.ta-mechanism-group ul + details,
.ta-source-details h5 + ul {
  margin-top: var(--ta-language-gap);
}
.ta-source-details li + li {
  margin-top: var(--ta-language-gap);
}
.ta-source-note,
.ta-source-details small {
  color: var(--app-muted);
}
.ta-source-details section + section,
.ta-source-details section + details {
  margin-top: var(--ta-group-gap);
}
@media (max-width: 660px) {
  .ta-target-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
