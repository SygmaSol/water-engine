import type {
  Biller,
  BillLine,
  Block,
  Caliber,
  Category,
  FullBillInputs,
  FullBillResult,
  MarginalCostResult,
  QuotaRow,
  RateComponent,
  RateSet,
  Tier1Field,
} from "./types.js";

/** Round to 2 decimal places (euro cents). Bills round each line to the cent. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface BlockBreakdownItem {
  m3: number;
  rate: number;
  amount: number;
}

/**
 * Progressive block charge: each block's rate applies only to the m3 inside that block
 * (cumulative over the billing period). Per-block amounts round to the cent, as printed on bills.
 */
export function blockCharge(m3: number, blocks: Block[]): { total: number; breakdown: BlockBreakdownItem[] } {
  if (m3 < 0) throw new Error(`blockCharge: negative volume ${m3}`);
  let remaining = m3;
  let lastCap = 0;
  let total = 0;
  const breakdown: BlockBreakdownItem[] = [];
  for (const b of blocks) {
    const cap = b.upTo ?? Infinity;
    const used = Math.max(0, Math.min(remaining, cap - lastCap));
    if (used > 0) {
      const amount = round2(used * b.rate);
      breakdown.push({ m3: used, rate: b.rate, amount });
      total += amount;
      remaining -= used;
    }
    lastCap = cap;
    if (remaining <= 0) break;
  }
  return { total: round2(total), breakdown };
}

function componentCharge(m3: number, comp: RateComponent): { total: number; breakdown: BlockBreakdownItem[] } {
  if (comp.mode === "flat") {
    const amount = round2(m3 * (comp.flatRate ?? 0));
    return { total: amount, breakdown: [{ m3, rate: comp.flatRate ?? 0, amount }] };
  }
  return blockCharge(m3, comp.blocks ?? []);
}

/** Water consumption charge for a category (supply stream). */
export function consumptionCharge(m3: number, rates: RateSet, category: Category): { total: number; breakdown: BlockBreakdownItem[] } {
  const comp = rates.supply[category];
  if (!comp) throw new Error(`No supply rates for category '${category}' in set '${rates.id}'`);
  return componentCharge(m3, comp);
}

/**
 * Network-loss charge ("Diferencia contador general" / "Perdida"), biller-dependent:
 * - club: itemised as a SEPARATE line at the LOSS rate set (own blocks / tourist flat 1.88).
 * - canal: MERGED into consumption — one combined volume run through the SUPPLY blocks; the loss
 *   charge is the increment over what consumption alone would have cost (it moves the marginal block).
 * Loss QUANTITY always comes from the bill; the meter cannot see it.
 */
export function lossCharge(
  lossM3: number,
  rates: RateSet,
  category: Category,
  biller: Biller,
  consumptionM3: number,
): { total: number; breakdown: BlockBreakdownItem[] } {
  if (lossM3 === 0) return { total: 0, breakdown: [] };
  if (biller === "club") {
    const comp = rates.loss[category];
    if (!comp) throw new Error(`No loss rates for category '${category}' in set '${rates.id}'`);
    return componentCharge(lossM3, comp);
  }
  const combined = consumptionCharge(consumptionM3 + lossM3, rates, category);
  const alone = consumptionCharge(consumptionM3, rates, category);
  return { total: round2(combined.total - alone.total), breakdown: combined.breakdown };
}

const CALIBER_TABLE: Record<Category, "domestic" | "industrial"> = {
  domestic_standard: "domestic",
  domestic_reduced: "domestic",
  industrial_tourist: "industrial",
};

function parseCaliberMm(caliber: string): number {
  const m = caliber.match(/(\d+)/);
  if (!m) throw new Error(`Unparseable caliber '${caliber}'`);
  return Number(m[1]);
}

