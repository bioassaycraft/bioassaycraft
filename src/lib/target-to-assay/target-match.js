// Identity, direct interaction, and completeness are independent assertions.
const key = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();
const equivalent = new Map([
  ["cd20", "ms4a1"],
  ["pd-1", "pdcd1"],
  ["pd1", "pdcd1"],
  ["bcma", "tnfrsf17"],
  ["b-cell maturation antigen", "tnfrsf17"],
  ["cd3 receptor", "cd3"],
]);
const canonical = (value) => equivalent.get(key(value)) || key(value);
const unique = (items) => [...new Set(items)];
const sameSet = (left, right) => left.size === right.size && [...left].every((id) => right.has(id));

function identityIndex(targets) {
  const ids = new Map();
  const names = new Map();
  const add = (index, value, target) => {
    if (!value) return;
    const label = canonical(value);
    if (!index.has(label)) index.set(label, new Set());
    index.get(label).add(target.id);
  };
  for (const target of targets) {
    if (target.resolutionStatus && target.resolutionStatus !== "resolved") continue;
    for (const value of [
      target.canonicalId,
      target.ensemblId,
      target.hgncId,
      ...(target.ensemblIds || []),
      ...(target.uniprotIds || []),
    ])
      add(ids, value, target);
    for (const value of [
      target.id,
      target.geneSymbol,
      target.label,
      target.canonicalName,
      ...(target.aliases || []),
      ...(target.synonyms || []),
    ])
      add(names, value, target);
  }
  const lookup = (index, value) => {
    const hits = index.get(canonical(value));
    return hits?.size === 1 ? [...hits][0] : null;
  };
  return {
    name: (value) => lookup(names, value),
    raw: (raw) => {
      const id = raw.id?.replace(/^(ENSG\d+)\.\d+$/, "$1");
      const stable = lookup(ids, id);
      const symbol = lookup(names, raw.approvedSymbol);
      // A known stable identifier has precedence over display text.
      if (stable)
        return {
          id: stable,
          basis: "stable_identifier",
          ...(symbol && stable !== symbol ? { alternateSymbolId: symbol } : {}),
        };
      const target = targets.find((item) => item.id === symbol);
      if (id && /^ENSG\d+$/.test(id) && (target?.ensemblId || target?.ensemblIds?.length))
        return { id, basis: "unmapped_identifier" };
      return {
        id: symbol || (canonical(raw.approvedSymbol || id) || "").toUpperCase(),
        basis: symbol ? "entity_alias" : "unmapped_identity",
      };
    },
  };
}

// Only parse closed, positively asserted binding lists. A mention, a study
// keyword, or a downstream effect cannot supply a binding arm.
export function bindingAssertion(text, name) {
  const statement = key(text).replace(/\.$/, "");
  const arity = statement.match(/\b(monospecific|bispecific|trispecific|tetraspecific)\b/);
  const expected =
    { monospecific: 1, bispecific: 2, trispecific: 3, tetraspecific: 4 }[arity?.[1]] ||
    (/\b(?:binds|recognizes)\s+(?:specifically\s+)?(?:only|exclusively)\s+(?:to\s+)?/.test(
      statement,
    )
      ? 1
      : 0);
  if (
    !expected ||
    /\b(not|neither|only predicted|may|might|could|designed to|putative|potentially|payload)\b/.test(
      statement,
    )
  )
    return null;
  const list = statement.match(
    /\b(?:binds|recognizes|directly targets)\s+(?:(?:specifically|only|exclusively)\s+)?(?:to\s+)?(?:(?:both|only|exclusively)\s+)?(.+)$/,
  )?.[1];
  if (!list) return null;
  const normalizedList = list
    .replace(/\s+leading to\b[^.]*$/, "")
    .replace(/\s+\(bcma\)/g, "");
  if (expected === 2) {
    // In label prose, a cell list after “on” can itself contain commas and “and”.
    // Try each explicit conjunction and require exactly one pair of resolved entities.
    const resolve = (arm) => {
      const phrase = arm.replace(/^(?:to\s+)?(?:the\s+)?/, "");
      const location = phrase.match(/^(.+?)\s+(?:expressed\s+)?(?:on|by)\s+([^.]*)$/);
      if (!location) return name(phrase);
      const [, entity, context] = location;
      if (/\b(?:on|by|binds|recognizes)\b/.test(context) ||
        !context.split(/,\s*(?:and\s+)?|\s+and\s+/).every((part) =>
          /(?:\bcells|\btissues|plasmablasts|lymphocytes|cell surface)$/.test(part))) return null;
      return name(entity);
    };
    const candidates = [...normalizedList.matchAll(/\s+and\s+/g)].flatMap((join) => {
      const left = resolve(normalizedList.slice(0, join.index).replace(/,$/, ""));
      const right = resolve(normalizedList.slice(join.index + join[0].length));
      return left && right && left !== right ? [[left, right]] : [];
    });
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) return null;
  }
  const arms = normalizedList
    .replace(/, including [\w -]+(?=,? and |$)/g, "")
    .split(/,\s*(?:and\s+)?|\s+and\s+|\s*×\s*/);
  const targetIds = arms.map((arm) =>
    name(
      arm
        .replace(/^(?:to\s+)?(?:the\s+)?/, "")
        .replace(/\s+expressed (?:on|by) (?:the surface of )?[\w -]+$/, ""),
    ),
  );
  return targetIds.length === expected &&
    targetIds.every(Boolean) &&
    unique(targetIds).length === expected
    ? targetIds
    : null;
}

