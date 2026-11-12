import { expect, it } from "vitest";
import { rankMatches } from "../src/lib/target-to-assay/research.js";
import {
  fetchEmaApprovals,
  reviewedFdaRecord,
} from "../src/lib/target-to-assay/approval-records.js";
import { fetchFdaDocuments } from "../src/lib/target-to-assay/evidence.js";

it("orders the existing group by original date, stage and canonical name regardless of input order", () => {
  const records = {
    a: { name: "Zeta", stage: "APPROVAL", date: "2019-01-01" },
    b: { name: "Alpha", stage: "APPROVAL", date: "2019-01-01" },
    c: { name: "Other", stage: "APPROVAL", date: "2020-02-31" },
    d: { name: "Beta", stage: "PHASE_2_3" },
    e: { name: "Alpha", stage: "PHASE_2_3" },
    f: { name: "Filing", stage: "FILED" },
    g: { name: "Unknown" },
    h: { name: "Early", stage: "PRECLINICAL" },
    i: { name: "Stopped", stage: "TERMINATED" },
    j: { name: "Reported", stage: "REPORTED_APPROVAL" },
  };
  const matches = Object.keys(records).map((drugId) => ({
    drugId,
    matchType: drugId === "a" ? "exact" : "reported",
  }));
  for (const input of [matches, [...matches].reverse()]) {
    expect(rankMatches(input, records).map(({ drugId }) => drugId)).toEqual([
      "b",
      "a",
      "c",
      "j",
      "f",
      "e",
      "d",
      "h",
      "g",
      "i",
    ]);
  }
});

it("uses EMA original authorisation and exact active substance even for a cellular description", async () => {
  const row = {
    category: "Human",
    medicine_status: "Authorised",
    active_substance: "autologous T cells (brexucabtagene autoleucel)",
    marketing_authorisation_date: "14/12/2020",
    european_commission_decision_date: "12/03/2025",
    medicine_url: "https://www.ema.europa.eu/en/medicines/human/EPAR/tecartus",
  };
  const result = await fetchEmaApprovals(["BREXUCABTAGENE AUTOLEUCEL", "brexucabtagene"], {
    fetcher: async () => Response.json({ data: [row, { ...row, category: "Veterinary" }] }),
  });
  expect(result["BREXUCABTAGENE AUTOLEUCEL"]).toMatchObject({ date: "2020-12-14", region: "EU" });
  expect(result.brexucabtagene).toBeUndefined();
});

it("checks the CBER application identity and ignores supplements and invalid original dates", async () => {
  const drug = { name: "Tisagenlecleucel" };
  expect(reviewedFdaRecord(drug)).toMatchObject({ type: "car_t", date: "2017-08-30" });
  const documents = await fetchFdaDocuments(drug, {
    fetcher: async (url) => {
      expect(new URL(url).searchParams.get("search")).toBe("application_number:BLA125646");
      const approved = (submission_type, submission_status_date) => ({
        submission_type,
        submission_status_date,
        submission_status: "AP",
      });
      return Response.json({
        results: [
          { application_number: "BLA000001", submissions: [approved("ORIG", "20000101")] },
          {
            application_number: "BLA125646",
            submissions: [
              approved("SUPPL", "20010101"),
              approved("ORIG", "20170231"),
              approved("ORIG", "20170830"),
            ],
          },
        ],
      });
    },
  });
  expect(documents).toEqual([
    expect.objectContaining({ application: "BLA125646", approvedAt: "2017-08-30" }),
  ]);
});
