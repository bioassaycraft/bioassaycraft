import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const entries = [
  "assets",
  "learn",
  "journeys",
  "tools",
  "simulators",
  "lessons",
];

await mkdir(dist, { recursive: true });

for (const entry of entries) {
  await cp(join(root, entry), join(dist, entry), {
    recursive: true,
    force: true,
    errorOnExist: false,
  });
}
