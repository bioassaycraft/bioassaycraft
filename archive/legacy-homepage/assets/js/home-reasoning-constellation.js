(function () {
  const container = document.querySelector("#reasoning-constellation");
  const note = document.querySelector("#constellation-note");
  const moduleCards = document.querySelectorAll("[data-constellation-group]");

  if (!container || !note) {
    return;
  }

  const defaultNote =
    "BioassayCraft connects rules, models, artifacts, and practical decisions without turning the homepage into a dashboard.";

  const groupNotes = {
    learn: "Learn explains what the rule means and why the calculation behaves this way.",
    journeys:
      "Journeys translate regulatory and statistical logic into staged project decisions.",
    tools:
      "Tools answer focused scientific questions while keeping assumptions visible.",
  };

  const nodes = [
    {
      id: "reasoning",
      label: "Bioassay reasoning",
      type: "center",
      group: "center",
      x: 0.5,
      y: 0.48,
      mx: 0.5,
      my: 0.12,
      note:
        "Bioassay reasoning connects the rule, the statistical model, the experimental design, and the practical decision.",
    },
    {
      id: "learn",
      label: "Learn",
      type: "group",
      group: "learn",
      x: 0.23,
      y: 0.24,
      mx: 0.5,
      my: 0.28,
      href: "/learn/",
      note: groupNotes.learn,
    },
    {
      id: "journeys",
      label: "Journeys",
      type: "group",
      group: "journeys",
      x: 0.77,
      y: 0.25,
      mx: 0.5,
      my: 0.54,
      href: "/journeys/",
      note: groupNotes.journeys,
    },
    {
      id: "tools",
      label: "Tools",
      type: "group",
      group: "tools",
      x: 0.52,
      y: 0.78,
      mx: 0.5,
      my: 0.8,
      href: "/tools/",
      note: groupNotes.tools,
    },
    {
      id: "usp1032",
      label: "USP <1032>",
      type: "item",
      group: "learn",
      x: 0.12,
      y: 0.12,
      mx: 0.27,
      my: 0.23,
      mobile: false,
      note: "Method development starts by clarifying the analytical target and intended decision.",
    },
    {
      id: "usp1033",
      label: "USP <1033>",
      type: "item",
      group: "learn",
      x: 0.16,
      y: 0.34,
      mx: 0.28,
      my: 0.33,
      note: "Validation reasoning asks whether accuracy and precision support the reportable result.",
    },
    {
      id: "usp1034",
      label: "USP <1034>",
      type: "item",
      group: "learn",
      x: 0.32,
      y: 0.1,
      mx: 0.72,
      my: 0.23,
      note: "Bioassay analysis depends on model assumptions, residuals, and variance decomposition.",
    },
    {
      id: "chp9401",
      label: "ChP 9401",
      type: "item",
      group: "learn",
      x: 0.34,
      y: 0.35,
      mx: 0.72,
      my: 0.33,
      mobile: false,
      note: "Pharmacopoeial terminology should be mapped carefully before comparing formulas.",
    },
    {
      id: "ep53",
      label: "EP 5.3",
      type: "item",
      group: "learn",
      x: 0.1,
      y: 0.48,
      mx: 0.5,
      my: 0.4,
      mobile: false,
      note: "Statistical requirements become useful when the underlying assumptions are visible.",
    },
    {
      id: "method-development",
      label: "Method development",
      type: "item",
      group: "journeys",
      x: 0.66,
      y: 0.12,
      mx: 0.26,
      my: 0.5,
      note: "A development journey turns method intent into experimental choices and readiness evidence.",
    },
    {
      id: "method-validation",
      label: "Method validation",
      type: "item",
      group: "journeys",
      x: 0.9,
      y: 0.18,
      mx: 0.74,
      my: 0.5,
      note: "Validation is a staged argument about evidence, risk, and reportable-result reliability.",
    },
    {
      id: "data-analysis",
      label: "Data analysis",
      type: "item",
      group: "journeys",
      x: 0.86,
      y: 0.38,
      mx: 0.26,
      my: 0.6,
      note: "Data analysis connects model choice, variance, suitability, and scientific judgement.",
    },
    {
      id: "system-suitability",
      label: "System suitability",
      type: "item",
      group: "journeys",
      x: 0.68,
      y: 0.42,
      mx: 0.74,
      my: 0.6,
      mobile: false,
      note: "Suitability rules should support the assay decision rather than become isolated checks.",
    },
    {
      id: "concentration",
      label: "Concentration",
      type: "item",
      group: "tools",
      x: 0.26,
      y: 0.7,
      mx: 0.28,
      my: 0.74,
      href: "/tools/concentration-converter/",
      mobile: false,
      note: "Unit conversion is a practical step, but assumptions and units still need to stay visible.",
    },
    {
      id: "sample-size",
      label: "Sample size",
      type: "item",
      group: "tools",
      x: 0.39,
      y: 0.9,
      mx: 0.28,
      my: 0.86,
      href: "/tools/validation-sample-size-calculator/",
      note: "Sample size depends on accepted accuracy, expected variability, confidence, and power.",
    },
    {
      id: "oos-risk",
      label: "OOS risk",
      type: "item",
      group: "tools",
      x: 0.55,
      y: 0.62,
      mx: 0.72,
      my: 0.74,
      href: "/tools/oos-risk-explorer/",
      note: "OOS risk is the tail area created by bias, precision, and specification limits.",
    },
    {
      id: "anova",
      label: "ANOVA",
      type: "item",
      group: "tools",
      x: 0.71,
      y: 0.88,
      mx: 0.72,
      my: 0.86,
      href: "/simulators/anova-model-comparison/",
      note: "ANOVA helps separate variance structure from model mismatch and residual behavior.",
    },
    {
      id: "validation-simulator",
      label: "Validation simulator",
      type: "item",
      group: "tools",
      x: 0.84,
      y: 0.66,
      mx: 0.5,
      my: 0.92,
      href: "/simulators/validation-simulator/",
      mobile: false,
      note: "Simulation makes validation assumptions visible before they become project decisions.",
    },
  ];

  const links = [
    { source: "learn", target: "reasoning", group: "learn", label: "explains rules" },
    {
      source: "journeys",
      target: "reasoning",
      group: "journeys",
      label: "applies rules",
    },
    { source: "tools", target: "reasoning", group: "tools", label: "calculates questions" },
    { source: "learn", target: "usp1032", group: "learn" },
    { source: "learn", target: "usp1033", group: "learn" },
    { source: "learn", target: "usp1034", group: "learn" },
    { source: "learn", target: "chp9401", group: "learn" },
    { source: "learn", target: "ep53", group: "learn" },
    { source: "journeys", target: "method-development", group: "journeys" },
    { source: "journeys", target: "method-validation", group: "journeys" },
    { source: "journeys", target: "data-analysis", group: "journeys" },
    { source: "journeys", target: "system-suitability", group: "journeys" },
    { source: "tools", target: "concentration", group: "tools" },
    { source: "tools", target: "sample-size", group: "tools" },
    { source: "tools", target: "oos-risk", group: "tools" },
    { source: "tools", target: "anova", group: "tools" },
    { source: "tools", target: "validation-simulator", group: "tools" },
    { source: "usp1033", target: "method-validation", group: "journeys", subtle: true },
    { source: "oos-risk", target: "method-validation", group: "tools", subtle: true },
    { source: "usp1034", target: "anova", group: "tools", subtle: true },
  ];

  if (!window.d3) {
    container.classList.add("is-fallback");
    return;
  }

  const d3 = window.d3;
  let activeGroup = null;
  let activeNodeId = null;
  let svg;
  let nodeSelection;
  let linkSelection;
  let labelSelection;
  let edgeLabelSelection;
  let visibleNodes = [];
  let visibleLinks = [];
  let visibleNodeIds = new Set();

  const getVisibleNodes = (isMobile) =>
    nodes.filter((node) => !isMobile || node.type !== "item" || node.mobile !== false);

  const getPoint = (node, width, height, isMobile) => ({
    x: (isMobile ? node.mx : node.x) * width,
    y: (isMobile ? node.my : node.y) * height,
  });

  const getNeighbors = (nodeId) => {
    const neighbors = new Set([nodeId]);

    visibleLinks.forEach((link) => {
      if (link.source === nodeId) neighbors.add(link.target);
      if (link.target === nodeId) neighbors.add(link.source);
    });

    return neighbors;
  };

  const getActiveIds = () => {
    if (activeNodeId) return getNeighbors(activeNodeId);
    if (activeGroup) {
      return new Set(
        visibleNodes
          .filter((node) => node.group === activeGroup || node.id === "reasoning")
          .map((node) => node.id),
      );
    }
    return new Set();
  };

  const setNote = (text) => {
    note.textContent = text || defaultNote;
  };

  const setActiveGroup = (group) => {
    activeGroup = group;
    activeNodeId = null;
    setNote(groupNotes[group] || defaultNote);
    updateState();
  };

  const setActiveNode = (node) => {
    activeNodeId = node.id;
    activeGroup = node.group === "center" ? null : node.group;
    setNote(node.note || groupNotes[node.group] || defaultNote);
    updateState();
  };

  const clearActive = () => {
    activeGroup = null;
    activeNodeId = null;
    setNote(defaultNote);
    updateState();
  };

  const isLinkActive = (link, activeIds) => {
    if (activeNodeId) return activeIds.has(link.source) && activeIds.has(link.target);
    if (activeGroup) {
      return link.group === activeGroup || link.source === activeGroup || link.target === activeGroup;
    }
    return !link.subtle;
  };

  const updateState = () => {
    if (!nodeSelection || !linkSelection) return;

    const activeIds = getActiveIds();
    const hasActive = Boolean(activeGroup || activeNodeId);

    nodeSelection
      .classed("is-active", (node) =>
        activeNodeId ? node.id === activeNodeId : Boolean(activeGroup && node.group === activeGroup),
      )
      .classed("is-neighbor", (node) =>
        activeNodeId ? activeIds.has(node.id) && node.id !== activeNodeId : node.id === "reasoning",
      )
      .classed("is-dim", (node) => hasActive && !activeIds.has(node.id));

    linkSelection
      .classed("is-active", (link) => isLinkActive(link, activeIds))
      .classed("is-dim", (link) => hasActive && !isLinkActive(link, activeIds));

    edgeLabelSelection
      .attr("opacity", (link) => (!hasActive || isLinkActive(link, activeIds) ? 1 : 0.18));

    moduleCards.forEach((card) => {
      card.classList.toggle(
        "is-constellation-active",
        Boolean(activeGroup && card.dataset.constellationGroup === activeGroup),
      );
    });
  };

  const draw = () => {
    const bounds = container.getBoundingClientRect();
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const width = Math.max(320, Math.round(bounds.width));
    const height = isMobile ? 420 : 360;
    const nodeById = new Map();

    visibleNodes = getVisibleNodes(isMobile).map((node) => {
      const point = getPoint(node, width, height, isMobile);
      const nextNode = { ...node, ...point };
      nodeById.set(nextNode.id, nextNode);
      return nextNode;
    });

    visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

    visibleLinks = links
      .filter((link) => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target))
      .map((link) => ({
        ...link,
        sourceNode: nodeById.get(link.source),
        targetNode: nodeById.get(link.target),
      }));

    container.classList.add("is-ready");
    container.replaceChildren();

    svg = d3
      .select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .attr("aria-hidden", "true");

    const linkGroup = svg.append("g").attr("class", "constellation-links");
    const labelGroup = svg.append("g").attr("class", "constellation-edge-labels");
    const nodeGroup = svg.append("g").attr("class", "constellation-nodes");

    linkSelection = linkGroup
      .selectAll("path")
      .data(visibleLinks)
      .join("path")
      .attr("class", (link) => `constellation-link${link.label ? " is-primary" : ""}`)
      .attr("d", (link) => {
        const x1 = link.sourceNode.x;
        const y1 = link.sourceNode.y;
        const x2 = link.targetNode.x;
        const y2 = link.targetNode.y;
        const dx = (x2 - x1) * 0.28;
        return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
      })
      .attr("opacity", (link) => (link.subtle ? 0.22 : 1));

    edgeLabelSelection = labelGroup
      .selectAll("text")
      .data(visibleLinks.filter((link) => link.label && !isMobile))
      .join("text")
      .attr("class", "constellation-edge-label")
      .attr("x", (link) => (link.sourceNode.x + link.targetNode.x) / 2)
      .attr("y", (link) => (link.sourceNode.y + link.targetNode.y) / 2 - 8)
      .attr("text-anchor", "middle")
      .text((link) => link.label);

    nodeSelection = nodeGroup
      .selectAll("g")
      .data(visibleNodes)
      .join("g")
      .attr("class", (node) => `constellation-node${node.href ? " is-link" : ""}`)
      .attr("data-type", (node) => node.type)
      .attr("data-group", (node) => node.group)
      .attr("tabindex", "0")
      .attr("role", (node) => (node.href ? "link" : "button"))
      .attr("aria-label", (node) => node.label)
      .attr("transform", (node) => `translate(${node.x},${node.y})`)
      .on("mouseenter", function (_event, node) {
        setActiveNode(node);
      })
      .on("focus", function (_event, node) {
        setActiveNode(node);
      })
      .on("mouseleave", clearActive)
      .on("blur", clearActive)
      .on("click", function (_event, node) {
        if (node.href) {
          window.location.href = node.href;
        } else {
          setActiveNode(node);
        }
      })
      .on("keydown", function (event, node) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (node.href) {
          window.location.href = node.href;
        } else {
          setActiveNode(node);
        }
      });

    nodeSelection
      .append("circle")
      .attr("class", "constellation-dot")
      .attr("r", (node) => {
        if (node.type === "center") return isMobile ? 7 : 8;
        if (node.type === "group") return isMobile ? 6 : 6.5;
        return isMobile ? 4.2 : 4.6;
      });

    labelSelection = nodeSelection
      .append("text")
      .attr("class", "constellation-label")
      .attr("x", (node) => {
        if (node.type === "center") return 0;
        if (isMobile) return 0;
        return node.x < width * 0.5 ? -12 : 12;
      })
      .attr("y", (node) => {
        if (node.type === "center") return -16;
        if (isMobile) return -12;
        return 4;
      })
      .attr("text-anchor", (node) => {
        if (node.type === "center" || isMobile) return "middle";
        return node.x < width * 0.5 ? "end" : "start";
      })
      .text((node) => node.label);

    updateState();
  };

  moduleCards.forEach((card) => {
    const group = card.dataset.constellationGroup;
    card.addEventListener("mouseenter", () => setActiveGroup(group));
    card.addEventListener("focus", () => setActiveGroup(group));
    card.addEventListener("mouseleave", clearActive);
    card.addEventListener("blur", clearActive);
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(draw, 120);
  });

  setNote(defaultNote);
  draw();
})();
