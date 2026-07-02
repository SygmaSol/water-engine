import {
  FIXTURE_RATE_SETS,
  assertRateSet,
  blockCharge,
  consumptionCharge,
  fetchRateSets,
  fullBill,
  lossCharge,
  marginalCost,
  pickRateSet,
  resolveQuota,
  round2,
  sanitation,
  waterQuota
} from "./chunk-DGGGE2F4.js";

// src/estimate.ts
var LANZAROTE_POOL_EVAPORATION = {
  mmPerDayMin: 3,
  mmPerDayMax: 7,
  cmPerWeekSummerMin: 2,
  cmPerWeekSummerMax: 4,
  /** Losing more than this per week (calm weather) suggests a leak worth checking. */
  leakSuspicionCmPerWeek: 5,
  sourceName: "Canary Detect \u2014 How to check for pool leaks in Lanzarote",
  sourceUrl: "https://canary-detect.com/blog/how-to-check-for-pool-leaks-lanzarote"
};
function poolVolume(shape, dims) {
  const { avgDepthM } = dims;
  if (!(avgDepthM > 0)) throw new Error("avgDepthM must be > 0");
  let surfaceM2;
  switch (shape) {
    case "rectangular":
      surfaceM2 = need(dims.lengthM) * need(dims.widthM);
      break;
    case "circular": {
      const r = need(dims.diameterM) / 2;
      surfaceM2 = Math.PI * r * r;
      break;
    }
    case "oval":
      surfaceM2 = Math.PI * (need(dims.lengthM) / 2) * (need(dims.widthM) / 2);
      break;
    case "kidney":
      surfaceM2 = 0.75 * need(dims.lengthM) * need(dims.widthM);
      break;
  }
  return Math.round(surfaceM2 * avgDepthM * 1e3);
}
function need(n) {
  if (!(typeof n === "number" && n > 0)) throw new Error("Missing/invalid pool dimension");
  return n;
}
function topUpLoss(lengthM, widthM, dropCm) {
  if (lengthM <= 0 || widthM <= 0 || dropCm < 0) throw new Error("Invalid top-up inputs");
  return Math.round(lengthM * widthM * dropCm * 10);
}
function topUpCost(litres, category, rates, opts = {}) {
  const onTop = opts.onTopOfHomeUse ?? true;
  const onMainsSewer = opts.onMainsSewer ?? true;
  const shared = { onMainsSewer, caliber: opts.caliber };
  if (!onTop) {
    const m = marginalCost(litres, 0, category, rates, shared);
    return {
      lowEuros: m.totalEuros,
      highEuros: m.totalEuros,
      assumptions: ["Priced from an empty billing period (cheapest blocks first)."],
      fieldsUsed: m.fieldsUsed
    };
  }
  const low = marginalCost(litres, 10, category, rates, shared);
  const high = marginalCost(litres, 40, category, rates, shared);
  return {
    lowEuros: Math.min(low.totalEuros, high.totalEuros),
    highEuros: Math.max(low.totalEuros, high.totalEuros),
    assumptions: [
      "On top of normal home use: low bound prices the water from the block-2 position (past the first 10 m3 of the period), high bound entirely in the top block (past 40 m3).",
      onMainsSewer ? "Includes sewerage on consumption (mains sewer)." : "No sewerage (septic tank)."
    ],
    fieldsUsed: low.fieldsUsed
  };
}
function activityCost(args) {
  const { litresPerUnit, count, category, rates } = args;
  if (litresPerUnit < 0 || count < 0) throw new Error("Invalid activity inputs");
  const litres = litresPerUnit * count;
  const prior = args.priorPeriodM3 ?? 10;
  const m = marginalCost(litres, prior, category, rates, {
    onMainsSewer: args.onMainsSewer ?? true,
    caliber: args.caliber
  });
  return {
    euros: m.totalEuros,
    litres: round2(litres),
    assumptions: [
      `Priced at the marginal rate from the ${prior} m3 period position${prior === 10 ? " (block 2 for domestic)" : ""}.`
    ],
    fieldsUsed: m.fieldsUsed
  };
}

// src/index.ts
var VERSION = "0.3.0";
export {
  FIXTURE_RATE_SETS,
  LANZAROTE_POOL_EVAPORATION,
  VERSION,
  activityCost,
  assertRateSet,
  blockCharge,
  consumptionCharge,
  fetchRateSets,
  fullBill,
  lossCharge,
  marginalCost,
  pickRateSet,
  poolVolume,
  resolveQuota,
  round2,
  sanitation,
  topUpCost,
  topUpLoss,
  waterQuota
};
//# sourceMappingURL=index.js.map