<script setup>
import * as d3 from "d3";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MobileAnovaSummary from "../components/anova/MobileAnovaSummary.vue";
import MobileSegmentedNavigation from "../components/anova/MobileSegmentedNavigation.vue";
import MobileStepController from "../components/anova/MobileStepController.vue";
import MobileTopControls from "../components/anova/MobileTopControls.vue";
import MobileVarianceDetailCard from "../components/anova/MobileVarianceDetailCard.vue";
import MobileVarianceTree from "../components/anova/MobileVarianceTree.vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import { anovaCopy } from "../i18n/anova-explorer";
import {
  createAnovaScenes,
  defaultAnovaParameters,
  moduleOrder,
  stepOrder,
} from "../lib/anova/explorer-data";
import { useLocale } from "../utils/locale";

const { locale: language, setLocale } = useLocale();
const activeModule = ref("single");
const activeStep = ref("mean");
const explorerRoot = ref(null);
const chartSvg = ref(null);
const chartWrap = ref(null);
const headerMorphTrigger = ref(null);
const moduleControl = ref(null);
const stepControl = ref(null);
const ssScaleMode = ref("teaching");
const hoveredSS = ref(null);
const selectedMobileNodeId = ref(null);
const mobileView = ref("fit");
const fullMobileAnovaOpen = ref(false);
const mobileInfoOpen = ref(false);
const mobileContentTop = ref(0);
const isHeaderMorphed = ref(false);
const parameters = ref({ ...defaultAnovaParameters });

let chartObserver = null;
let headerMorphObserver = null;
let mobileHeaderObserver = null;

const ssBarWidth = 760;

const copy = computed(() => anovaCopy[language.value]);
const scenes = computed(() => createAnovaScenes(parameters.value));
const moduleSteps = computed(() => stepOrder[activeModule.value]);
const scene = computed(() => scenes.value[activeModule.value][activeStep.value]);
const stepCopy = computed(() => copy.value.steps[activeModule.value][activeStep.value]);
const activeStepIndex = computed(() => moduleSteps.value.indexOf(activeStep.value));
const equationText = computed(() => {
  if (typeof scene.value.equation === "string") return scene.value.equation;
  return scene.value.equation[language.value] || scene.value.equation.en;
});
const formulaPanel = computed(() => {
  if (activeModule.value === "fourpl") {
    const diff = parameters.value.fourPlDifference;
    if (["total", "lof"].includes(activeStep.value)) {
      return {
        theory: equationText.value,
        rows: [],
      };
    }

    if (activeStep.value === "free") {
      return {
        theory: copy.value.fourPlUnconstrainedTheory,
        rows: [
          {
            label: "Standard",
            names: ["A", "B", "C", "D"],
            values: ["103.00", "1.25", "1.45", "7.00"],
            meanings: [],
          },
          {
            label: "Test",
            names: ["A", "B", "C", "D"],
            values: [
              formatNumber(101 - diff * 3.2),
              formatNumber(1.2 - diff * 0.08),
              formatNumber(1.65 + diff * 0.62),
              formatNumber(7.5 + diff * 1.1),
            ],
            meanings: [],
          },
        ],
      };
    }

    return {
      theory: copy.value.fourPlConstrainedTheory,
      rows: [
        {
          label: "Standard",
          names: ["A", "B", "C", "D"],
          values: ["102.00", "1.18", "1.68", "7.40"],
          meanings: [],
        },
        {
          label: "Test",
          names: ["A", "B", "C", "D"],
          values: ["100.80", "1.18", "1.68", "7.80"],
          meanings: [],
        },
      ],
    };
  }

  if (scene.value.formula) {
    return {
      theory: scene.value.formula.theory,
      rows: scene.value.formula.rows.map((row) => ({
        label: row.label || copy.value.formulaParameters,
        names: row.names,
        values: row.values,
        meanings: (row.meanings || []).map(
          (meaning) => copy.value.formulaMeanings[meaning] || meaning,
        ),
      })),
    };
  }

  if (activeStep.value === "treatment") {
    return {
      theory: equationText.value,
      rows: [],
    };
  }

  return {
    theory: equationText.value,
    rows: [],
  };
});
const ssModeNote = computed(() =>
  ssScaleMode.value === "teaching" ? copy.value.ssTeachingNote : copy.value.ssTrueNote,
);
const mobileShellStyle = computed(() =>
  mobileContentTop.value ? { "--mobile-content-top": `${mobileContentTop.value}px` } : {},
);

const updateMobileContentTop = () => {
  mobileContentTop.value = 0;
};

const setModule = (module) => {
  activeModule.value = module;
  activeStep.value = stepOrder[module][0];
};

const goToAdjacentStep = (direction) => {
  const nextIndex = activeStepIndex.value + direction;
  if (nextIndex < 0 || nextIndex >= moduleSteps.value.length) return;
  activeStep.value = moduleSteps.value[nextIndex];
};

const setLanguage = (lang) => {
  setLocale(lang);
};

const regenerateData = () => {
  parameters.value = {
    ...parameters.value,
    seed: parameters.value.seed + 1,
  };
};

const updateParameter = (key, value) => {
  parameters.value = {
    ...parameters.value,
    [key]: Number(value),
  };
};

const formatNumber = (value) =>
  new Intl.NumberFormat(language.value === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value);

const formatStatistic = (value) => {
  if (value === null || value === "") return "";
  const absValue = Math.abs(value);
  if (absValue >= 10000) return value.toExponential(2);
  if (absValue >= 100)
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  if (absValue >= 10)
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatFormulaValue = (value) => (typeof value === "number" ? formatNumber(value) : value);

const formulaHtml = (formula) =>
  formula
    .replace(/ŷ\^\(([^)]+)\)/g, "ŷ<sup>$1</sup>")
    .replace(
      /([abczxβγ])_([ST])²/g,
      (_, symbol, group) => `${symbol}<sub>${group.toLowerCase()}</sub><sup>2</sup>`,
    )
    .replace(
      /([abczxβγ])_([ST])/g,
      (_, symbol, group) => `${symbol}<sub>${group.toLowerCase()}</sub>`,
    )
    .replace(/\)\^([A-Za-z0-9]+)/g, ")<sup>$1</sup>")
    .replace(/([A-Za-z])\^([A-Za-z0-9]+)/g, "$1<sup>$2</sup>")
    .replace(/([A-Za-z])²/g, "$1<sup>2</sup>");

const componentLabel = (key, long = false) =>
  (long ? copy.value.longComponents[key] : copy.value.shortComponents[key]) || key;

const decisionLabel = (key) => copy.value.decisions[key] || key;

const componentColor = (key) =>
  ({
    total: "var(--bc-text-secondary)",
    treatment: "var(--bc-ss-treatment)",
    regression: "var(--bc-ss-regression)",
    preparation: "var(--bc-ss-preparation)",
    intersection: "var(--bc-ss-interaction)",
    nonlinearity: "var(--bc-ss-nonlinearity)",
    nonparallelism: "var(--bc-ss-interaction)",
    lackOfFit: "var(--bc-ss-nonlinearity)",
    pureError: "var(--bc-ss-error)",
    extra: "var(--bc-ss-extra)",
    unconstrainedResidual: "var(--bc-ss-residual)",
    constrainedResidual: "var(--bc-ss-residual)",
    specimen: "var(--bc-ss-preparation)",
    deviationParallel: "var(--bc-ss-interaction)",
    residualII: "var(--bc-ss-residual)",
    modelLof: "var(--bc-ss-nonlinearity)",
    standardLof: "var(--bc-ss-nonlinearity)",
    testLof: "var(--bc-ss-nonlinearity)",
    error: "var(--bc-ss-error)",
  })[key] || "var(--bc-text-secondary)";

const groupColor = (key) =>
  ({
    standard: "var(--bc-chart-line)",
    test: "var(--bc-ss-extra)",
    sample: "var(--bc-chart-point)",
  })[key] || "var(--bc-chart-point)";

const leafIdForRow = (rowKey, module) => {
  if (rowKey === "lackOfFit") {
    if (module === "pla") return "lof4";
    return module === "sra" ? "lof3" : "lof";
  }
  if (
    [
      "regression",
      "preparation",
      "intersection",
      "nonparallelism",
      "nonlinearity",
      "pureError",
      "extra",
    ].includes(rowKey)
  ) {
    return rowKey;
  }
  return null;
};

const collectLeafValues = (current) => {
  const leafValues = new Map();

  current.anovaRows.forEach((row) => {
    const leafId = leafIdForRow(row.key, current.module);
    if (leafId) leafValues.set(leafId, row.trueSS ?? row.ss);
  });

  current.ssLayers.forEach((layer) => {
    layer.components.forEach((component) => {
      if (component.parts.length === 1 && component.parts[0] === component.id) {
        leafValues.set(component.id, component.value);
      }
    });
  });

  return leafValues;
};

const toSSRows = (current) => {
  const leafValues = collectLeafValues(current);
  const rows = current.ssLayers.map((layer) => ({
    rowId: layer.id,
    equation: layer.equation,
    scaleGroup: layer.scaleGroup || "default",
    segments: layer.components.map((component) => ({
      id: component.id,
      key: component.key,
      label: componentLabel(component.key),
      longLabel: componentLabel(component.key, true),
      inlineLabel: copy.value.inlineComponents?.[component.key] || componentLabel(component.key),
      trueSS: component.value,
      parts: component.parts.map((part) => ({
        id: part,
        trueSS: leafValues.get(part) ?? component.value,
      })),
    })),
  }));

  if (current.module === "fourpl") return rows;

  return [
    {
      rowId: "total",
      equation: "SS_Total",
      segments: [
        {
          id: "total",
          key: "total",
          label: componentLabel("total"),
          longLabel: componentLabel("total", true),
          inlineLabel: copy.value.inlineComponents?.total || componentLabel("total"),
          trueSS: [...leafValues.values()].reduce((total, value) => total + value, 0),
          parts: [...leafValues.entries()].map(([id, trueSS]) => ({ id, trueSS })),
        },
      ],
    },
    ...rows,
  ];
};

