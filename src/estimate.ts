import type { Caliber, Category, RateSet, Tier1Field } from "./types.js";
import { marginalCost, round2 } from "./tariff.js";

/**
 * Lanzarote pool evaporation benchmark — SOURCED from Canary Detect's published guide
 * (do not change these numbers without a citable source).
 */
export const LANZAROTE_POOL_EVAPORATION = {
  mmPerDayMin: 3,
  mmPerDayMax: 7,
  cmPerWeekSummerMin: 2,
  cmPerWeekSummerMax: 4,
  /** Losing more than this per week (calm weather) suggests a leak worth checking. */
  leakSuspicionCmPerWeek: 5,
  sourceName: "Canary Detect — How to check for pool leaks in Lanzarote",
  sourceUrl: "https://canary-detect.com/blog/how-to-check-for-pool-leaks-lanzarote",
} as const;

export type PoolShape = "rectangular" | "circular" | "oval" | "kidney";

export interface PoolDims {
  lengthM?: number;
  widthM?: number;
  diameterM?: number;
  avgDepthM: number;
}

/**
 * Pool volume in litres. Kidney uses the pool-industry 0.75 bounding-box approximation
 * (an estimate by nature — label it as such in UIs).
 */
export function poolVolume(shape: PoolShape, dims: PoolDims): number {
  const { avgDepthM } = dims;
  if (!(avgDepthM > 0)) throw new Error("avgDepthM must be > 0");
  let surfaceM2: number;
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
  return Math.round(surfaceM2 * avgDepthM * 1000);
}

function need(n: number | undefined): number {
  if (!(typeof n === "number" && n > 0)) throw new Error("Missing/invalid pool dimension");
  return n;
}

/**
 * Water lost to a level drop: surface area x drop depth. Only surface dimensions and the drop
 * matter for a top-up (total depth is irrelevant). 8m x 4m x 2cm = 640 litres.
 */
export function topUpLoss(lengthM: number, widthM: number, dropCm: number): number {
  if (lengthM <= 0 || widthM <= 0 || dropCm < 0) throw new Error("Invalid top-up inputs");
  return Math.round(lengthM * widthM * dropCm * 10);
}

export interface CostRange {
  lowEuros: number;
  highEuros: number;
  /** Explicit, deterministic assumptions behind the range (UI copy builds on these). */
  assumptions: string[];
  fieldsUsed: Tier1Field[];
}

/**
 * Cost of a top-up volume via the tariff engine.
 * - onTopOfHomeUse=true (default, honest range): the top-up sits ON TOP of normal home use, so it
 *   lands in the dearer blocks — low bound prices it from the block-2 position (past the first
 *   10 m3), high bound entirely in the top block (past 40 m3). Flat categories collapse the range.
 * - onTopOfHomeUse=false: priced from an empty period (block 1 upwards) — a lower bound in practice.
 */
export function topUpCost(
  litres: number,
  category: Category,
  rates: RateSet,
  opts: { onTopOfHomeUse?: boolean; onMainsSewer?: boolean; caliber?: Caliber } = {},
): CostRange {
  const onTop = opts.onTopOfHomeUse ?? true;
  const onMainsSewer = opts.onMainsSewer ?? true;
  const shared = { onMainsSewer, caliber: opts.caliber };
  if (!onTop) {
    const m = marginalCost(litres, 0, category, rates, shared);
    return {
      lowEuros: m.totalEuros,
      highEuros: m.totalEuros,
      assumptions: ["Priced from an empty billing period (cheapest blocks first)."],
      fieldsUsed: m.fieldsUsed,
    };
  }
  const low = marginalCost(litres, 10, category, rates, shared);
  const high = marginalCost(litres, 40, category, rates, shared);
  return {
    lowEuros: Math.min(low.totalEuros, high.totalEuros),
    highEuros: Math.max(low.totalEuros, high.totalEuros),
    assumptions: [
      "On top of normal home use: low bound prices the water from the block-2 position (past the first 10 m3 of the period), high bound entirely in the top block (past 40 m3).",
      onMainsSewer ? "Includes sewerage on consumption (mains sewer)." : "No sewerage (septic tank).",
    ],
    fieldsUsed: low.fieldsUsed,
  };
}

/**
 * Cost of a typical-use activity (litres figure comes from the typical_use reference — the SSOT;
 * never hardcode litres here). Priced marginally at the block-2 position by default: the stated,
 * deterministic assumption for "what does a bath cost me?" style answers.
 */
export function activityCost(
  args: {
    litresPerUnit: number;
    count: number;
    category: Category;
    rates: RateSet;
    onMainsSewer?: boolean;
    caliber?: Caliber;
    /** Cumulative period position to price from; default 10 (block-2 marginal). */
    priorPeriodM3?: number;
  },
): { euros: number; litres: number; assumptions: string[]; fieldsUsed: Tier1Field[] } {
  const { litresPerUnit, count, category, rates } = args;
  if (litresPerUnit < 0 || count < 0) throw new Error("Invalid activity inputs");
  const litres = litresPerUnit * count;
  const prior = args.priorPeriodM3 ?? 10;
  const m = marginalCost(litres, prior, category, rates, {
    onMainsSewer: args.onMainsSewer ?? true,
    caliber: args.caliber,
  });
  return {
    euros: m.totalEuros,
    litres: round2(litres),
    assumptions: [
      `Priced at the marginal rate from the ${prior} m3 period position${prior === 10 ? " (block 2 for domestic)" : ""}.`,
    ],
    fieldsUsed: m.fieldsUsed,
  };
}
