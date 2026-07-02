// Seeds the typical_use reference (litres per activity) — every figure SOURCED, never invented.
// Sources verified 2 Jul 2026:
//  - CCW (Consumer Council for Water): https://www.ccw.org.uk/save-money-and-water/averagewateruse/
//  - Waterwise: https://www.waterwise.org.uk/how-to-save-water/
// Env: WK_URL, WK_SERVICE_KEY.
const CCW = { source_name: "CCW — Consumer Council for Water", source_url: "https://www.ccw.org.uk/save-money-and-water/averagewateruse/" };
const WW = { source_name: "Waterwise", source_url: "https://www.waterwise.org.uk/how-to-save-water/" };

const rows = [
  { id: "toilet_flush_dual", label_en: "Toilet flush (modern dual-flush, full)", label_es: "Descarga de cisterna (doble descarga, completa)", litres: 6, unit_en: "per flush", unit_es: "por descarga", ...WW, notes: "Dual-flush toilets use 4-6 litres per flush; 6 is the full flush." },
  { id: "toilet_flush_old", label_en: "Toilet flush (older single-flush)", label_es: "Descarga de cisterna (antigua)", litres: 13, unit_en: "per flush", unit_es: "por descarga", ...WW, notes: "Older models can use up to 13 litres per flush." },
  { id: "leaking_toilet_day", label_en: "Leaking / running toilet", label_es: "Inodoro con fuga", litres: 400, unit_en: "per day (up to)", unit_es: "por dia (hasta)", ...CCW, notes: "A leaking toilet can waste up to 400 litres of water per day." },
  { id: "dripping_tap_year", label_en: "Dripping tap (1 drip per second)", label_es: "Grifo goteando (1 gota por segundo)", litres: 12000, unit_en: "per year (over)", unit_es: "por ano (mas de)", ...WW, notes: "A tap dripping at 1 drip per second loses over 12,000 litres per year." },
  { id: "shower_minute_mixer", label_en: "Shower (power/mixer)", label_es: "Ducha (hidromasaje/mezclador)", litres: 15, unit_en: "per minute", unit_es: "por minuto", ...CCW, notes: "Power or mixer showers use around 15 litres per minute." },
  { id: "shower_minute_electric", label_en: "Shower (electric)", label_es: "Ducha (electrica)", litres: 6, unit_en: "per minute", unit_es: "por minuto", ...CCW },
  { id: "bath", label_en: "Bath (full)", label_es: "Bano (lleno)", litres: 80, unit_en: "per bath", unit_es: "por bano", ...CCW },
  { id: "washing_machine_cycle", label_en: "Washing machine (normal load)", label_es: "Lavadora (carga normal)", litres: 50, unit_en: "per cycle", unit_es: "por ciclo", ...CCW },
  { id: "dishwasher_cycle", label_en: "Dishwasher (modern)", label_es: "Lavavajillas (moderno)", litres: 14, unit_en: "per cycle", unit_es: "por ciclo", ...CCW },
  { id: "washing_up_tap_minute", label_en: "Washing up under a running tap", label_es: "Fregar con el grifo abierto", litres: 9, unit_en: "per minute", unit_es: "por minuto", ...CCW },
  { id: "car_wash_hose", label_en: "Car wash with a hosepipe", label_es: "Lavar el coche con manguera", litres: 300, unit_en: "per wash", unit_es: "por lavado", ...CCW },
  { id: "car_wash_bucket", label_en: "Car wash with a bucket", label_es: "Lavar el coche con cubo", litres: 30, unit_en: "per wash", unit_es: "por lavado", ...CCW },
];

// PostgREST bulk inserts require identical key sets on every row.
for (const r of rows) r.notes = r.notes ?? null;

const url = process.env.WK_URL;
const key = process.env.WK_SERVICE_KEY;
if (!url || !key) throw new Error("Set WK_URL + WK_SERVICE_KEY");

const res = await fetch(`${url}/rest/v1/typical_use?on_conflict=id`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify(rows),
});
if (!res.ok) throw new Error(`Seed failed: ${res.status} ${await res.text()}`);
console.log(`Seeded ${rows.length} typical_use rows`);