const layoutSSRows = (ssRows, displayMode, totalWidth, minPixelWidth = 28) => {
  const rowsByGroup = new Map();
  ssRows.forEach((row) => {
    const scaleGroup = row.scaleGroup || "default";
    if (!rowsByGroup.has(scaleGroup)) rowsByGroup.set(scaleGroup, []);
    rowsByGroup.get(scaleGroup).push(row);
  });

  const groupLayouts = new Map();

  rowsByGroup.forEach((rows, scaleGroup) => {
    const leafOrder = [];
    const leafValues = new Map();

    rows.forEach((row) => {
      row.segments.forEach((segment) => {
        segment.parts.forEach((part) => {
          if (!leafValues.has(part.id)) {
            leafOrder.push(part.id);
          }
          leafValues.set(part.id, Math.max(0, part.trueSS));
        });
      });
    });

    const totalTrueSS = [...leafValues.values()].reduce((total, value) => total + value, 0) || 1;
    const trueWidthFor = (value) => (value / totalTrueSS) * totalWidth;
    let leafWidths = new Map(
      leafOrder.map((id) => {
        const trueSS = leafValues.get(id) || 0;
        return [id, displayMode === "true" ? trueWidthFor(trueSS) : 0];
      }),
    );

    if (displayMode === "teaching") {
      const smallIds = leafOrder.filter((id) => {
        const trueSS = leafValues.get(id) || 0;
        return trueSS > 0 && trueWidthFor(trueSS) < minPixelWidth;
      });
      const largeIds = leafOrder.filter((id) => !smallIds.includes(id));
      const reservedWidth = Math.min(smallIds.length * minPixelWidth, totalWidth);
      const remainingWidth = Math.max(0, totalWidth - reservedWidth);
      const largeTotal = largeIds.reduce((total, id) => total + (leafValues.get(id) || 0), 0);

      leafWidths = new Map(
        leafOrder.map((id) => {
          const trueSS = leafValues.get(id) || 0;
          if (trueSS <= 0) return [id, 0];
          if (smallIds.includes(id)) return [id, reservedWidth / Math.max(1, smallIds.length)];
          if (largeTotal <= 0) return [id, remainingWidth / Math.max(1, largeIds.length)];
          return [id, (trueSS / largeTotal) * remainingWidth];
        }),
      );
    }

    const leafPositions = new Map();
    let cursor = 0;
    leafOrder.forEach((id) => {
      const width = leafWidths.get(id) || 0;
      leafPositions.set(id, { x: cursor, width });
      cursor += width;
    });

    groupLayouts.set(scaleGroup, leafPositions);
  });

  return ssRows.map((row) => ({
    ...row,
    segments: row.segments.map((segment) => {
      const leafPositions = groupLayouts.get(row.scaleGroup || "default");
      const partPositions = segment.parts.map((part) => leafPositions.get(part.id));
      const x = partPositions[0]?.x ?? 0;
      const width = partPositions.reduce((total, position) => total + (position?.width || 0), 0);
      return {
        ...segment,
        displaySS: width,
        x,
        width,
      };
    }),
  }));
};

const buildSSBarLayout = (current, displayMode, width) => {
  const margin = { top: 8, right: 12, bottom: 16, left: 12 };
  const rowHeight = 33;
  const barWidth = width - margin.left - margin.right;
  const rows = layoutSSRows(toSSRows(current), displayMode, barWidth).map((row, index) => ({
    ...row,
    y: margin.top + index * rowHeight,
  }));

  return {
    width,
    height: margin.top + margin.bottom + rows.length * rowHeight,
    margin,
    rows,
  };
};

const ssBarLayout = computed(() => buildSSBarLayout(scene.value, ssScaleMode.value, ssBarWidth));

const mobileAnovaKeyForNode = (node) => {
  if (!node) return null;
  if (node.syntheticResidual) return null;
  if (activeModule.value === "fourpl") {
    if (node.key === "preparation") return "specimen";
    if (node.key === "nonparallelism") return "deviationParallel";
    if (node.key === "unconstrainedResidual") return "residualII";
    if (node.key === "lackOfFit" || node.id === "lof") return "modelLof";
    if (node.key === "pureError") return "error";
  }

  if (node.key === "lackOfFit" || /^lof\d?$/.test(node.id)) return "lackOfFit";
  return node.key;
};

const mobileNodeColor = (key, id) =>
  ({
    total: "var(--bc-text-primary)",
    treatment: "var(--bc-text-secondary)",
    regression: "var(--bc-ss-regression)",
    preparation: "var(--bc-ss-preparation)",
    intersection: "var(--bc-ss-interaction)",
    nonlinearity: "var(--bc-ss-nonlinearity)",
    nonparallelism: "var(--bc-ss-interaction)",
    lackOfFit: "var(--bc-ss-nonlinearity)",
    pureError: "var(--bc-ss-error)",
    extra: "var(--bc-ss-extra)",
    constrainedResidual: "var(--bc-ss-residual)",
    unconstrainedResidual: "var(--bc-ss-residual)",
    residualII: "var(--bc-ss-residual)",
    modelLof: "var(--bc-ss-nonlinearity)",
    error: "var(--bc-ss-error)",
  })[key] ||
  {
    residual: "var(--bc-ss-residual)",
    lof: "var(--bc-ss-nonlinearity)",
    lof1: "var(--bc-ss-residual)",
    lof2: "var(--bc-ss-residual)",
    lof3: "var(--bc-ss-residual)",
    lof4: "var(--bc-ss-residual)",
  }[id] ||
  componentColor(key);

const mobileNodePrimaryLabel = (node) => {
  return mobileLabelForKey(node.key, node.inlineLabel || node.label);
};

const mobileLabelForKey = (key, fallback = key) => {
  return copy.value.mobile.nodeLabels?.[key] || fallback;
};

const mobileDetailLabelForKey = (key, fallback = key) => {
  return copy.value.mobile.nodeDetailLabels?.[key] || mobileLabelForKey(key, fallback);
};

const mobileStepName = computed(() => {
  return copy.value.mobile.stepNames?.[activeStep.value] || stepCopy.value.name;
});

const mobileNodeFlex = (node) => {
  if (node.key === "total") return 1;
  return Math.max(0.74, Math.min(3.2, node.percent / 26));
};

const mobileReadableShareFor = (segment) => {
  const label = mobileLabelForKey(segment.key, segment.inlineLabel || segment.label);
  if (["preparation", "specimen"].includes(segment.key)) return 0.155;
  if (["nonparallelism", "nonlinearity", "pureError"].includes(segment.key)) return 0.13;
  if (label.length >= 5) return 0.15;
  if (label.length >= 3) return 0.125;
  if (label.length === 2) return 0.11;
  return 0.098;
};

const constrainedMobileSegmentShares = (segments) => {
  const total =
    segments.reduce((sumValue, segment) => sumValue + Math.max(0, segment.trueSS), 0) || 1;
  const rawShares = segments.map((segment, index) => ({
    index,
    id: segment.id,
    key: segment.key,
    share: Math.max(0, segment.trueSS) / total,
    minShare: mobileReadableShareFor(segment),
  }));
  const minTotal = rawShares.reduce((sumValue, item) => sumValue + item.minShare, 0);
  const locked = new Set();
  const finalShares = new Map();
  const shareMap = new Map();

  const setShare = (item, share) => {
    shareMap.set(item.id, share);
    shareMap.set(item.key, share);
    if (
      ["preparation", "specimen"].includes(item.key) ||
      ["preparation", "specimen"].includes(item.id)
    ) {
      shareMap.set("preparation", share);
      shareMap.set("specimen", share);
    }
  };

  if (minTotal >= 1) {
    rawShares.forEach((item) => finalShares.set(item.index, item.minShare / minTotal));
  } else {
    let remainingSpace = 1;
    let changed = true;

    while (changed) {
      changed = false;
      const flexible = rawShares.filter((item) => !locked.has(item.index));
      const flexibleRawTotal = flexible.reduce((sumValue, item) => sumValue + item.share, 0);
      const nextLocked = [];

      flexible.forEach((item) => {
        const candidate =
          flexibleRawTotal > 0
            ? (item.share / flexibleRawTotal) * remainingSpace
            : remainingSpace / Math.max(1, flexible.length);
        if (candidate < item.minShare) {
          nextLocked.push(item);
        }
      });

      nextLocked.forEach((item) => {
        locked.add(item.index);
        finalShares.set(item.index, item.minShare);
        remainingSpace = Math.max(0, remainingSpace - item.minShare);
        changed = true;
      });
    }

    const flexible = rawShares.filter((item) => !locked.has(item.index));
    const flexibleRawTotal = flexible.reduce((sumValue, item) => sumValue + item.share, 0);
    flexible.forEach((item) => {
      const share =
        flexibleRawTotal > 0
          ? (item.share / flexibleRawTotal) * remainingSpace
          : remainingSpace / Math.max(1, flexible.length);
      finalShares.set(item.index, Math.max(0, share));
    });
  }

  rawShares.forEach((item) => setShare(item, finalShares.get(item.index) || 0));
  const primaryTotal =
    rawShares.reduce((sumValue, item) => sumValue + (shareMap.get(item.id) || 0), 0) || 1;
  rawShares.forEach((item) => setShare(item, (shareMap.get(item.id) || 0) / primaryTotal));

  return shareMap;
};

