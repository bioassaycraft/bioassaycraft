# BioassayCraft Agent Notes

## Interaction and Motion Rules

- When page elements enter, exit, switch, expand, collapse, update numbers, or change state, prefer the shared motion utilities in `src/utils/motion.js` instead of writing one-off transitions.
- Use motion to clarify state and hierarchy. Avoid bounce, rotation, large scale, parallax, or decorative animation that competes with scientific content.
- When explaining terminology, formula parameters, ANOVA table fields, statistical concepts, or pharmacopoeial terms, prefer the shared tooltip / annotation component in `src/components/common/BcTooltip.vue` instead of adding long inline explanations.
- D3 is for bespoke teaching visualizations. The motion utility is for interface state transitions. Do not put all UI animation into D3.
- Tooltip and annotation content should be short, keyboard accessible, and useful on hover, focus, and mobile tap.
- After changing core calculations, run Vitest with `npm run test`. Add or update focused tests when calculation behavior changes.
- Do not change the site's visual temperament simply because motion or tooltip infrastructure exists. BioassayCraft should remain calm, scientific, minimal, and low noise.
