// Seed<->catalogue parity gate (Phase 0 verify; re-run whenever rates are edited).
// Fetches ALL water_tariffs rows from the Water Knowledge store with the ANON key (which also
// proves public readability) and deep-equals each row's rates object against the vendored
// src/rates.fixture.json, then spot-asserts the official-sheet figures the corpus didn't exercise.
// Exit 0 = parity holds; non-zero = drift.
// Env: WK_URL, WK_ANON_KEY.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deepStrictEqual } from "node:assert";

const here = dirname(fileURLToPath(import.meta.url));
const { tariffSets } = JSON.parse(readFileSync(join(here, "..", "src", "rates.fixture.json"), "utf8"));

const url = process.env.WK_URL;
const key = process.env.WK_ANON_KEY;
if (!url || !key) throw new Error("Set WK_URL + WK_ANON_KEY");

const res = await fetch(`${url}/rest/v1/water_tariffs?select=id,rates&order=id`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
const rows = await res.json();

let failures = 0;
const fail = (msg) => { failures++; console.error("FAIL:", msg); };

// 1. Same set of ids, and every rates object deep-equals the fixture.
const fixtureById = new Map(tariffSets.map((s) => [s.id, s]));
if (rows.length !== tariffSets.length) fail(`row count ${rows.length} != fixture ${tariffSets.length}`);
for (const row of rows) {
  const expect = fixtureById.get(row.id);
  if (!expect) { fail(`unexpected tariff set in store: ${row.id}`); continue; }
  try { deepStrictEqual(row.rates, expect); console.log(`OK deep-equal: ${row.id}`); }
  catch { fail(`rates for ${row.id} differ from fixture`); }
}

// 2. Spot-assert the official-sheet figures (guard against fat-fingered edits).
const cur = rows.find((r) => r.id === "2011_current")?.rates;
if (!cur) fail("2011_current missing");
else {
  const reduced = cur.supply.domestic_reduced.blocks.map((b) => b.rate);
  deepStrictEqual(reduced, [0.51, 0.71, 1.2, 2.64]);
  const lossTop = cur.loss.domestic_standard.blocks.at(-1).rate;
  if (lossTop !== 2.09) fail(`domestic loss >40 block is ${lossTop}, expected 2.09 (never the supply 3.69)`);
  const reducedLossTop = cur.loss.domestic_reduced.blocks.at(-1).rate;
  if (reducedLossTop !== 2.09) fail(`reduced loss >40 block is ${reducedLossTop}, expected 2.09`);
  if (cur.sanitation.variable.reduced.rate !== 0.39) fail("reduced sanitation variable should be 0.39");
  deepStrictEqual(cur.waterServiceQuota.domestic.map((q) => [q.caliber, q.fee]),
    [["13-15mm", 4], ["20mm", 6], ["25mm", 8], ["30mm", 10], ["40mm", 12]]);
  deepStrictEqual(cur.waterServiceQuota.industrial.map((q) => [q.caliber, q.fee]),
    [["13-15mm", 12], ["20mm", 20], ["25mm", 30], ["30mm", 50], ["40mm", 65], ["50mm", 80], ["65mm", 100], ["80mm", 150], ["100mm+", 200]]);
  deepStrictEqual(cur.sanitation.fixed.industrial.map((q) => [q.caliber, q.fee]),
    [["13-15mm", 2], ["20mm", 4], ["25-40mm", 10], ["50-65mm", 20], ["80mm", 30], ["100mm+", 40]]);
  if (cur.igic.quotas !== 0.07 || cur.igic.consumption !== 0) fail("IGIC per-line rule drifted");
  console.log("OK spot-asserts: reduced blocks, loss >40 = 2.09, caliber quota lists, IGIC rule");
}

if (failures) { console.error(`PARITY GATE FAILED (${failures})`); process.exit(1); }
console.log("PARITY GATE PASSED");