const mobileBaseSegmentShareMap = computed(() => {
  const finalStep = moduleSteps.value[moduleSteps.value.length - 1];
  const finalScene = scenes.value[activeModule.value][finalStep] || scene.value;
  const finalRows = toSSRows(finalScene);
  const finalSegments = finalRows[finalRows.length - 1]?.segments || [];
  return constrainedMobileSegmentShares(finalSegments);
});

const makeMobileNode = (segment, totalSS) => ({
  id: segment.id,
  key: segment.key,
  label: segment.inlineLabel || segment.longLabel || segment.label,
  shortLabel: segment.label,
  longLabel: segment.longLabel,
  trueSS: segment.trueSS,
  percent: totalSS ? (segment.trueSS / totalSS) * 100 : 0,
  parts: segment.parts,
  color: mobileNodeColor(segment.key, segment.id),
  anovaKey: null,
  children: [],
});

const makeMobileResidualNode = (segments, totalSS) => {
  const residualSS = segments.reduce((total, segment) => total + segment.trueSS, 0);

  return {
    id: `mobile-residual-${segments.map((segment) => segment.id).join("-")}`,
    key: "residual",
    label: mobileLabelForKey("residual"),
    shortLabel: mobileLabelForKey("residual"),
    longLabel: mobileLabelForKey("residual"),
    trueSS: residualSS,
    percent: totalSS ? (residualSS / totalSS) * 100 : 0,
    parts: segments.flatMap((segment) => segment.parts),
    color: mobileNodeColor("residual", "residual"),
    anovaKey: null,
    syntheticResidual: true,
    children: segments.map((segment) => makeMobileNode(segment, totalSS)),
  };
};

const flattenMobileTree = (node) => {
  if (!node) return [];
  return [node, ...(node.children || []).flatMap((child) => flattenMobileTree(child))];
};

const mobileVarianceTree = computed(() => {
  const rows = toSSRows(scene.value);
  const rootSegment = rows[0]?.segments[0];
  if (!rootSegment) return null;

  const root = makeMobileNode(rootSegment, rootSegment.trueSS || 1);
  const totalSS = root.trueSS || 1;
  const currentRow = rows[rows.length - 1];
  const residualKeys = new Set([
    "lackOfFit",
    "pureError",
    "constrainedResidual",
    "unconstrainedResidual",
  ]);

  if (currentRow) {
    const explainedSegments = currentRow.segments.filter(
      (segment) => !residualKeys.has(segment.key),
    );
    const residualSegments = currentRow.segments.filter((segment) => residualKeys.has(segment.key));

    root.children = explainedSegments.map((segment) => makeMobileNode(segment, totalSS));

    if (residualSegments.length > 1) {
      root.children.push(makeMobileResidualNode(residualSegments, totalSS));
    } else if (residualSegments.length === 1) {
      root.children.push(makeMobileNode(residualSegments[0], totalSS));
    }
  }

  flattenMobileTree(root).forEach((node) => {
    node.anovaKey = mobileAnovaKeyForNode(node);
  });

  return root;
});

const mobileFlatNodes = computed(() => flattenMobileTree(mobileVarianceTree.value));
const mobileTreeLevels = computed(() => {
  const levels = [];
  const queue = mobileVarianceTree.value ? [{ node: mobileVarianceTree.value, depth: 0 }] : [];

  while (queue.length) {
    const { node, depth } = queue.shift();
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(node);
    node.children.forEach((child) => queue.push({ node: child, depth: depth + 1 }));
  }

  return levels;
});
const mobileTreeActiveIds = computed(() =>
  highlightIdsFor(selectedMobileNodeId.value || scene.value.activeTerm, scene.value.module),
);
const mobileTreeActiveIdList = computed(() => [...mobileTreeActiveIds.value]);
const prepareMobileNode = (node) =>
  node
    ? {
        ...node,
        mobileLabel: mobileNodePrimaryLabel(node),
        mobileDetailLabel: mobileDetailLabelForKey(node.key, node.longLabel || node.label),
        mobileFlex: mobileNodeFlex(node),
        children: (node.children || []).map((child) => prepareMobileNode(child)),
      }
    : null;
const mobileDisplayLevels = computed(() => {
  const preparedRoot = prepareMobileNode(mobileVarianceTree.value);
  const preparedById = new Map(flattenMobileTree(preparedRoot).map((node) => [node.id, node]));
  return mobileTreeLevels.value.map((level) =>
    level.map((node) => preparedById.get(node.id) || node),
  );
});
const mobileSSRows = computed(() => {
  const rows = toSSRows(scene.value);
  const totalSS =
    rows[0]?.segments.reduce((total, segment) => total + Math.max(0, segment.trueSS), 0) || 1;

  return rows.map((row, index) => {
    const stepIndex = activeModule.value === "fourpl" ? index : index - 1;
    const stepKey = moduleSteps.value[stepIndex];
    const title =
      row.rowId === "total"
        ? copy.value.mobile.ssRowTitles.total
        : copy.value.mobile.stepNames?.[stepKey] ||
          copy.value.mobile.ssRowTitles.layer ||
          row.equation;

    const segmentsWithShares = row.segments.map((segment) => {
      const fixedShare =
        segment.key === "total"
          ? 1
          : segment.parts.reduce(
              (sumValue, part) =>
                sumValue +
                (mobileBaseSegmentShareMap.value.get(part.id) ||
                  mobileBaseSegmentShareMap.value.get(part.key) ||
                  0),
              0,
            );

      return {
        segment,
        visualShare:
          fixedShare || (row.segments.length === 1 ? 1 : mobileReadableShareFor(segment)),
      };
    });
    const rowShareTotal =
      segmentsWithShares.reduce((sumValue, item) => sumValue + item.visualShare, 0) || 1;
    const rowScale = Math.abs(rowShareTotal - 1) < 0.001 ? 1 : 1 / rowShareTotal;

    return {
      ...row,
      mobileTitle: title,
      segments: segmentsWithShares.map(({ segment, visualShare }) => {
        const node = makeMobileNode(segment, totalSS);
        node.anovaKey = mobileAnovaKeyForNode(node);
        return {
          ...node,
          mobileLabel: mobileNodePrimaryLabel(node),
          mobileDetailLabel: mobileDetailLabelForKey(node.key, node.longLabel || node.label),
          visualFlex: visualShare * rowScale,
        };
      }),
    };
  });
});
const mobileSSNodeList = computed(() =>
  mobileSSRows.value.flatMap((row) => row.segments.map((segment) => ({ ...segment }))),
);
const defaultMobileNode = computed(
  () =>
    mobileSSNodeList.value.find(
      (node) => node.id !== "total" && mobileTreeActiveIds.value.has(node.id),
    ) ||
    mobileFlatNodes.value.find(
      (node) => node.id !== "total" && mobileTreeActiveIds.value.has(node.id),
    ) ||
    mobileSSNodeList.value.find((node) => node.id === "total") ||
    mobileFlatNodes.value.find((node) => node.id === "total") ||
    null,
);
const selectedMobileNode = computed(
  () =>
    mobileSSNodeList.value.find((node) => node.id === selectedMobileNodeId.value) ||
    mobileDisplayLevels.value.flat().find((node) => node.id === selectedMobileNodeId.value) ||
    mobileSSNodeList.value.find((node) => node.id === defaultMobileNode.value?.id) ||
    mobileDisplayLevels.value.flat().find((node) => node.id === defaultMobileNode.value?.id) ||
    defaultMobileNode.value,
);
const mobileFitHint = computed(() => {
  if (selectedMobileNode.value?.key === "lackOfFit") return copy.value.mobile.fitLofHint;
  return copy.value.mobile.fitHint;
});
const selectedMobileRow = computed(() => {
  const node = selectedMobileNode.value;
  if (!node) return null;
  return scene.value.anovaRows.find((row) => row.key === node.anovaKey) || null;
});
const selectedMobileStats = computed(() => {
  if (!selectedMobileNode.value) return null;
  if (selectedMobileRow.value) return selectedMobileRow.value;
  if (selectedMobileNode.value.syntheticResidual) {
    const childRows = selectedMobileNode.value.children
      .map((child) => scene.value.anovaRows.find((row) => row.key === child.anovaKey))
      .filter(Boolean);
    const df = childRows.reduce((total, row) => total + Number(row.df || 0), 0);
    return {
      ss: selectedMobileNode.value.trueSS,
      df: df || null,
      ms: df ? selectedMobileNode.value.trueSS / df : null,
      f: null,
      pValue: "",
    };
  }
  return {
    ss: selectedMobileNode.value.trueSS,
    df: null,
    ms: null,
    f: null,
    pValue: "",
  };
});
const selectedMobileStatItems = computed(() => {
  if (!selectedMobileNode.value) return [];
  const stats = selectedMobileStats.value;
  const items = [{ label: copy.value.ss, value: formatNumber(selectedMobileNode.value.trueSS) }];
  if (stats?.df != null) items.push({ label: copy.value.df, value: String(stats.df) });
  if (stats?.ms != null) items.push({ label: copy.value.ms, value: formatNumber(stats.ms) });
  if (stats?.f != null && formatStatistic(stats.f))
    items.push({ label: copy.value.f, value: formatStatistic(stats.f) });
  if (stats?.pValue) items.push({ label: copy.value.pValue, value: stats.pValue });
  return items;
});
const selectedMobileCorrespondingLabel = computed(() => {
  if (!selectedMobileNode.value) return "";
  if (selectedMobileRow.value) return mobileLabelForKey(selectedMobileRow.value.key);
  if (selectedMobileNode.value.syntheticResidual && selectedMobileNode.value.children.length) {
    return selectedMobileNode.value.children
      .map((child) => mobileNodePrimaryLabel(child))
      .join(" + ");
  }
  return copy.value.mobile.noAnovaRow;
});
const mobileSelectedDescription = computed(() => {
  const node = selectedMobileNode.value;
  if (!node) return copy.value.mobile.detailHint;
  if (node.syntheticResidual) {
    return `${copy.value.mobile.residualDescription} ${copy.value.ss}: ${formatNumber(
      node.trueSS,
    )}.`;
  }
  return `${copy.value.ssHover[node.id] || copy.value.ssHover[node.key] || node.longLabel} ${copy.value.ss}: ${formatNumber(
    node.trueSS,
  )}.`;
});
const rowIsMobileSelected = (row) => {
  if (!selectedMobileNode.value) return row.highlight;
  return selectedMobileRow.value?.key === row.key;
};
const mobileSummaryRows = computed(() =>
  scene.value.anovaRows
    .filter((row) => row.pValue && ["significant", "notSignificant"].includes(row.expected))
    .slice(0, 3),
);
const formatMobileAnovaRow = (row) => ({
  raw: row,
  key: row.key,
  label: mobileLabelForKey(row.key),
  color: componentColor(row.key),
  ss: formatNumber(row.ss),
  df: row.df,
  ms: row.ms === null ? "—" : formatNumber(row.ms),
  f: formatStatistic(row.f) || "—",
  pValue: row.pValue || "—",
  isSelected: rowIsMobileSelected(row),
});
const mobileSummaryCards = computed(() => mobileSummaryRows.value.map(formatMobileAnovaRow));
const mobileAnovaCards = computed(() => scene.value.anovaRows.map(formatMobileAnovaRow));
const toggleMobileNode = (node) => {
  selectedMobileNodeId.value = selectedMobileNodeId.value === node.id ? null : node.id;
};
const toggleMobileRow = (row) => {
  const node = [...mobileFlatNodes.value]
    .reverse()
    .find((candidate) => candidate.anovaKey === row.key);
  if (!node) return;
  selectedMobileNodeId.value = selectedMobileNodeId.value === node.id ? null : node.id;
};
const hoveredSSRow = ref(null);
const hoveredSegment = computed(() => {
  if (!hoveredSS.value) return null;
  return ssBarLayout.value.rows
    .flatMap((row) => row.segments.map((segment) => ({ ...segment, rowId: row.rowId })))
    .find(
      (segment) =>
        segment.id === hoveredSS.value &&
        (!hoveredSSRow.value || segment.rowId === hoveredSSRow.value),
    );
});
const hoverNote = computed(() => {
  if (!hoveredSS.value || !hoveredSegment.value) return copy.value.ssHover.default;
  return `${copy.value.ssHover[hoveredSS.value] || copy.value.ssHover.default} ${copy.value.ss}: ${formatNumber(
    hoveredSegment.value.trueSS,
  )}.`;
});
const activeSSIds = computed(() =>
  highlightIdsFor(hoveredSS.value || scene.value.activeTerm, scene.value.module),
);