/** Resolve a concrete meter caliber against a quota table whose rows may be brackets ("25-40mm", "50mm+"). */
export function resolveQuota(rows: QuotaRow[], caliber: Caliber | string): QuotaRow {
  const mm = parseCaliberMm(caliber);
  for (const row of rows) {
    if (row.caliber === "unica") return row;
    const plus = /\+/.test(row.caliber);
    const nums = row.caliber.match(/\d+/g)?.map(Number) ?? [];
    const lo = nums[0] ?? 0;
    const hi = plus ? Infinity : (nums[1] ?? nums[0] ?? 0);
    if (mm >= lo && mm <= hi) return row;
  }
  throw new Error(`No quota row covers caliber '${caliber}'`);
}

/** Fixed water service quota (per bill) for the caliber + category. */
export function waterQuota(caliber: Caliber, category: Category, rates: RateSet): QuotaRow {
  return resolveQuota(rates.waterServiceQuota[CALIBER_TABLE[category]], caliber);
}

/** Sanitation lines (only when on the mains sewer): fixed quota by caliber + variable on ACTUAL consumption. */
export function sanitation(
  m3: number,
  caliber: Caliber,
  category: Category,
  rates: RateSet,
): { fixed: QuotaRow; variableRate: number; variableAmount: number } {
  const fixed = resolveQuota(rates.sanitation.fixed[CALIBER_TABLE[category]], caliber);
  const variableRate =
    category === "domestic_reduced" ? rates.sanitation.variable.reduced.rate : rates.sanitation.variable.standard.rate;
  return { fixed, variableRate, variableAmount: round2(m3 * variableRate) };
}

/**
 * Assemble a full bill: two parallel charge streams (supply + loss) with biller-dependent loss
 * handling, quotas, optional sanitation (none when the bill has no saneamiento lines — septic or
 * unbilled mains-sewer homes; variable on actual consumption only),
 * and per-line IGIC (0% consumption/loss, 7% quotas/sanitation) applied on the summed 7% base —
 * exactly how the 49-bill corpus reconciles to the cent.
 */
export function fullBill(inputs: FullBillInputs): FullBillResult {
  const { rates, category, m3 } = inputs;
  const lossM3 = inputs.lossM3 ?? 0;
  const biller: Biller = inputs.biller ?? "club";
  const caliber: Caliber = inputs.caliber ?? "13-15mm";
  const onMainsSewer = inputs.onMainsSewer ?? true;
  if (m3 < 0 || lossM3 < 0) throw new Error("Volumes must be >= 0");

  const lines: BillLine[] = [];
  const fieldsUsed: Tier1Field[] = ["tariff_category", "meter_caliber", "on_mains_sewer"];
  if (lossM3 > 0) fieldsUsed.push("biller", "typical_loss");

  if (biller === "canal" && lossM3 > 0) {
    // Canal merges: one "TOTAL M3 FACTURAR" volume through the supply blocks.
    const combined = consumptionCharge(m3 + lossM3, rates, category);
    lines.push({
      kind: "consumption",
      labelEn: `Water consumption incl. network-loss allocation (${m3} + ${lossM3} m3)`,
      labelEs: `Consumo agua incl. diferencias contador general (${m3} + ${lossM3} m3)`,
      quantity: m3 + lossM3,
      unitRate: NaN,
      amount: combined.total,
      igicRate: rates.igic.consumption,
      breakdown: combined.breakdown,
    });
  } else {
    const cons = consumptionCharge(m3, rates, category);
    lines.push({
      kind: "consumption",
      labelEn: "Water consumption",
      labelEs: "Consumo agua",
      quantity: m3,
      unitRate: NaN,
      amount: cons.total,
      igicRate: rates.igic.consumption,
      breakdown: cons.breakdown,
    });
    if (lossM3 > 0) {
      const loss = lossCharge(lossM3, rates, category, biller, m3);
      lines.push({
        kind: "loss",
        labelEn: "Network-loss allocation (Diferencia contador general)",
        labelEs: category === "industrial_tourist" ? "Perdida turistica" : "Perdida domestica",
        quantity: lossM3,
        unitRate: NaN,
        amount: loss.total,
        igicRate: rates.igic.loss,
        breakdown: loss.breakdown,
      });
    }
  }

  const quota = waterQuota(caliber, category, rates);
  lines.push({
    kind: "water_quota",
    labelEn: `Water service quota (${quota.caliber})`,
    labelEs: `Cuota servicio agua (${quota.caliber})`,
    quantity: 1,
    unitRate: quota.fee,
    amount: quota.fee,
    igicRate: rates.igic.quotas,
  });

  if (onMainsSewer) {
    const san = sanitation(m3, caliber, category, rates);
    lines.push({
      kind: "sanitation_fixed",
      labelEn: `Sewerage service quota (${san.fixed.caliber})`,
      labelEs: `Saneamiento cuota servicio (${san.fixed.caliber})`,
      quantity: 1,
      unitRate: san.fixed.fee,
      amount: san.fixed.fee,
      igicRate: rates.igic.sanitation,
    });
    lines.push({
      kind: "sanitation_variable",
      labelEn: "Sewerage on consumption",
      labelEs: "Saneamiento consumo",
      quantity: m3,
      unitRate: san.variableRate,
      amount: san.variableAmount,
      igicRate: rates.igic.sanitation,
    });
  }

  const base0 = round2(
    lines.filter((l) => l.igicRate === 0).reduce((s, l) => s + l.amount, 0),
  );
  const base7 = round2(
    lines.filter((l) => l.igicRate > 0).reduce((s, l) => s + l.amount, 0),
  );
  const igic = round2(base7 * rates.igic.quotas);
  return { lines, base0, base7, igic, total: round2(base0 + base7 + igic), fieldsUsed };
}

