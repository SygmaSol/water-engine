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

export type { Block as B, Category as C, FullBillInputs as F, MarginalCostResult as M, QuotaRow as Q, RateSet as R, Tier1Field as T, Caliber as a, FullBillResult as b, Biller as c, BillLine as d, RateComponent as e, RateSource as f };