const segmentText = (segment) => {
  if (segment.width < 4) return "";
  return segment.label;
};

const segmentTextX = (segment) => (segment.width < 80 ? segment.width / 2 : 7);

const segmentTextAnchor = (segment) => (segment.width < 80 ? "middle" : "start");

const setHoveredSS = (rowId, segmentId) => {
  hoveredSSRow.value = rowId;
  hoveredSS.value = segmentId;
};

const clearHoveredSS = () => {
  hoveredSSRow.value = null;
  hoveredSS.value = null;
};

const isHoveredSegment = (row, segment) =>
  hoveredSSRow.value === row.rowId && hoveredSS.value === segment.id;

const hiddenEquationRowId = computed(() => {
  if (!hoveredSSRow.value || !hoveredSS.value) return null;
  const rows = ssBarLayout.value.rows;
  const rowIndex = rows.findIndex((row) => row.rowId === hoveredSSRow.value);
  const nextRow = rows[rowIndex + 1];
  if (rowIndex < 0 || !nextRow) return null;

  const currentRow = rows[rowIndex];
  const hoverLabelBaseline = currentRow.y + 15 + 25;
  const hoverLabelTop = hoverLabelBaseline - 7;
  const hoverLabelBottom = hoverLabelBaseline + 3;
  const nextFormulaBaseline = nextRow.y + 6;
  const nextFormulaTop = nextFormulaBaseline - 7;
  const nextFormulaBottom = nextFormulaBaseline + 3;

  return hoverLabelBottom >= nextFormulaTop && hoverLabelTop <= nextFormulaBottom
    ? nextRow.rowId
    : null;
});

const ssEquationParts = (equation) => {
  const tokenPattern =
    /(SSE_[A-Za-z]+(?:-[A-Za-z]+)*|SS_[A-Za-z]+(?: [A-Za-z]+)?(?:-[A-Za-z]+)*(?:-\d+)?|Extra SS)/g;
  return equation.split(tokenPattern).flatMap((part, index) => {
    if (!part) return [];
    if (part === "Extra SS") return [{ type: "ss", base: "SS", sub: "extra", key: index }];
    if (part.startsWith("SS_") || part.startsWith("SSE_")) {
      const [base, rawSub] = part.split("_");
      return [{ type: "ss", base, sub: rawSub.toLowerCase(), key: index }];
    }
    return [{ type: "text", text: part, key: index }];
  });
};

const highlightIdsFor = (id, module) => {
  if (module === "fourpl") {
    const relations = {
      total: ["total", "preparation", "regression", "constrainedResidual"],
      constrainedResidual: ["total", "preparation", "regression", "constrainedResidual"],
      preparation: ["total", "preparation", "regression", "constrainedResidual"],
      regression: ["total", "preparation", "regression", "constrainedResidual"],
      nonparallelism: ["constrainedResidual", "nonparallelism", "unconstrainedResidual"],
      unconstrainedResidual: ["unconstrainedResidual", "lof", "pureError"],
      lackOfFit: ["unconstrainedResidual", "lof", "pureError"],
      lof: ["unconstrainedResidual", "lof", "pureError"],
      pureError: ["pureError"],
    };
    return new Set([...(relations[id] || []), id]);
  }

  const sharedRelations = {
    total:
      module === "pla"
        ? [
            "total",
            "treatment",
            "regression",
            "preparation",
            "nonparallelism",
            "nonlinearity",
            "lof1",
            "lof2",
            "lof3",
            "lof4",
            "pureError",
          ]
        : [
            "total",
            "treatment",
            "regression",
            "intersection",
            "nonlinearity",
            "lof",
            "lof1",
            "lof2",
            "lof3",
            "pureError",
            "extra",
            "unconstrainedResidual",
          ],
    treatment:
      module === "pla"
        ? [
            "treatment",
            "regression",
            "preparation",
            "nonparallelism",
            "nonlinearity",
            "lof1",
            "lof2",
            "lof3",
            "lof4",
          ]
        : [
            "treatment",
            "regression",
            "intersection",
            "nonlinearity",
            "lof",
            "lof1",
            "lof2",
            "lof3",
          ],
    regression:
      module === "pla"
        ? ["lof1", "regression", "lof2"]
        : module === "sra"
          ? ["treatment", "regression", "lof1"]
          : ["treatment", "regression", "lof"],
    pureError: ["pureError"],
    lof: ["lof", "unconstrainedResidual"],
    extra: ["extra"],
    unconstrainedResidual: ["unconstrainedResidual", "lof", "pureError"],
  };
  const linearRelations =
    module === "pla"
      ? {
          preparation: ["treatment", "preparation", "lof1"],
          nonparallelism: ["lof2", "nonparallelism", "lof3"],
          nonlinearity: ["lof3", "nonlinearity", "lof4"],
          lof1: ["lof1", "regression", "lof2"],
          lof2: ["lof2", "nonparallelism", "lof3"],
          lof3: ["lof3", "nonlinearity", "lof4"],
          lof4: ["lof4"],
        }
      : {
          intersection: ["lof1", "intersection", "lof2"],
          nonlinearity: ["lof2", "nonlinearity", "lof3"],
          lof1: ["lof1", "intersection", "lof2"],
          lof2: ["lof2", "nonlinearity", "lof3"],
          lof3: ["lof3"],
        };

  return new Set([...(sharedRelations[id] || []), ...(linearRelations[id] || []), id]);
};

