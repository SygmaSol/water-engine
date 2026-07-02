import type { RateSet } from "./types.js";
import fixtureJson from "./rates.fixture.json" with { type: "json" };

/**
 * Vendored snapshot of the Water Knowledge store's water_tariffs rows.
 * Test fixture + offline fallback ONLY — production paths fetch the table (the SSOT) at runtime
 * and pass the rates object into the pure engine functions. Refresh via store/build-fixture.mjs.
 */
export const FIXTURE_RATE_SETS = fixtureJson.tariffSets as unknown as RateSet[];

export function pickRateSet(sets: RateSet[], id: string): RateSet {
  const set = sets.find((s) => s.id === id);
  if (!set) throw new Error(`Rate set '${id}' not found (have: ${sets.map((s) => s.id).join(", ")})`);
  return set;
}

/** Light structural validation for a rates object fetched at runtime. */
export function assertRateSet(x: unknown): asserts x is RateSet {
  const s = x as RateSet;
  if (!s || typeof s.id !== "string") throw new Error("RateSet: missing id");
  for (const k of ["consumption", "loss", "quotas", "sanitation"] as const) {
    if (typeof s.igic?.[k] !== "number") throw new Error(`RateSet ${s.id}: missing igic.${k}`);
  }
  if (!s.supply?.domestic_standard || !s.supply?.industrial_tourist) {
    throw new Error(`RateSet ${s.id}: missing core supply categories`);
  }
  if (!s.loss?.domestic_standard) throw new Error(`RateSet ${s.id}: missing loss rates`);
  if (!s.waterServiceQuota?.domestic?.length) throw new Error(`RateSet ${s.id}: missing service quotas`);
  if (!s.sanitation?.variable?.standard) throw new Error(`RateSet ${s.id}: missing sanitation rates`);
}

/**
 * Convenience loader: fetch all rate sets from a Water Knowledge store (PostgREST).
 * IO-light by design — pass the URL + an API key (the anon key is enough; tariff rows are public
 * reference data). Every consumer should load rates this way and fall back to FIXTURE_RATE_SETS
 * only when the store is unreachable.
 */
export async function fetchRateSets(opts: {
  url: string;
  apikey: string;
  fetchImpl?: typeof fetch;
}): Promise<RateSet[]> {
  const f = opts.fetchImpl ?? fetch;
  const res = await f(`${opts.url}/rest/v1/water_tariffs?select=rates&order=id`, {
    headers: { apikey: opts.apikey, Authorization: `Bearer ${opts.apikey}` },
  });
  if (!res.ok) throw new Error(`water_tariffs fetch failed: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as Array<{ rates: unknown }>;
  return rows.map((r) => {
    assertRateSet(r.rates);
    return r.rates;
  });
}
