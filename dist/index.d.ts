import { T as Tier1Field, C as Category, R as RateSet, a as Caliber, B as Block, F as FullBillInputs, b as FullBillResult, c as Biller, M as MarginalCostResult, Q as QuotaRow } from './types-DDyA1WQx.js';
export { d as BillLine, e as RateComponent, f as RateSource } from './types-DDyA1WQx.js';

/**
 * Lanzarote pool evaporation benchmark — SOURCED from Canary Detect's published guide
 * (do not change these numbers without a citable source).
 */
declare const LANZAROTE_POOL_EVAPORATION: {
    readonly mmPerDayMin: 3;
    readonly mmPerDayMax: 7;
    readonly cmPerWeekSummerMin: 2;
    readonly cmPerWeekSummerMax: 4;
    /** Losing more than this per week (calm weather) suggests a leak worth checking. */
    readonly leakSuspicionCmPerWeek: 5;
    readonly sourceName: "Canary Detect — How to check for pool leaks in Lanzarote";
    readonly sourceUrl: "https://canary-detect.com/blog/how-to-check-for-pool-leaks-lanzarote";
};
type PoolShape = "rectangular" | "circular" | "oval" | "kidney";
interface PoolDims {
    lengthM?: number;
    widthM?: number;
    diameterM?: number;
    avgDepthM: number;
}
/**
 * Pool volume in litres. Kidney uses the pool-industry 0.75 bounding-box approximation
 * (an estimate by nature — label it as such in UIs).
 */
declare function poolVolume(shape: PoolShape, dims: PoolDims): number;
/**
 * Water lost to a level drop: surface area x drop depth. Only surface dimensions and the drop
 * matter for a top-up (total depth is irrelevant). 8m x 4m x 2cm = 640 litres.
 */
declare function topUpLoss(lengthM: number, widthM: number, dropCm: number): number;
interface CostRange {
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
declare function topUpCost(litres: number, category: Category, rates: RateSet, opts?: {
    onTopOfHomeUse?: boolean;
    onMainsSewer?: boolean;
    caliber?: Caliber;
}): CostRange;
/**
 * Cost of a typical-use activity (litres figure comes from the typical_use reference — the SSOT;
 * never hardcode litres here). Priced marginally at the block-2 position by default: the stated,
 * deterministic assumption for "what does a bath cost me?" style answers.
 */
declare function activityCost(args: {
    litresPerUnit: number;
    count: number;
    category: Category;
    rates: RateSet;
    onMainsSewer?: boolean;
    caliber?: Caliber;
    /** Cumulative period position to price from; default 10 (block-2 marginal). */
    priorPeriodM3?: number;
}): {
    euros: number;
    litres: number;
    assumptions: string[];
    fieldsUsed: Tier1Field[];
};

/** Round to 2 decimal places (euro cents). Bills round each line to the cent. */
declare function round2(n: number): number;
interface BlockBreakdownItem {
    m3: number;
    rate: number;
    amount: number;
}
/**
 * Progressive block charge: each block's rate applies only to the m3 inside that block
 * (cumulative over the billing period). Per-block amounts round to the cent, as printed on bills.
 */
declare function blockCharge(m3: number, blocks: Block[]): {
    total: number;
    breakdown: BlockBreakdownItem[];
};
/** Water consumption charge for a category (supply stream). */
declare function consumptionCharge(m3: number, rates: RateSet, category: Category): {
    total: number;
    breakdown: BlockBreakdownItem[];
};
/**
 * Network-loss charge ("Diferencia contador general" / "Perdida"), biller-dependent:
 * - club: itemised as a SEPARATE line at the LOSS rate set (own blocks / tourist flat 1.88).
 * - canal: MERGED into consumption — one combined volume run through the SUPPLY blocks; the loss
 *   charge is the increment over what consumption alone would have cost (it moves the marginal block).
 * Loss QUANTITY always comes from the bill; the meter cannot see it.
 */
declare function lossCharge(lossM3: number, rates: RateSet, category: Category, biller: Biller, consumptionM3: number): {
    total: number;
    breakdown: BlockBreakdownItem[];
};
/** Resolve a concrete meter caliber against a quota table whose rows may be brackets ("25-40mm", "50mm+"). */
declare function resolveQuota(rows: QuotaRow[], caliber: Caliber | string): QuotaRow;
/** Fixed water service quota (per bill) for the caliber + category. */
declare function waterQuota(caliber: Caliber, category: Category, rates: RateSet): QuotaRow;
/** Sanitation lines (only when on the mains sewer): fixed quota by caliber + variable on ACTUAL consumption. */
declare function sanitation(m3: number, caliber: Caliber, category: Category, rates: RateSet): {
    fixed: QuotaRow;
    variableRate: number;
    variableAmount: number;
};
/**
 * Assemble a full bill: two parallel charge streams (supply + loss) with biller-dependent loss
 * handling, quotas, optional sanitation (septic = none; variable on actual consumption only),
 * and per-line IGIC (0% consumption/loss, 7% quotas/sanitation) applied on the summed 7% base —
 * exactly how the 49-bill corpus reconciles to the cent.
 */
declare function fullBill(inputs: FullBillInputs): FullBillResult;
/**
 * True marginal cost of an event's volume, given the cumulative period consumption BEFORE it.
 * The block position includes the Canal-merged loss m3 where applicable (a big "Diferencia" can
 * push the customer's own next m3 into a dearer block). Marginal euros INCLUDE the
 * sanitation-variable component (rate x (1+IGIC) per actual m3) when on the mains sewer.
 */
declare function marginalCost(volumeL: number, priorPeriodM3: number, category: Category, rates: RateSet, opts?: {
    caliber?: Caliber;
    biller?: Biller;
    priorLossM3?: number;
    onMainsSewer?: boolean;
}): MarginalCostResult;

/**
 * Vendored snapshot of the Water Knowledge store's water_tariffs rows.
 * Test fixture + offline fallback ONLY — production paths fetch the table (the SSOT) at runtime
 * and pass the rates object into the pure engine functions. Refresh via store/build-fixture.mjs.
 */
declare const FIXTURE_RATE_SETS: RateSet[];
declare function pickRateSet(sets: RateSet[], id: string): RateSet;
/** Light structural validation for a rates object fetched at runtime. */
declare function assertRateSet(x: unknown): asserts x is RateSet;
/**
 * Convenience loader: fetch all rate sets from a Water Knowledge store (PostgREST).
 * IO-light by design — pass the URL + an API key (the anon key is enough; tariff rows are public
 * reference data). Every consumer should load rates this way and fall back to FIXTURE_RATE_SETS
 * only when the store is unreachable.
 */
declare function fetchRateSets(opts: {
    url: string;
    apikey: string;
    fetchImpl?: typeof fetch;
}): Promise<RateSet[]>;

declare const VERSION = "0.3.0";

export { Biller, Block, Caliber, Category, type CostRange, FIXTURE_RATE_SETS, FullBillInputs, FullBillResult, LANZAROTE_POOL_EVAPORATION, MarginalCostResult, type PoolDims, type PoolShape, QuotaRow, RateSet, Tier1Field, VERSION, activityCost, assertRateSet, blockCharge, consumptionCharge, fetchRateSets, fullBill, lossCharge, marginalCost, pickRateSet, poolVolume, resolveQuota, round2, sanitation, topUpCost, topUpLoss, waterQuota };