const drawChart = () => {
  if (!chartSvg.value || !chartWrap.value) return;

  const current = scene.value;
  const svg = d3.select(chartSvg.value);
  const isMobileChart =
    typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const width = Math.max(500, chartWrap.value.clientWidth || 620);
  const height = isMobileChart ? 300 : 414;
  const margin = isMobileChart
    ? { top: 14, right: 14, bottom: 36, left: 42 }
    : { top: 18, right: 18, bottom: 42, left: 46 };
  const xLabelY = isMobileChart ? height - 3 : height - 9;
  const yLabelY = isMobileChart ? 8 : 15;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const xScale = d3
    .scaleLinear()
    .domain(current.chartDomain.x)
    .range([margin.left, margin.left + innerWidth]);
  const yScale = d3
    .scaleLinear()
    .domain(current.chartDomain.y)
    .nice()
    .range([margin.top + innerHeight, margin.top]);
  const transition = svg.transition().duration(360).ease(d3.easeCubicOut);
  const lineGenerator = d3
    .line()
    .x((point) => xScale(point.x))
    .y((point) => yScale(point.y))
    .curve(d3.curveCatmullRom.alpha(0.5));

  svg.attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img");

  svg
    .selectAll(".plot-bg")
    .data([null])
    .join("rect")
    .attr("class", "plot-bg")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("rx", 8);

  svg
    .selectAll(".x-axis")
    .data([null])
    .join("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${margin.top + innerHeight})`)
    .transition(transition)
    .call(d3.axisBottom(xScale).ticks(6).tickSizeOuter(0));

  svg
    .selectAll(".y-axis")
    .data([null])
    .join("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .transition(transition)
    .call(d3.axisLeft(yScale).ticks(5).tickSizeOuter(0));

  svg
    .selectAll(".x-label")
    .data([copy.value.xAxes[current.xAxisKey] || copy.value.xAxis])
    .join("text")
    .attr("class", "axis-label x-label")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", xLabelY)
    .text((label) => label);

  svg
    .selectAll(".y-label")
    .data([copy.value.yAxis])
    .join("text")
    .attr("class", "axis-label y-label")
    .attr("x", -margin.top - innerHeight / 2)
    .attr("y", yLabelY)
    .attr("transform", "rotate(-90)")
    .text((label) => label);

  svg
    .selectAll(".residual-line")
    .data(current.residuals, (point) => point.id)
    .join(
      (enter) =>
        enter
          .append("line")
          .attr("class", "residual-line")
          .attr("x1", (point) => xScale(point.x))
          .attr("x2", (point) => xScale(point.x))
          .attr("y1", (point) => yScale(point.y))
          .attr("y2", (point) => yScale(point.y)),
      (update) => update,
      (exit) => exit.transition(transition).style("opacity", 0).remove(),
    )
    .transition(transition)
    .attr("x1", (point) => xScale(point.x))
    .attr("x2", (point) => xScale(point.x))
    .attr("y1", (point) => yScale(point.y))
    .attr("y2", (point) => yScale(point.predicted));

  const paths = svg.selectAll(".model-line").data(current.lines, (line) => line.group);

  paths
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "model-line")
          .attr("fill", "none")
          .attr("stroke", (line) => groupColor(line.group))
          .attr("d", (line) => lineGenerator(line.values)),
      (update) => update,
      (exit) => exit.transition(transition).style("opacity", 0).remove(),
    )
    .transition(transition)
    .attr("stroke", (line) => groupColor(line.group))
    .attr("d", (line) => lineGenerator(line.values))
    .style("opacity", 1);

  const points = svg.selectAll(".observed-point").data(current.points, (point) => point.id);

  const enteredPoints = points
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "observed-point")
          .attr("r", 0)
          .attr("cx", (point) => xScale(point.x))
          .attr("cy", (point) => yScale(point.y))
          .attr("fill", (point) => groupColor(point.group)),
      (update) => update,
      (exit) => exit.transition(transition).attr("r", 0).remove(),
    )
    .attr("fill", (point) => groupColor(point.group));

  enteredPoints.selectAll("title").remove();
  enteredPoints
    .append("title")
    .text(
      (point) =>
        `${copy.value.tooltipObserved}: ${formatNumber(point.y)}\n${copy.value.tooltipPredicted}: ${formatNumber(
          current.residuals.find((residual) => residual.id === point.id)?.predicted || point.y,
        )}`,
    );

  enteredPoints
    .transition(transition)
    .attr("r", 4.4)
    .attr("cx", (point) => xScale(point.x))
    .attr("cy", (point) => yScale(point.y));
};

watch([scene, language, ssScaleMode], async () => {
  await nextTick();
  drawChart();
});

watch([activeModule, activeStep], async () => {
  selectedMobileNodeId.value = null;
  mobileInfoOpen.value = false;
  fullMobileAnovaOpen.value = false;
  await nextTick();
  updateMobileContentTop();
  if (typeof window === "undefined" || !window.matchMedia("(max-width: 768px)").matches) return;
  moduleControl.value?.querySelector(".is-active")?.scrollIntoView({
    inline: "center",
    block: "nearest",
  });
  stepControl.value?.querySelector(".is-active")?.scrollIntoView({
    inline: "center",
    block: "nearest",
  });
});

watch([language, mobileView], async () => {
  await nextTick();
  updateMobileContentTop();
  if (mobileView.value === "fit") drawChart();
});

watch([selectedMobileNodeId], () => {
  mobileInfoOpen.value = false;
});

onMounted(async () => {
  await nextTick();
  drawChart();

  chartObserver = new ResizeObserver(drawChart);
  if (chartWrap.value) chartObserver.observe(chartWrap.value);

  if ("IntersectionObserver" in window && headerMorphTrigger.value) {
    headerMorphObserver = new IntersectionObserver(
      ([entry]) => {
        isHeaderMorphed.value = !entry.isIntersecting;
      },
      { threshold: 0 },
    );
    headerMorphObserver.observe(headerMorphTrigger.value);
  }

  if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
    updateMobileContentTop();
    mobileHeaderObserver = new ResizeObserver(updateMobileContentTop);
    [
      explorerRoot.value?.querySelector(".mobile-top-controls"),
      explorerRoot.value?.querySelector(".mobile-view-switch"),
      explorerRoot.value?.querySelector(".mobile-step-card"),
    ]
      .filter(Boolean)
      .forEach((part) => mobileHeaderObserver.observe(part));
    window.addEventListener("resize", updateMobileContentTop);

    moduleControl.value?.querySelector(".is-active")?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
    stepControl.value?.querySelector(".is-active")?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }
});

onBeforeUnmount(() => {
  chartObserver?.disconnect();
  headerMorphObserver?.disconnect();
  mobileHeaderObserver?.disconnect();
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", updateMobileContentTop);
  }
});
</script>

