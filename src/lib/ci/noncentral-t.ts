import type { NoncentralTCdf } from "./rsd-confidence.ts";

let cdfPromise: Promise<NoncentralTCdf> | null = null;

export function loadNoncentralTCdf(): Promise<NoncentralTCdf> {
  if (!cdfPromise) {
    cdfPromise = import("cdflib_wasm").then(async ({ default: CdfLibWrapper }) => {
      const library = new CdfLibWrapper({ compileSync: true });
      await library.compiled;
      return (t: number, df: number, noncentrality: number) => library.cdftnc_1(df, noncentrality, t);
    });
  }
  return cdfPromise;
}