/**
 * True marginal cost of an event's volume, given the cumulative period consumption BEFORE it.
 * The block position includes the Canal-merged loss m3 where applicable (a big "Diferencia" can
 * push the customer's own next m3 into a dearer block). Marginal euros INCLUDE the
 * sanitation-variable component (rate x (1+IGIC) per actual m3) when on the mains sewer.
 */
export function marginalCost(
  volumeL: number,
  priorPeriodM3: number,
  category: Category,
  rates: RateSet,
  opts: { caliber?: Caliber; biller?: Biller; priorLossM3?: number; onMainsSewer?: boolean } = {},
): MarginalCostResult {
  if (volumeL < 0 || priorPeriodM3 < 0) throw new Error("Volumes must be >= 0");
  const biller: Biller = opts.biller ?? "club";
  const priorLossM3 = opts.priorLossM3 ?? 0;
  const onMainsSewer = opts.onMainsSewer ?? true;
  const volumeM3 = volumeL / 1000;

  const startsAtM3 = priorPeriodM3 + (biller === "canal" ? priorLossM3 : 0);
  const before = consumptionCharge(startsAtM3, rates, category);
  const after = consumptionCharge(startsAtM3 + volumeM3, rates, category);
  const supplyEuros = round2(after.total - before.total);

  // Which blocks the marginal volume touched (diff of the two breakdowns).
  const blocksTouched: Array<{ m3: number; rate: number; amount: number }> = [];
  for (const a of after.breakdown) {
    const b = before.breakdown.find((x) => x.rate === a.rate);
    const dm3 = round2(a.m3 - (b?.m3 ?? 0));
    if (dm3 > 0) blocksTouched.push({ m3: dm3, rate: a.rate, amount: round2(a.amount - (b?.amount ?? 0)) });
  }

  const sanitVarRate =
    category === "domestic_reduced" ? rates.sanitation.variable.reduced.rate : rates.sanitation.variable.standard.rate;
  const sanitationEuros = onMainsSewer ? round2(volumeM3 * sanitVarRate * (1 + rates.igic.sanitation)) : 0;

  const fieldsUsed: Tier1Field[] = ["tariff_category", "on_mains_sewer", "billing_period_anchor"];
  if (biller === "canal" && priorLossM3 > 0) fieldsUsed.push("biller", "typical_loss");

  return {
    totalEuros: round2(supplyEuros + sanitationEuros),
    supplyEuros,
    sanitationEuros,
    volumeM3,
    startsAtM3,
    blocksTouched,
    fieldsUsed,
  };
}