<template>
  <main
    ref="explorerRoot"
    class="anova-explorer morph-header-v1"
    :class="[
      { 'is-header-morphed': isHeaderMorphed },
      mobileView === 'fit' ? 'is-mobile-fit' : 'is-mobile-decomposition',
    ]"
    :style="mobileShellStyle"
  >
    <div ref="headerMorphTrigger" class="header-morph-trigger" aria-hidden="true"></div>
    <ToolTopbar
      :title="copy.title"
      :language="language"
      :language-label="copy.languageLabel"
      :home-label="copy.home"
      :is-morphed="isHeaderMorphed"
      @set-language="setLanguage"
    />

    <section class="explorer-header" aria-labelledby="anova-explorer-title">
      <div>
        <h1 id="anova-explorer-title">{{ copy.title }}</h1>
      </div>
    </section>

    <div class="mobile-sticky-header" aria-label="ANOVA Explorer mobile navigation">
      <MobileTopControls
        :copy="copy"
        :active-module="activeModule"
        :module-order="moduleOrder"
        :language="language"
        @set-module="setModule"
        @set-language="setLanguage"
      />

      <MobileSegmentedNavigation
        :copy="copy"
        :active-view="mobileView"
        @set-view="mobileView = $event"
      />

      <MobileStepController
        :copy="copy"
        :steps="moduleSteps"
        :active-step="activeStep"
        :active-step-index="activeStepIndex"
        :step-name="mobileStepName"
        @previous="goToAdjacentStep(-1)"
        @next="goToAdjacentStep(1)"
        @set-step="activeStep = $event"
      />
    </div>

    <section class="module-sticky" aria-label="ANOVA Explorer module switcher">
      <div class="control-group module-group">
        <span>{{ copy.modulesLabel }}</span>
        <div ref="moduleControl" class="segmented-control">
          <button
            v-for="module in moduleOrder"
            :key="module"
            type="button"
            :class="{ 'is-active': activeModule === module }"
            @click="setModule(module)"
          >
            {{ copy.modules[module] }}
          </button>
        </div>
      </div>
      <div class="control-group step-group">
        <span>{{ copy.stepsLabel }}</span>
        <div ref="stepControl" class="step-control">
          <button
            v-for="(step, index) in moduleSteps"
            :key="step"
            type="button"
            :class="{ 'is-active': activeStep === step }"
            @click="activeStep = step"
          >
            <span class="step-index">{{ index + 1 }}</span>
            {{ copy.steps[activeModule][step].name }}
          </button>
        </div>
      </div>
    </section>

    <section class="teaching-grid" aria-label="ANOVA interactive teaching workspace">
      <div class="visual-panel chart-panel">
        <div class="panel-title-row">
          <div>
            <span>{{ copy.chartTitle }}</span>
            <strong>{{ stepCopy.model }}</strong>
          </div>
          <div class="chart-legend" aria-label="Chart legend">
            <span><i class="legend-dot observed"></i>{{ copy.legendObserved }}</span>
            <span><i class="legend-line model"></i>{{ copy.legendModel }}</span>
            <span><i class="legend-line residual"></i>{{ copy.legendResidual }}</span>
          </div>
        </div>
        <div ref="chartWrap" class="chart-wrap">
          <svg ref="chartSvg" class="anova-chart"></svg>
        </div>
      </div>

      <aside class="insight-panel" aria-labelledby="model-panel-title">
        <div class="insight-heading">
          <span class="panel-kicker">{{ copy.modelPanel }}</span>
          <h2 id="model-panel-title">{{ stepCopy.name }}</h2>
        </div>

        <p class="mobile-fit-note">{{ mobileFitHint }}</p>
        <dl class="model-facts">
          <div class="formula-panel">
            <dt>{{ copy.equation }}</dt>
            <dd class="formula-theory" v-html="formulaHtml(formulaPanel.theory)"></dd>
            <dd v-for="row in formulaPanel.rows" :key="row.label" class="formula-param-grid">
              <div class="formula-param-row">
                <span class="formula-row-label">{{ row.label }}</span>
                <span
                  class="formula-param-cells"
                  :style="{ gridTemplateColumns: `repeat(${row.names.length}, minmax(0, 1fr))` }"
                >
                  <span
                    v-for="(name, nameIndex) in row.names"
                    :key="`${row.label}-name-${nameIndex}`"
                    v-html="formulaHtml(name)"
                  ></span>
                </span>
              </div>
              <div class="formula-param-row">
                <span class="formula-row-label">{{ copy.formulaValues }}</span>
                <span
                  class="formula-param-cells"
                  :style="{ gridTemplateColumns: `repeat(${row.values.length}, minmax(0, 1fr))` }"
                >
                  <strong
                    v-for="(value, valueIndex) in row.values"
                    :key="`${row.label}-value-${valueIndex}`"
                  >
                    {{ formatFormulaValue(value) }}
                  </strong>
                </span>
              </div>
              <div v-if="row.meanings.length" class="formula-param-row formula-meaning-row">
                <span class="formula-row-label">{{ copy.formulaMeaning }}</span>
                <span
                  class="formula-param-cells"
                  :style="{
                    gridTemplateColumns: `repeat(${row.meanings.length}, minmax(0, 1fr))`,
                  }"
                >
                  <span
                    v-for="(meaning, meaningIndex) in row.meanings"
                    :key="`${row.label}-meaning-${meaningIndex}`"
                  >
                    {{ meaning }}
                  </span>
                </span>
              </div>
            </dd>
          </div>
          <div class="fact-block">
            <dt>{{ copy.currentQuestion }}</dt>
            <dd>{{ stepCopy.assumption }}</dd>
          </div>
          <div class="fact-block">
            <dt>{{ copy.currentComparison }}</dt>
            <dd>{{ stepCopy.comparison }}</dd>
          </div>
          <div class="fact-block">
            <dt>{{ copy.expectedDecision }}</dt>
            <dd>{{ stepCopy.ftest }}</dd>
          </div>
          <div class="fact-block">
            <dt>{{ copy.why }}</dt>
            <dd>{{ stepCopy.key }}</dd>
          </div>
        </dl>
      </aside>
    </section>

    <section class="parameter-strip" :aria-label="copy.parameterPanel">
      <div class="parameter-head">
        <span>{{ copy.parameterPanel }}</span>
        <button type="button" class="quiet-button" @click="regenerateData">
          {{ copy.regenerate }}
        </button>
      </div>
      <label>
        <span>{{ copy.pureErrorControl }}</span>
        <output>{{ formatNumber(parameters.pureError) }}</output>
        <input
          type="range"
          :value="parameters.pureError"
          min="0.35"
          max="4"
          step="0.05"
          @input="updateParameter('pureError', $event.target.value)"
        />
      </label>
      <label v-if="activeModule === 'sra'">
        <span>{{ copy.interceptControl }}</span>
        <output>{{ formatNumber(parameters.interceptShift) }}</output>
        <input
          type="range"
          :value="parameters.interceptShift"
          min="0"
          max="4"
          step="0.05"
          @input="updateParameter('interceptShift', $event.target.value)"
        />
      </label>
      <label v-if="activeModule === 'pla'">
        <span>{{ copy.slopeControl }}</span>
        <output>{{ formatNumber(parameters.slopeShift) }}</output>
        <input
          type="range"
          :value="parameters.slopeShift"
          min="0"
          max="4"
          step="0.05"
          @input="updateParameter('slopeShift', $event.target.value)"
        />
      </label>
      <label v-if="activeModule !== 'fourpl'">
        <span>{{ copy.nonlinearityControl }}</span>
        <output>{{ formatNumber(parameters.nonlinearity) }}</output>
        <input
          type="range"
          :value="parameters.nonlinearity"
          min="0"
          max="4"
          step="0.05"
          @input="updateParameter('nonlinearity', $event.target.value)"
        />
      </label>
      <label v-if="activeModule === 'fourpl'">
        <span>{{ copy.fourPlControl }}</span>
        <output>{{ formatNumber(parameters.fourPlDifference) }}</output>
        <input
          type="range"
          :value="parameters.fourPlDifference"
          min="0"
          max="4"
          step="0.05"
          @input="updateParameter('fourPlDifference', $event.target.value)"
        />
      </label>
    </section>

    <section class="visual-panel ss-panel" aria-labelledby="ss-panel-title">
      <div class="panel-title-row">
        <div>
          <span id="ss-panel-title">{{ copy.barTitle }}</span>
          <strong>{{ componentLabel(scene.activeTerm, true) }}</strong>
        </div>
        <div class="ss-tools">
          <div class="ss-mode" :aria-label="copy.ssMode">
            <button
              type="button"
              :class="{ 'is-active': ssScaleMode === 'teaching' }"
              @click="ssScaleMode = 'teaching'"
            >
              {{ copy.ssTeaching }}
            </button>
            <button
              type="button"
              :class="{ 'is-active': ssScaleMode === 'true' }"
              @click="ssScaleMode = 'true'"
            >
              {{ copy.ssTrue }}
            </button>
          </div>
        </div>
      </div>
      <p class="ss-note">{{ ssModeNote }}</p>
      <div class="bar-wrap">
        <svg
          class="ss-chart"
          :viewBox="`0 0 ${ssBarLayout.width} ${ssBarLayout.height}`"
          role="img"
          :aria-label="copy.barTitle"
        >
          <g
            v-for="row in ssBarLayout.rows"
            :key="row.rowId"
            class="ss-row"
            :transform="`translate(${ssBarLayout.margin.left}, ${row.y})`"
          >
            <text
              class="ss-equation"
              :class="{ 'is-hidden-by-hover': hiddenEquationRowId === row.rowId }"
              x="0"
              y="6"
            >
              <template v-for="part in ssEquationParts(row.equation)" :key="part.key">
                <tspan v-if="part.type === 'ss'">
                  {{ part.base }}
                  <tspan class="ss-equation-sub">{{ part.sub }}</tspan>
                </tspan>
                <tspan v-else>{{ part.text }}</tspan>
              </template>
            </text>
            <g
              v-for="segment in row.segments"
              :key="`${row.rowId}-${segment.id}`"
              class="ss-segment"
              :class="{
                'is-highlighted': activeSSIds.has(segment.id),
                'is-hovered': isHoveredSegment(row, segment),
                'is-dimmed': hoveredSS,
              }"
              :transform="`translate(${segment.x}, 15)`"
              tabindex="0"
              role="button"
              :aria-label="segment.longLabel"
              @mouseenter="setHoveredSS(row.rowId, segment.id)"
              @focus="setHoveredSS(row.rowId, segment.id)"
              @mouseleave="clearHoveredSS"
              @blur="clearHoveredSS"
            >
              <rect
                :width="Math.max(1, segment.width)"
                height="12"
                rx="2.5"
                :fill="componentColor(segment.key)"
              />
              <text :x="segmentTextX(segment)" y="8.6" :text-anchor="segmentTextAnchor(segment)">
                {{ segmentText(segment) }}
              </text>
              <text v-if="isHoveredSegment(row, segment)" class="ss-inline-label" x="0" y="25">
                {{ segment.inlineLabel }}
              </text>
            </g>
          </g>
        </svg>
      </div>
      <p class="ss-hover-note">{{ hoverNote }}</p>
    </section>

    <MobileVarianceTree
      :copy="copy"
      :rows="mobileSSRows"
      :active-ids="mobileTreeActiveIdList"
      :selected-node-id="selectedMobileNodeId || ''"
      @select-node="toggleMobileNode"
    />

    <MobileAnovaSummary
      :copy="copy"
      :summary-rows="mobileSummaryCards"
      :full-rows="mobileAnovaCards"
      :full-open="fullMobileAnovaOpen"
      :empty-text="copy.tableEmpty"
      variant="summary"
      @select-row="toggleMobileRow"
      @toggle-full="fullMobileAnovaOpen = !fullMobileAnovaOpen"
    />

    <MobileVarianceDetailCard
      :copy="copy"
      :node="selectedMobileNode"
      :stats="selectedMobileStatItems"
      :description="mobileSelectedDescription"
      :corresponding-label="selectedMobileCorrespondingLabel"
      :info-open="mobileInfoOpen"
      @toggle-info="mobileInfoOpen = !mobileInfoOpen"
    />

    <section class="anova-table-wrap" aria-labelledby="anova-table-title">
      <h2 id="anova-table-title">{{ copy.anovaPanel }}</h2>
      <p>{{ copy.anovaHint }}</p>
      <div v-if="scene.anovaRows.length" class="anova-grid" role="table">
        <div class="anova-row anova-head" role="row">
          <div role="columnheader">{{ copy.source }}</div>
          <div role="columnheader">{{ copy.ss }}</div>
          <div role="columnheader">{{ copy.df }}</div>
          <div role="columnheader">{{ copy.ms }}</div>
          <div role="columnheader">{{ copy.f }}</div>
          <div role="columnheader">{{ copy.pValue }}</div>
          <div role="columnheader">{{ copy.expected }}</div>
        </div>
        <div
          v-for="row in scene.anovaRows"
          :key="row.key"
          class="anova-row"
          :class="{ 'is-highlighted': row.highlight }"
          role="row"
        >
          <div class="source-cell" role="cell">{{ componentLabel(row.key, true) }}</div>
          <div class="number-cell" role="cell">{{ formatNumber(row.ss) }}</div>
          <div class="number-cell" role="cell">{{ row.df }}</div>
          <div class="number-cell" role="cell">
            {{ row.ms === null ? "" : formatNumber(row.ms) }}
          </div>
          <div class="number-cell" role="cell">{{ formatStatistic(row.f) }}</div>
          <div class="number-cell" role="cell">{{ row.pValue }}</div>
          <div class="decision-cell" role="cell">{{ decisionLabel(row.expected) }}</div>
        </div>
      </div>
      <div v-else class="empty-table">{{ copy.tableEmpty }}</div>
    </section>

    <MobileAnovaSummary
      :copy="copy"
      :summary-rows="mobileSummaryCards"
      :full-rows="mobileAnovaCards"
      :full-open="fullMobileAnovaOpen"
      :empty-text="copy.tableEmpty"
      variant="full"
      @select-row="toggleMobileRow"
      @toggle-full="fullMobileAnovaOpen = !fullMobileAnovaOpen"
    />
  </main>
</template>

