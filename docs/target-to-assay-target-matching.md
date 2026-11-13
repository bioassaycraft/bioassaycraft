# Target-to-Assay: drug scope verification

The live page uses `verified_scope` for both its main result and its candidate table. Offline starter records retain their reviewed scope. The legacy catalogue API still accepts its historical matching modes; `recorded_exact` uses evidence classification for a live evidence catalogue.

## Audit

- Open Targets discovery started at a resolved protein or a complex's discovery gene. The converter discarded Ensembl target IDs and the mechanism's target name, pooled the approved symbols, and overwrote earlier copies of the same ChEMBL drug. CD3E therefore could not satisfy CD3, and sparse or disjoint rows could be lost.
- The main list required the query to be a subset of one reported mechanism for multi-target searches. `recorded_exact` also required the union's raw cardinality to equal the query's and rejected explicit incompleteness for multiple targets, while allowing a singleton with unknown completeness.
- ChEMBL discovery only fetched mechanisms for selected targets. Its union could never establish the whole drug scope, but the merge also ignored otherwise useful direct relationships when a prior record was marked complete. Component identity, mechanism references and direct-interaction flags are retained separately now.
- ClinicalTrials.gov previously reconciled intervention names and stages. Trial keywords still do not count as binding evidence. A uniquely reconciled intervention description can contribute an explicit binding statement.
- Open Targets' discovery field accepts no paging arguments; count versus returned rows remains visible. ChEMBL fetches up to two pages per request and reports truncation/failed continuations. Named trials retain their bounded first page; label review checks up to eight relevant approved candidates, and drug-level ChEMBL review checks up to 24. Review timeouts/failures do not erase discovery results.

## Decision

`targetEvidence` retains provider assertions and references. `normalizedTargetEvidence` adds mapped IDs, mapping bases and roles. Stable gene identifiers take precedence over symbol display text. Aliases must identify one resolved entity. Protein complex membership helps discovery but cannot supply an interaction; a source must name the complex and support that interaction, or a drug-level binding assertion must make the complex explicit. ChEMBL complex records can be mapped by type and verified component accessions. Ligands, receptors, and families are separate entities.

An exact scope needs explicit completeness: a previously reviewed scope, or a positive, closed binding statement with a declared specificity that resolves to distinct targets. Additional confirmed direct targets or opposing functional action assertions block promotion when they contradict the documented scope. Referenced provider MoA text, identity-matched FDA structured labels, and reconciled clinical intervention descriptions all use the same deterministic binding rule. Two independent positive rows can prove two direct interactions but do not prove they are the complete scope. A binding statement does not establish functional agonism or antagonism.

The result exposes per-combination candidate state, reason, supported IDs and additional direct IDs. Records may remain candidates because one arm lacks direct evidence, scope is open, the evidence only concerns a payload or downstream entity, the drug identity is ambiguous, or sources conflict. Provider coverage and drug-specific FDA checks identify failed or skipped reviews. Trial-only interventions without a unique identity remain separate trial candidates.

## Limits

This is bounded evidence matching. Free-form descriptions outside the recognized assertion patterns, sources without stable identity or usable target metadata, and provider truncation can still leave true matches as candidates. EMA/NMPA links and existing reviewed records remain available; the runtime does not automatically read arbitrary regulatory PDFs or external mechanism reference URLs. No new database, AI, or external reference crawler is used.
