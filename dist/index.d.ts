/** Rate provenance: which figures are corpus-proven vs taken from the official sheet. */
type RateSource = "bill-validated" | "official-sheet" | "announced-proposal" | "derived-estimate";
interface Block {
    /** Cumulative m3 threshold this block runs up to; null = open-ended top block. */
    upTo: number | null;
    rate: number;
    source?: RateSource;
}
interface RateComponent {
    mode: "blocks" | "flat";
    blocks?: Block[];
    flatRate?: number;
    source: RateSource;
    notes?: string;
}
interface QuotaRow {
    /** As printed on the sheet: "13-15mm", "20mm", "25-40mm", "50mm+", "100mm+", "unica". */
    caliber: string;
    fee: number;
    source: RateSource;
}
interface RateSet {
    id: string;
    labelEn: string;
    labelEs: string;
    status: "current" | "proposed" | "historical";
    effective: string;
    source: string;
    notes?: string;
    /** Per-line IGIC rule: 0% consumption + losses, 7% quotas + sanitation (validated). */
    igic: {
        consumption: number;
        loss: number;
        quotas: number;
        sanitation: number;
    };
    supply: Record<string, RateComponent>;
    loss: Record<string, RateComponent>;
    waterServiceQuota: {
        domestic: QuotaRow[];
        industrial: QuotaRow[];
        corporations: QuotaRow[];
    };
    sanitation: {
        variable: {
            standard: {
                rate: number;
                source: RateSource;
            };
            reduced: {
                rate: number;
                source: RateSource;
            };
        };
        fixed: {
            domestic: QuotaRow[];
            industrial: QuotaRow[];
            corporations: QuotaRow[];
        };
    };
}
/** The realistic LeakGuard/CD categories (the tariff has more; these are the ones we model end-to-end). */
type Category = "domestic_standard" | "domestic_reduced" | "industrial_tourist";
type Biller = "canal" | "club";
type Caliber = "13-15mm" | "20mm" | "25mm" | "30mm" | "40mm" | "50mm" | "65mm" | "80mm" | "100mm+";
/** The Tier-1 settings fields a computation can consume (drives the deterministic disclaimers). */
type Tier1Field = "biller" | "tariff_category" | "meter_caliber" | "on_mains_sewer" | "billing_period_anchor" | "typical_loss";
interface BillLine {
    kind: "consumption" | "loss" | "water_quota" | "sanitation_fixed" | "sanitation_variable";
    labelEn: string;
    labelEs: string;
    /** m3 for volumetric lines, 1 for quotas. */
    quantity: number;
    unitRate: number;
    amount: number;
    igicRate: number;
    /** Block breakdown for volumetric block lines. */
    breakdown?: Array<{
        m3: number;
        rate: number;
        amount: number;
    }>;
}
interface FullBillResult {
    lines: BillLine[];
    /** Sum of lines at 0% IGIC (consumption + losses). */
    base0: number;
    /** Sum of lines at 7% IGIC (quotas + sanitation). */
    base7: number;
    igic: number;
    total: number;
    /** Tier-1 fields this computation consumed (for the deterministic disclaimer layer). */
    fieldsUsed: Tier1Field[];
}
interface FullBillInputs {
    rates: RateSet;
    category: Category;
    /** Actual metered consumption for the period, m3. */
    m3: number;
    /** Network-loss allocation ("Diferencia contador general") m3 — from the bill only. */
    lossM3?: number;
    biller?: Biller;
    caliber?: Caliber;
    onMainsSewer?: boolean;
}
interface MarginalCostResult {
    totalEuros: number;
    supplyEuros: number;
    /** Sanitation-variable component incl. its IGIC (0 when on a septic tank). */
    sanitationEuros: number;
    volumeM3: number;
    /** Cumulative period position (m3) the volume started at, including Canal-merged loss where applicable. */
    startsAtM3: number;
    blocksTouched: Array<{
        m3: number;
        rate: number;
        amount: number;
    }>;
    fieldsUsed: Tier1Field[];
}

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

declare const VERSION = "0.1.0";

export { type BillLine, type Biller, type Block, type Caliber, type Category, FIXTURE_RATE_SETS, type FullBillInputs, type FullBillResult, type MarginalCostResult, type QuotaRow, type RateComponent, type RateSet, type RateSource, type Tier1Field, VERSION, assertRateSet, blockCharge, consumptionCharge, fetchRateSets, fullBill, lossCharge, marginalCost, pickRateSet, resolveQuota, round2, sanitation, waterQuota };