<style scoped>
.anova-explorer {
  --topbar-sticky-height: 48px;
  --paper: var(--bc-bg-page);
  --ink: var(--bc-text-primary);
  --muted: var(--bc-text-secondary);
  --line: var(--bc-border-default);
  --soft-line: var(--bc-border-subtle);
  --panel: var(--bc-bg-surface);
  --panel-soft: var(--bc-bg-surface-elevated);
  --field-bg: var(--bc-bg-input);
  --selected-bg: var(--bc-bg-selected);
  --accent: var(--bc-accent);
  --accent-soft: var(--bc-accent-soft);
  --accent-border: var(--bc-accent-border);
  --focus-ring: var(--bc-focus-ring);
  --card-shadow: var(--bc-shadow-card);
  --danger: var(--bc-danger);
  width: min(1280px, calc(100% - var(--bc-container-inline, 48px)));
  min-height: 100svh;
  margin: 0 auto;
  padding: calc(var(--topbar-sticky-height) + 10px) 0 18px;
  color: var(--ink);
  position: relative;
}

.header-morph-trigger {
  position: absolute;
  top: 128px;
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.explorer-header {
  padding: 4px 0 5px;
}

h1 {
  margin: 0;
  font-size: clamp(1.5rem, 2.25vw, 2.25rem);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1;
  transform-origin: left center;
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.is-header-morphed h1 {
  opacity: 0;
  transform: translateY(-10px) scale(0.92);
}

button {
  cursor: pointer;
}

.segmented-control,
.step-control {
  display: flex;
  gap: 4px;
  padding: 2px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel-soft);
}

.segmented-control button,
.step-control button {
  min-height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: 0.66rem;
  font-weight: 600;
  white-space: nowrap;
}

.segmented-control button,
.step-control button {
  padding: 0 8px;
}

.segmented-control button.is-active,
.step-control button.is-active {
  background: var(--selected-bg);
  color: var(--ink);
}

.module-sticky {
  position: sticky;
  top: var(--topbar-sticky-height);
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(230px, 0.72fr) minmax(0, 1.4fr);
  gap: 12px;
  align-items: end;
  margin: 0 calc(var(--bc-container-inline, 48px) / -2);
  padding: 6px calc(var(--bc-container-inline, 48px) / 2);
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(14px);
}

.mobile-sticky-header {
  display: none;
}

.control-group {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.module-group {
  opacity: 0.78;
}

.module-group .segmented-control button {
  min-height: 31px;
  padding: 0 7px;
  font-size: 0.62rem;
}

.step-group .step-control {
  background: var(--panel);
}

.step-group .step-control button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-height: 31px;
  padding: 0 10px;
  color: var(--muted);
  font-size: 0.68rem;
}

.step-group .step-control button.is-active {
  background: var(--accent);
  color: var(--bc-text-inverse);
}

.step-index {
  display: inline-grid;
  width: 17px;
  height: 17px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.58rem;
  line-height: 1;
  opacity: 0.78;
}

.control-group > span,
.panel-kicker,
.panel-title-row span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
}

.parameter-strip {
  display: grid;
  grid-template-columns: minmax(132px, 0.8fr) repeat(4, minmax(132px, 1fr));
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
}

.parameter-head {
  display: grid;
  gap: 5px;
  align-content: center;
}

.parameter-head span,
.parameter-strip label span,
.ss-mode span {
  color: var(--muted);
  font-size: 0.64rem;
  font-weight: 600;
  text-transform: uppercase;
}

.quiet-button {
  min-height: 28px;
  padding: 0 9px;
  color: var(--accent);
  border: 1px solid var(--accent-border);
  border-radius: 7px;
  background: transparent;
  font-size: 0.66rem;
  font-weight: 600;
}

.parameter-strip label {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.parameter-strip label output {
  display: none;
}

.parameter-strip input[type="number"] {
  width: 100%;
  min-height: 30px;
  padding: 4px 7px;
  border: 1px solid var(--soft-line);
  border-radius: 7px;
  background: var(--field-bg);
  color: var(--ink);
  font-size: 0.76rem;
}

.parameter-strip input[type="range"] {
  width: 100%;
  min-height: 30px;
  accent-color: var(--accent);
}

.ss-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
}

.ss-tools p {
  max-width: 420px;
  margin: 0;
  color: var(--muted);
  font-size: 0.68rem;
  line-height: 1.38;
}

.ss-mode {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-width: max-content;
}

.ss-mode button {
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid var(--soft-line);
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
}

.ss-mode button.is-active {
  background: var(--selected-bg);
  color: var(--ink);
}

.segmented-control,
.step-control {
  overflow-x: auto;
}

.teaching-grid {
  --teaching-panel-height: 500px;
  --chart-area-height: 414px;
  --insight-heading-height: 48px;
  --formula-panel-height: 168px;
  display: grid;
  grid-template-columns: minmax(0, 0.76fr) minmax(340px, 0.5fr);
  gap: 12px;
  align-items: stretch;
  margin-top: 12px;
}

.visual-panel,
.insight-panel {
  min-width: 0;
  height: var(--teaching-panel-height);
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
}

.chart-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 12px 8px;
}

.insight-panel {
  display: grid;
  grid-template-rows: var(--insight-heading-height) minmax(0, 1fr);
  gap: 8px;
  padding: 12px;
  overflow: hidden;
}

.panel-title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.panel-title-row strong {
  display: block;
  margin-top: 4px;
  font-size: 0.76rem;
  font-weight: 600;
}

.panel-title-row p {
  max-width: 440px;
  margin: 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  color: var(--muted);
  font-size: 0.68rem;
}

.chart-legend span {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--ink);
}

.legend-line {
  width: 18px;
  height: 2px;
  background: var(--accent);
}

.legend-line.residual {
  background: var(--danger);
}

.chart-wrap,
.bar-wrap {
  width: 100%;
  overflow: hidden;
}

.chart-wrap {
  flex: 0 0 var(--chart-area-height);
  display: flex;
  align-items: stretch;
  min-height: 0;
}

.anova-chart {
  display: block;
  width: 100%;
  height: var(--chart-area-height);
  margin-top: 0;
}

.insight-heading {
  min-height: 0;
  overflow: hidden;
}

.model-facts {
  display: grid;
  grid-template-rows: var(--formula-panel-height) repeat(4, minmax(0, 1fr));
  gap: 8px;
  min-height: 0;
  margin: 0;
}

.model-facts div {
  display: grid;
  gap: 4px;
  min-height: 0;
  overflow: hidden;
}

.model-facts dt {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
}

.model-facts dd {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.43;
  overflow: hidden;
}

.formula-panel {
  height: var(--formula-panel-height);
  align-content: start;
  padding: 9px 10px !important;
  border: 1px solid var(--accent-border);
  border-radius: 7px;
  background: var(--accent-soft);
  overflow: hidden;
}

.fact-block {
  align-content: start;
  padding: 0 0 8px;
  border-bottom: 1px solid var(--soft-line);
}

.fact-block:last-child {
  border-bottom: 0;
}

.formula-theory {
  min-height: 2.2em;
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--accent);
  font-size: 0.62rem !important;
  line-height: 1.35 !important;
  overflow-wrap: normal;
  word-break: keep-all;
}

.formula-theory :deep(sub),
.formula-theory :deep(sup) {
  font-size: 0.72em;
  line-height: 0;
}

.formula-param-grid {
  display: grid;
  gap: 4px;
  margin-top: 5px !important;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.62rem !important;
}

.formula-param-row {
  display: grid;
  grid-template-columns: minmax(72px, 0.68fr) minmax(0, 2.6fr);
  gap: 8px;
  align-items: baseline;
}

.formula-row-label {
  color: var(--muted);
  font-family: inherit;
  font-weight: 600;
}

.formula-param-cells {
  display: grid;
  gap: 6px;
  min-width: 0;
  text-align: left;
}

.formula-param-cells span,
.formula-param-cells strong {
  min-width: 0;
  overflow-wrap: normal;
  word-break: keep-all;
}

.formula-param-cells strong {
  color: var(--ink);
  font-weight: 600;
}

.formula-meaning-row {
  color: var(--muted);
  font-size: 0.58rem;
  line-height: 1.25;
}

.formula-meaning-row .formula-param-cells span {
  white-space: pre-line;
}

.insight-panel h2 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.25;
}

.current-change {
  border-top-color: var(--accent-border) !important;
}

.current-change dd {
  color: var(--ink);
  font-weight: 500;
}

.anova-table-wrap h2 {
  margin: 0;
  color: var(--ink);
  font-size: 0.76rem;
  font-weight: 600;
}

.anova-table-wrap {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
}

.anova-table-wrap p,
.empty-table {
  color: var(--muted);
  font-size: 0.68rem;
  line-height: 1.45;
}

.anova-grid {
  display: grid;
  width: 100%;
  margin-top: 8px;
  overflow-x: auto;
  font-size: 0.66rem;
}

.anova-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  min-width: 780px;
}

.anova-row > div {
  min-width: 0;
  padding: 6px 7px;
  border-top: 1px solid var(--soft-line);
  overflow-wrap: anywhere;
}

.anova-head > div {
  color: var(--muted);
  font-weight: 600;
}

.anova-row.is-highlighted > div {
  background: var(--accent-soft);
  color: var(--ink);
  font-weight: 600;
}

.source-cell {
  text-align: left;
}

.number-cell {
  font-variant-numeric: tabular-nums;
  text-align: left;
  white-space: nowrap;
}

.decision-cell {
  text-align: left;
}

.ss-panel {
  margin-top: 12px;
  padding: 10px 12px 8px;
}

.ss-note {
  min-height: 1.45em;
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 0.64rem;
  line-height: 1.4;
}

.ss-hover-note {
  min-height: 2.8em;
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 0.66rem;
  font-weight: 400;
  line-height: 1.4;
}

