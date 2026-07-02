// Builds src/rates.fixture.json from store/rates-2011.json:
//  - set 1 = the validated 2011 catalogue verbatim
//  - set 2 = 2026_proposed, derived as x1.1506 rounded to the cent (the announced domestic
//    0.69/1.19/2.01/4.25 and industrial 3.35 figures ARE exactly that derivation, verified).
// Sources in the derived set: 'announced-proposal' for the two publicly announced components,
// 'derived-estimate' for everything else.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(readFileSync(join(here, "rates-2011.json"), "utf8"));

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const RISE = 1.1506;

function derive(node, sourceFor) {
  if (Array.isArray(node)) return node.map((v) => derive(v, sourceFor));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if ((k === "rate" || k === "flatRate" || k === "fee") && typeof v === "number") {
        out[k] = round2(v * RISE);
      } else if (k === "source") {
        out[k] = sourceFor;
      } else if (k === "notes") {
        continue; // per-component 2011 notes don't apply to the derived set
      } else {
        out[k] = derive(v, sourceFor);
      }
    }
    return out;
  }
  return node;
}

const proposed = derive(base, "derived-estimate");
proposed.supply.domestic_standard.source = "announced-proposal";
proposed.supply.industrial_tourist.source = "announced-proposal";
proposed.id = "2026_proposed";
proposed.labelEn = "Proposed 2026 (+15.06%) - pending approval";
proposed.labelEs = "Propuesta 2026 (+15,06%) - pendiente de aprobacion";
proposed.status = "proposed";
proposed.effective = "pending";
proposed.source = "Consorcio del Agua de Lanzarote, Feb 2026 approval; NOT in force (pending Comision de Precios de Canarias)";
proposed.notes =
  "Derived from the 2011 catalogue at +15.06% rounded to the cent. The publicly announced figures " +
  "(domestic 0.69/1.19/2.01/4.25, industrial 3.35) match this derivation exactly; all other figures are " +
  "estimates on the same basis. NOT in force as of July 2026 - bills through Mar-May 2026 still show 2011 rates.";
proposed.igic = { ...base.igic };

const fixture = {
  comment:
    "Vendored snapshot of the Water Knowledge store's water_tariffs rows. Test fixture + offline fallback " +
    "ONLY - production paths read the water_tariffs table (the SSOT). Refresh via store/build-fixture.mjs " +
    "and re-run store/parity-check.mjs whenever rates change.",
  tariffSets: [base, proposed],
};

writeFileSync(join(here, "..", "src", "rates.fixture.json"), JSON.stringify(fixture, null, 2) + "\n");
console.log("Wrote src/rates.fixture.json with sets:", fixture.tariffSets.map((s) => s.id).join(", "));