export function prepareTargetMatch(drug, targets) {
  const index = identityIndex(targets);
  const canonicalId = (id) => index.name(id) || canonical(id).toUpperCase();
  const related = new Set((drug.proposedTargetIds || []).map(canonicalId));
  const records = drug.targetEvidence || [];
  const normalized = records.map((record) => {
    const raw = (record.rawTargets || []).map((target) => ({ raw: target, ...index.raw(target) }));
    const explicit = index.name(record.targetName);
    const complex = targets.find(({ id, subunits }) => id === explicit && subunits?.length);
    const validComplex =
      complex &&
      raw.every(({ raw: t }) =>
        complex.subunits.some((subunit) => key(subunit) === key(t.approvedSymbol)),
      );
    const targetIds = validComplex
      ? [explicit]
      : unique(
          [...(record.targetIds || []).map(canonicalId), ...raw.map(({ id }) => id)].filter(
            Boolean,
          ),
        );
    const asserted =
      record.role !== "payload" &&
      record.role !== "indirect" &&
      record.allowBindingAssertion &&
      bindingAssertion(record.text, index.name);
    if (asserted) {
      // A drug-level binding claim can explain provider encodings at subunit level.
      for (const id of asserted) {
        const entity = targets.find((target) => target.id === id);
        if (!entity?.subunits?.length) continue;
        for (const mapping of raw) {
          if (
            mapping.basis === "unmapped_identifier" ||
            !entity.subunits.some((subunit) => key(subunit) === key(mapping.raw.approvedSymbol))
          )
            continue;
          mapping.id = id;
          mapping.basis = "explicit_complex_binding";
        }
      }
    }
    return {
      ...record,
      role: asserted ? "direct" : record.role,
      mappings: raw.map((entry) =>
        validComplex ? { ...entry, id: explicit, basis: "source_named_complex" } : entry,
      ),
      normalizedTargetIds: asserted ? unique([...asserted, ...raw.map(({ id }) => id)]) : targetIds,
      assertedTargetIds: asserted || undefined,
      complete: Boolean(asserted || record.complete),
    };
  });
  // Reconcile positive, drug-specific complex evidence with encodings from
  // other rows for the same drug. Retain evidence explicitly naming a subunit.
  const adc =
    /antibody[ -]+drug conjugate|\badc\b/i.test(drug.molecularFormat || "") ||
    normalized.some((row) => /antibody[ -]+drug conjugate|\badc\b/i.test(row.text || ""));
  for (const row of normalized) {
    if (
      adc &&
      row.role === "direct" &&
      !row.complete &&
      /^(?:INHIBITOR|BLOCKER|ACTIVATOR|AGONIST|ANTAGONIST)$/i.test(row.actionType || "") &&
      !/\b(?:antigen|antibody (?:binds|recognizes))\b/i.test(row.text || "")
    )
      row.role = "unverified";
  }
  const namedComplexes = new Set(
    normalized
      .filter((row) => row.role === "direct")
      .flatMap((row) => row.normalizedTargetIds)
      .filter((id) => targets.some((target) => target.id === id && target.subunits?.length)),
  );
  for (const row of normalized) {
    if (row.complete || row.role !== "direct" || row.sourceType !== "open_targets") continue;
    for (const mapping of row.mappings) {
      const complexes = targets.filter(
        ({ id, subunits }) =>
          namedComplexes.has(id) &&
          subunits.some((symbol) => key(symbol) === key(mapping.raw.approvedSymbol)),
      );
      if (complexes.length !== 1) continue;
      // Keep a separately requested subunit distinct; an unrequested
      // component annotation may instead describe the epitope of this arm.
      if (
        mapping.basis === "unmapped_identifier" ||
        targets.some(({ id }) => id === mapping.id) ||
        /\b(?:separate|independent)\s+(?:binding|arm|site)\b/i.test(row.text || "")
      )
        continue;
      row.normalizedTargetIds = unique(
        row.normalizedTargetIds.map((id) => (id === mapping.id ? complexes[0].id : id)),
      );
      mapping.id = complexes[0].id;
      mapping.basis = "drug_specific_complex_evidence";
    }
  }
  const direct = new Set();
  const complete = [];
  const actions = new Map();
  const conflicts = new Set();
  for (const row of normalized) {
    for (const id of row.normalizedTargetIds) related.add(id);
    if (row.role !== "direct") continue;
    if (row.complete && row.normalizedTargetIds.length)
      complete.push(new Set(row.assertedTargetIds || row.normalizedTargetIds));
    for (const id of row.normalizedTargetIds) {
      direct.add(id);
      const prior = actions.get(id) || [];
      const action = row.actionType?.toUpperCase();
      if (
        prior.some(
          (other) =>
            other.source !== row.sourceType &&
            ((other.action === "AGONIST" && action === "ANTAGONIST") ||
              (other.action === "ANTAGONIST" && action === "AGONIST")),
        )
      )
        conflicts.add(id);
      prior.push({ action, source: row.sourceType });
      actions.set(id, prior);
    }
  }
  if (!drug.targetEvidence) {
    for (const value of drug.targetIds || []) {
      const id = canonicalId(value);
      related.add(id);
      if (drug.verification !== "imported") direct.add(id);
    }
    // Legacy reviewed catalog rows intentionally enumerate their match scope.
    if (drug.verification !== "imported" && drug.targetSetComplete !== false && direct.size)
      complete.push(new Set(direct));
  }
  const incompatible = complete.some((scope) => !sameSet(scope, direct));
  return { direct, related, complete, conflicts, incompatible, evidence: normalized };
}

export function classifyTargetMatch(prepared, targetIds) {
  const { direct, related, complete, conflicts, incompatible, evidence } = prepared;
  const requested = new Set(targetIds);
  const supported = targetIds.filter((id) => direct.has(id));
  if (!supported.length && !targetIds.some((id) => related.has(id))) return null;
  const extra = [...direct].filter((id) => !requested.has(id));
  const classified = (state, reason) => ({ state, reason, supported, extra });
  if (targetIds.some((id) => conflicts.has(id)) || (incompatible && supported.length))
    return classified("conflict", "inconsistent_direct_evidence");
  if (complete.some((scope) => sameSet(scope, requested)))
    return classified("verified", "documented_complete_scope");
  if (supported.length && supported.length < requested.size)
    return classified("partial", "missing_direct_target_evidence");
  if (extra.length && supported.length) return classified("other", "additional_direct_targets");
  if (
    !supported.length &&
    evidence.some(
      (row) =>
        ["payload", "indirect"].includes(row.role) &&
        row.normalizedTargetIds.some((id) => requested.has(id)),
    )
  )
    return classified("other", "non_direct_relationship");
  return classified(
    "unverified",
    supported.length ? "scope_not_established" : "no_direct_evidence",
  );
}
