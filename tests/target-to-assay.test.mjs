import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { catalog } from "../src/lib/target-to-assay/catalog.js";
import {
  generateCombinations,
  resolveTargets,
  searchDrugs,
} from "../src/lib/target-to-assay/search.js";
import worker from "../worker.js";

// Node 20 is still supported by the app; its runtime has no built-in SQLite.
const { DatabaseSync } = await import("node:sqlite").catch(() => ({}));

describe("target-to-assay search", () => {
  it("normalizes case, width, supported separators, aliases and duplicate targets", () => {
    expect(resolveTargets("ＣＤ３, cd19，CD20 × CD3 complex").map((t) => t.id)).toEqual([
      "CD3",
      "CD19",
      "CD20",
    ]);
  });
  it("generates all seven stable non-empty combinations", () => {
    expect(generateCombinations(resolveTargets("CD20×CD3×CD19")).map((c) => c.key)).toEqual([
      "CD3",
      "CD19",
      "CD20",
      "CD3|CD19",
      "CD3|CD20",
      "CD19|CD20",
      "CD3|CD19|CD20",
    ]);
  });
  it("matches whole target sets and deduplicates drugs across combinations", () => {
    const result = searchDrugs({ targets: "CD3×CD19×CD20" });
    expect(result.drugs).toHaveLength(3);
    expect(result.combinations.map((c) => c.matches.length)).toEqual([3, 1, 2, 1, 2, 0, 0]);
    expect(result.combinations[0].matches[0].matchType).toBe("superset");
    expect(result.sourceStatus).toMatchObject({ FDA: "partial", EMA: "not_connected" });
  });
  it("exact matching excludes drugs with additional targets", () => {
    const result = searchDrugs({ targets: "CD3×CD19×CD20", matchMode: "exact" });
    expect(result.combinations.map((c) => c.matches.length)).toEqual([0, 0, 0, 1, 2, 0, 0]);
  });
  it("filters names, verification and agency without inventing coverage", () => {
    expect(searchDrugs({ targets: "CD3", query: "blincyto" }).drugs.map((d) => d.id)).toEqual([
      "blinatumomab",
    ]);
    expect(searchDrugs({ targets: "CD3", agency: "EMA" }).drugs).toEqual([]);
    expect(searchDrugs({ targets: "CD3", verification: "verified" }).drugs).toEqual([]);
    expect(() => searchDrugs({ targets: "CD3", matchMode: "anything" })).toThrow("invalid_filters");
  });
  it("does not equate CD3 to a subunit or infer targets from non-target text", () => {
    expect(() => resolveTargets("CD3E")).toThrow("unknown_target");
    expect(() => resolveTargets("CD30")).toThrow("unknown_target");
    expect(() => resolveTargets(" , ")).toThrow("empty_targets");
    expect(() => resolveTargets([null])).toThrow("invalid_targets");
  });
  it("rejects ambiguous aliases and more than eight distinct targets", () => {
    const fixture = {
      targets: Array.from({ length: 9 }, (_, i) => ({
        id: `T${i}`,
        label: `T${i}`,
        aliases: ["ambiguous"],
      })),
    };
    expect(() => resolveTargets("ambiguous", fixture)).toThrow("ambiguous_target");
    expect(() =>
      resolveTargets(
        fixture.targets.map((t) => t.id),
        fixture,
      ),
    ).toThrow("too_many_targets");
    expect(() => generateCombinations(fixture.targets)).toThrow("invalid_targets");
  });
  it("all starter facts reference a reviewed official source", () => {
    for (const drug of catalog.drugs) {
      const source = catalog.sources.find((s) => s.id === drug.sourceId);
      expect(new URL(source.url).hostname).toBe("www.accessdata.fda.gov");
      expect(source.checkedAt).toBeTruthy();
      expect(source.verification).toBe("reviewed");
      expect(drug.targetIds.every((id) => catalog.targets.some((t) => t.id === id))).toBe(true);
    }
  });
});

