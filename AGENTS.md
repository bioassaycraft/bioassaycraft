# BioassayCraft Agent Notes

## Agent skills

### Issue tracker

Issues are tracked in the BioassayCraft GitHub repository. See `docs/agents/issue-tracker.md`.

### Triage labels

The repository uses the default five-role engineering skill label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

BioassayCraft uses a single-context domain documentation layout. See `docs/agents/domain.md`.

## Interaction and Motion Rules

- When page elements enter, exit, switch, expand, collapse, update numbers, or change state, prefer the shared motion utilities in `src/utils/motion.js` instead of writing one-off transitions.
- Use motion to clarify state and hierarchy. Avoid bounce, rotation, large scale, parallax, or decorative animation that competes with scientific content.
- When explaining terminology, formula parameters, ANOVA table fields, statistical concepts, or pharmacopoeial terms, prefer the shared tooltip / annotation component in `src/components/common/BcTooltip.vue` instead of adding long inline explanations.
- D3 is for bespoke teaching visualizations. The motion utility is for interface state transitions. Do not put all UI animation into D3.
- Tooltip and annotation content should be short, keyboard accessible, and useful on hover, focus, and mobile tap.
- After changing core calculations, run Vitest with `npm run test`. Add or update focused tests when calculation behavior changes.
- Do not change the site's visual temperament simply because motion or tooltip infrastructure exists. BioassayCraft should remain calm, scientific, minimal, and low noise.

## Git Commit Convention

When creating commits, automatically generate a commit message that follows these rules:

- Use the Conventional Commits specification.
- Keep the summary concise and imperative.
- Use one of these types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`, `build`, or `ci`.
- Format the summary as `type(scope): concise summary` or `type: concise summary`.
- Prefer one logical change per commit; separate unrelated modifications whenever practical.

Use a commit body when it adds useful context:

- Explain what changed and why.
- Mention important implementation details when useful.
- Group multiple related changes into bullets.
- Do not simply repeat the summary.

Never use vague summaries such as `update`, `changes`, `misc`, `temp`, `WIP`, `fix bug`, or `commit`.

Examples:

- `feat: add Residual Explorer`
- `fix: resolve mobile navigation overflow`
- `refactor: simplify ANOVA model switching`
