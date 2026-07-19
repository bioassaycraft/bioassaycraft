import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const entries = ["assets", "learn", "journeys", "tools", "simulators", "lessons"];
const viteManagedRoutes = new Set([
  join(root, "learn", "anova-explorer"),
  join(root, "learn", "residual-explorer"),
  join(root, "learn", "ci-explorer"),
  join(root, "tools", "converter"),
  join(root, "tools", "specification-limit-calculator"),
  join(root, "explore"),
  join(root, "tools", "index.html"),
]);

await mkdir(dist, { recursive: true });

for (const entry of entries) {
  await cp(join(root, entry), join(dist, entry), {
    recursive: true,
    force: true,
    errorOnExist: false,
    filter: (source) => !viteManagedRoutes.has(source),
  });
}