describe("target-to-assay Worker interface", () => {
  const call = (path, options = {}) =>
    worker.fetch(new Request(`https://bioassaycraft.com/api/v1/target-to-assay/${path}`, options), {
      ASSETS: {
        fetch: () => {
          throw new Error("API leaked to assets");
        },
      },
    });
  const post = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  it("serves search, metadata, resolution and individual evidence", async () => {
    const response = await call("search", post({ targets: ["CD3", "CD19", "CD20"] }));
    expect(response.status).toBe(200);
    expect((await response.json()).combinations).toHaveLength(7);
    expect((await (await call("meta")).json()).mode).toBe("starter_catalog");
    expect(
      (await (await call("resolve", post({ targets: "CD3" }))).json()).resolvedTargets,
    ).toHaveLength(1);
    expect((await (await call("drugs/blinatumomab")).json()).source.url).toContain("fda.gov");
  });
  it("returns JSON errors for invalid input, paths and methods", async () => {
    expect((await call("search")).status).toBe(405);
    expect((await call("missing")).status).toBe(404);
    expect((await call("drugs/missing")).status).toBe(404);
    expect((await call("search", { method: "POST", body: "{}" })).status).toBe(415);
    expect((await call("search", { ...post({}), body: "{" })).status).toBe(400);
    expect((await call("search", post({ targets: "invalid" }))).status).toBe(422);
    expect((await call("search", post({ targets: "x".repeat(9000) }))).status).toBe(413);
  });
});

describe("initial relational migration", () => {
  it.skipIf(!DatabaseSync)(
    "applies to SQLite and enforces evidence, membership and approval uniqueness",
    () => {
      const db = new DatabaseSync(":memory:");
      try {
        db.exec("PRAGMA foreign_keys = ON");
        db.exec(
          readFileSync(
            new URL("../migrations/target-to-assay/0001_initial.sql", import.meta.url),
            "utf8",
          ),
        );
        expect(() =>
          db
            .prepare("INSERT INTO targets VALUES (?, ?, ?, ?)")
            .run("CD3", "CD3", "complex", "missing"),
        ).toThrow();
        for (const s of catalog.sources)
          db.prepare("INSERT INTO sources VALUES (?, ?, ?, ?, ?, ?)").run(
            s.id,
            s.title,
            s.url,
            s.locator,
            s.checkedAt,
            s.verification,
          );
        for (const t of catalog.targets)
          db.prepare("INSERT INTO targets VALUES (?, ?, ?, ?)").run(
            t.id,
            t.label,
            t.kind,
            t.sourceId,
          );
        for (const d of catalog.drugs) {
          db.prepare("INSERT INTO drugs VALUES (?, ?, ?, ?, ?, ?)").run(
            d.id,
            d.name,
            d.brand,
            d.verification,
            d.updatedAt,
            d.sourceId,
          );
          for (const id of d.targetIds)
            db.prepare("INSERT INTO drug_targets VALUES (?, ?, ?, ?)").run(
              d.id,
              id,
              "direct_binding",
              d.sourceId,
            );
          db.prepare("INSERT INTO approvals VALUES (?, ?, ?, ?, ?, ?, ?)").run(
            d.id,
            d.id,
            d.approval.agency,
            d.approval.identifier,
            d.approval.status,
            d.approval.initialYear,
            d.sourceId,
          );
        }
        expect(
          db
            .prepare(
              "SELECT drug_id FROM drug_targets WHERE target_id IN ('CD3', 'CD19') GROUP BY drug_id HAVING count(*) = 2",
            )
            .all()
            .map((r) => r.drug_id),
        ).toEqual(["blinatumomab"]);
        expect(() =>
          db.exec("INSERT INTO drug_targets SELECT * FROM drug_targets LIMIT 1"),
        ).toThrow();
        expect(() =>
          db.exec(
            "INSERT INTO approvals SELECT id || '-duplicate', drug_id, agency, identifier, status, initial_year, source_id FROM approvals LIMIT 1",
          ),
        ).toThrow();
        expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      } finally {
        db.close();
      }
    },
  );
});