.ss-chart {
  display: block;
  width: 100%;
  height: auto;
  margin-top: 6px;
  overflow: visible;
}

:deep(.plot-bg) {
  fill: var(--panel);
  stroke: var(--soft-line);
}

:deep(.x-axis path),
:deep(.y-axis path),
:deep(.x-axis line),
:deep(.y-axis line) {
  color: var(--bc-chart-grid);
}

:deep(.x-axis text),
:deep(.y-axis text),
:deep(.axis-label) {
  fill: var(--muted);
  font-size: 0.72rem;
}

:deep(.axis-label) {
  text-anchor: middle;
  font-weight: 600;
}

:deep(.model-line) {
  stroke-width: 2.6;
}

:deep(.residual-line) {
  stroke: var(--danger);
  stroke-width: 1.35;
  stroke-dasharray: 4 4;
  opacity: 0.58;
}

:deep(.observed-point) {
  stroke: var(--bc-bg-surface-solid);
  stroke-width: 1.4;
}

.ss-equation {
  fill: var(--muted);
  font-family: var(--font-sans, inherit);
  font-size: 0.4rem;
  font-weight: 400;
  transition: opacity 120ms ease;
}

.ss-equation.is-hidden-by-hover {
  opacity: 0;
  pointer-events: none;
}

.ss-equation-sub {
  baseline-shift: sub;
  font-size: 0.76em;
}

.ss-segment {
  outline: none;
}

.ss-segment rect {
  opacity: 0.7;
  stroke: color-mix(in srgb, var(--paper) 72%, transparent);
  stroke-width: 0.45;
  transition:
    opacity 160ms ease,
    stroke 160ms ease,
    filter 160ms ease;
}

.ss-segment.is-dimmed rect {
  opacity: 0.3;
}

.ss-segment.is-dimmed.is-highlighted rect,
.ss-segment.is-dimmed.is-hovered rect {
  opacity: 0.9;
}

.ss-segment.is-highlighted rect {
  filter: brightness(1.04) saturate(1.05) drop-shadow(0 0 4px var(--focus-ring));
  opacity: 0.88;
  stroke: color-mix(in srgb, var(--bc-bg-surface-solid) 62%, transparent);
  stroke-width: 0.55;
}

.ss-segment.is-hovered rect {
  filter: brightness(1.08) saturate(1.08) drop-shadow(0 0 6px var(--focus-ring));
  opacity: 0.96;
  stroke: color-mix(in srgb, var(--bc-bg-surface-solid) 78%, transparent);
  stroke-width: 0.65;
}

.ss-segment text {
  fill: var(--bc-text-inverse);
  font-size: 0.37rem;
  font-weight: 400;
  pointer-events: none;
}

.ss-segment .ss-inline-label {
  fill: var(--muted);
  font-size: 0.38rem;
  font-weight: 500;
  opacity: 0.92;
}

.mobile-fit-note {
  display: none;
}

@media (max-width: 1199px) {
  .module-sticky,
  .teaching-grid,
  .parameter-strip {
    grid-template-columns: 1fr;
  }

  .panel-title-row {
    display: grid;
  }

  .chart-legend {
    justify-content: flex-start;
  }

  .visual-panel,
  .insight-panel {
    height: auto;
    min-height: 0;
  }

  .insight-panel,
  .model-facts {
    grid-template-rows: none;
  }

  .chart-wrap {
    flex-basis: auto;
  }

  .anova-chart {
    min-height: 340px;
    height: auto;
  }

  .formula-panel {
    height: auto;
    min-height: 142px;
  }

  .model-facts div,
  .model-facts dd,
  .insight-heading {
    overflow: visible;
  }
}

@media (max-width: 768px) {
  .anova-explorer {
    --mobile-safe-top: max(env(safe-area-inset-top), 12px);
    --mobile-gap-xs: 4px;
    --mobile-gap-sm: 6px;
    --mobile-gap-md: 7px;
    --mobile-control-height: 36px;
    --mobile-switch-height: 36px;
    --mobile-step-height: 88px;
    --mobile-header-control-height: var(--mobile-control-height);
    --mobile-header-control-radius: 11px;
    --mobile-header-control-padding-x: 10px;
    --mobile-header-control-font-size: 0.72rem;
    --mobile-header-control-font-weight: 650;
    --mobile-glass-blur: 16px;
    --mobile-glass-bg: var(--bc-bg-glass);
    --mobile-glass-border: var(--bc-border-subtle);
    --mobile-glass-shadow: var(--bc-shadow-card);
    --mobile-glass-radius: 14px;
    --mobile-header-control-border: var(--mobile-glass-border);
    --mobile-header-control-bg: var(--mobile-glass-bg);
    --mobile-header-control-shadow: var(--mobile-glass-shadow);
    --mobile-section-gap: var(--mobile-gap-md);
    --mobile-header-gap: var(--mobile-section-gap);
    --mobile-sticky-gap: 8px;
    --mobile-slider-height: 24px;
    --mobile-chart-aspect-ratio: 16 / 9;
    --mobile-bar-gap: 0px;
    --mobile-card-radius: 16px;
    --mobile-card-border: var(--bc-border-subtle);
    --mobile-card-bg: var(--bc-bg-glass);
    --mobile-shadow: var(--bc-shadow-card);
    --topbar-sticky-height: 0px;
    display: flex;
    flex-direction: column;
    width: min(100% - 32px, 1360px);
    padding-top: 0;
    padding-bottom: 24px;
  }

  .anova-explorer.is-mobile-decomposition {
    padding-top: 0;
  }

  .explorer-header {
    display: none;
  }

  .module-sticky {
    display: none;
  }

  .tool-topbar {
    display: none;
  }

  .step-group {
    display: none;
  }

  .mobile-sticky-header {
    position: sticky;
    top: 0;
    z-index: 70;
    display: grid;
    gap: var(--mobile-sticky-gap, 8px);
    width: 100%;
    margin-bottom: var(--mobile-sticky-gap, 8px);
    padding-top: var(--mobile-safe-top);
    background: transparent;
    border: 0;
    box-shadow: none;
    backdrop-filter: none;
  }

  .teaching-grid {
    order: 4;
    display: contents;
  }

  .chart-panel {
    order: 4;
    display: flex;
    margin-top: 0;
    padding: 12px;
    border-radius: var(--mobile-card-radius);
    background: var(--mobile-card-bg);
    border: 1px solid var(--mobile-card-border);
    box-shadow: var(--mobile-shadow);
  }

  .panel-title-row {
    gap: 8px;
  }

  .panel-title-row span {
    display: none;
  }

  .panel-title-row strong {
    font-size: 0.82rem;
    line-height: 1.2;
  }

  .chart-legend {
    display: none;
  }

  .parameter-strip {
    order: 5;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--mobile-section-gap);
    margin-top: var(--mobile-section-gap);
    padding: 10px;
    border: 1px solid var(--mobile-card-border);
    border-radius: var(--mobile-card-radius);
    background: var(--mobile-card-bg);
    box-shadow: var(--mobile-shadow);
  }

  .parameter-head {
    grid-column: 1 / -1;
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .parameter-strip label {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 8px;
    align-items: center;
  }

  .parameter-head span,
  .parameter-strip label span {
    font-size: 0.58rem;
    letter-spacing: 0.04em;
  }

  .parameter-strip label output {
    display: block;
    color: var(--accent);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.66rem;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .quiet-button {
    min-height: 26px;
    padding-inline: 8px;
    font-size: 0.66rem;
  }

  .parameter-strip input[type="range"] {
    grid-column: 1 / -1;
    min-height: var(--mobile-slider-height);
    margin: 0;
    accent-color: var(--accent);
  }

  .chart-wrap {
    flex: 0 0 auto;
  }

  .anova-chart {
    height: 178px;
    min-height: 0;
  }

  .insight-panel {
    order: 6;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    height: auto;
    margin-top: var(--mobile-section-gap);
    padding: 12px;
    border-radius: var(--mobile-card-radius);
    background: var(--mobile-card-bg);
    border: 1px solid var(--mobile-card-border);
    box-shadow: var(--mobile-shadow);
  }

  .insight-heading {
    display: none;
  }

  .model-facts {
    order: 2;
    display: block;
    margin: 0;
  }

  .model-facts .fact-block {
    display: none;
  }

  .mobile-fit-note {
    order: 1;
    display: block;
    margin: 0;
    padding: 7px 10px;
    color: var(--accent);
    font-size: 0.68rem;
    line-height: 1.34;
    border: 1px solid var(--accent-border);
    border-radius: 12px;
    background: var(--accent-soft);
  }

  .formula-panel {
    height: auto;
    min-height: 0;
    padding: 10px !important;
    border-radius: 12px;
  }

  .formula-panel dt {
    margin-bottom: 7px;
    font-size: 0.6rem;
  }

  .formula-theory {
    font-size: 0.6rem !important;
    line-height: 1.34 !important;
  }

  .formula-param-grid {
    margin-top: 7px;
    font-size: 0.56rem !important;
  }

  .formula-param-row {
    grid-template-columns: minmax(58px, 0.62fr) minmax(0, 2.6fr);
    gap: 8px;
  }

  .formula-param-cells {
    gap: 8px;
  }

  .is-mobile-fit .mobile-variance-panel,
  .is-mobile-fit .mobile-node-detail,
  .is-mobile-fit .mobile-anova-cards,
  .is-mobile-decomposition .chart-panel,
  .is-mobile-decomposition .parameter-strip,
  .is-mobile-decomposition .insight-panel {
    display: none;
  }

  .ss-panel,
  .anova-table-wrap {
    display: none;
  }

  .model-facts dd {
    font-size: 0.84rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .morph-divider,
  .morph-title,
  h1 {
    transition: none;
  }
}
</style>
