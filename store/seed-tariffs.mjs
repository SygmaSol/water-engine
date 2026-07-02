// Seeds/updates the water_tariffs table in the Water Knowledge store from src/rates.fixture.json.
// The fixture is generated from the validated catalogue (build-fixture.mjs); this script makes the
// table match it exactly. Run parity-check.mjs afterwards - that is the gate.
// Env: WK_URL, WK_SERVICE_KEY.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { tariffSets } = JSON.parse(readFileSync(join(here, "..", "src", "rates.fixture.json"), "utf8"));

const url = process.env.WK_URL;
const key = process.env.WK_SERVICE_KEY;
if (!url || !key) throw new Error("Set WK_URL + WK_SERVICE_KEY");

const rows = tariffSets.map((set) => ({
  id: set.id,
  label_en: set.labelEn,
  label_es: set.labelEs,
  status: set.status,
  effective: set.effective,
  source: set.source,
  rates: set,
}));

const res = await fetch(`${url}/rest/v1/water_tariffs`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});
if (!res.ok) throw new Error(`Seed failed: ${res.status} ${await res.text()}`);
console.log(`Seeded ${rows.length} tariff sets:`, rows.map((r) => r.id).join(", "));
