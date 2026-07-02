// Engine anchors — ANONYMISED numeric scenarios only (public repo rule: no property or customer
// names, no real bills). The full named 49-bill corpus reconciliation runs LeakGuard-side, privately.
import { describe, expect, it } from "vitest";
import { FIXTURE_RATE_SETS, pickRateSet } from "./rates.js";
import { blockCharge, consumptionCharge, fullBill, lossCharge, marginalCost, resolveQuota, sanitation, waterQuota } from "./tariff.js";

const rates = pickRateSet(FIXTURE_RATE_SETS, "2011_current");
const proposed = pickRateSet(FIXTURE_RATE_SETS, "2026_proposed");

describe("consumption blocks (validated supply rates)", () => {
  it("10 m3 domestic = 6.00", () => {
    expect(consumptionCharge(10, rates, "domestic_standard").total).toBe(6.0);
  });
  it("0 m3 = 0.00", () => {
    expect(consumptionCharge(0, rates, "domestic_standard").total).toBe(0);
  });
  it("25 m3 domestic = 21.45 (10@0.60 + 15@1.03)", () => {
    const r = consumptionCharge(25, rates, "domestic_standard");
    expect(r.total).toBe(21.45);
    expect(r.breakdown).toEqual([
      { m3: 10, rate: 0.6, amount: 6.0 },
      { m3: 15, rate: 1.03, amount: 15.45 },
    ]);
  });
  it("45 m3 domestic = 62.55 (6.00 + 20.60 + 17.50 + 18.45)", () => {
    expect(consumptionCharge(45, rates, "domestic_standard").total).toBe(62.55);
  });
  it("flat categories ignore blocks (tourist 2.91)", () => {
    expect(consumptionCharge(75, rates, "industrial_tourist").total).toBe(218.25);
  });
  it("reduced < standard at every volume", () => {
    for (const m3 of [5, 10, 25, 40, 60, 120]) {
      expect(consumptionCharge(m3, rates, "domestic_reduced").total).toBeLessThan(
        consumptionCharge(m3, rates, "domestic_standard").total,
      );
    }
  });
});

describe("loss stream (two parallel rate sets)", () => {
  it("club domestic loss uses the LOSS rates: 40 m3 = 43.70 (10@0.60 + 20@1.01 + 10@1.75)", () => {
    const r = lossCharge(40, rates, "domestic_standard", "club", 29);
    expect(r.total).toBe(43.7);
  });
  it("club tourist loss is flat 1.88", () => {
    expect(lossCharge(12, rates, "industrial_tourist", "club", 20).total).toBe(22.56);
  });
  it("canal merges loss into the supply blocks (13 used + 65 loss = 78 through supply)", () => {
    const r = lossCharge(65, rates, "domestic_standard", "canal", 13);
    // combined 78 m3 = 6.00 + 20.60 + 17.50 + 140.22 = 184.32; alone 13 m3 = 9.09
    expect(r.total).toBe(round2(184.32 - 9.09));
  });
  it("loss >40 m3 (club domestic) tops out at 2.09, never the supply 3.69", () => {
    const r = lossCharge(50, rates, "domestic_standard", "club", 0);
    expect(r.breakdown.at(-1)).toEqual({ m3: 10, rate: 2.09, amount: 20.9 });
  });
});

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

describe("quotas + sanitation", () => {
  it("domestic 13-15mm service quota 4.00; sanitation fixed 2.00; variable 0.52", () => {
    expect(waterQuota("13-15mm", "domestic_standard", rates).fee).toBe(4.0);
    const s = sanitation(25, "13-15mm", "domestic_standard", rates);
    expect(s.fixed.fee).toBe(2.0);
    expect(s.variableAmount).toBe(13.0);
  });
  it("tourist 40mm: service quota 65.00, sanitation fixed 10.00 (25-40mm bracket)", () => {
    expect(waterQuota("40mm", "industrial_tourist", rates).fee).toBe(65.0);
    expect(sanitation(20, "40mm", "industrial_tourist", rates).fixed.fee).toBe(10.0);
  });
  it("bracket resolution: 30mm industrial sanitation lands in 25-40mm; 65mm in 50-65mm", () => {
    expect(resolveQuota(rates.sanitation.fixed.industrial, "30mm").fee).toBe(10.0);
    expect(resolveQuota(rates.sanitation.fixed.industrial, "65mm").fee).toBe(20.0);
  });
  it("reduced sanitation variable is 0.39", () => {
    expect(sanitation(10, "13-15mm", "domestic_reduced", rates).variableAmount).toBe(3.9);
  });
});

describe("fullBill — validated per-line IGIC anchors", () => {
  it("25 m3 domestic, mains sewer, 13-15mm = 41.78 EUR (the corrected anchor, not the old 40.45)", () => {
    const b = fullBill({ rates, category: "domestic_standard", m3: 25 });
    expect(b.base0).toBe(21.45);
    expect(b.base7).toBe(19.0); // 4.00 + 2.00 + 13.00
    expect(b.igic).toBe(1.33);
    expect(b.total).toBe(41.78);
  });
  it("45 m3 domestic = 94.01 EUR total (62.55 consumption)", () => {
    const b = fullBill({ rates, category: "domestic_standard", m3: 45 });
    expect(b.base0).toBe(62.55);
    expect(b.total).toBe(94.01);
  });
  it("canal merged-loss case: 13 m3 used + 65 m3 loss, mains sewer = 197.97 EUR (proves merged-block maths)", () => {
    const b = fullBill({ rates, category: "domestic_standard", m3: 13, lossM3: 65, biller: "canal" });
    expect(b.base0).toBe(184.32); // one combined 78 m3 run: 6.00+20.60+17.50+140.22
    expect(b.base7).toBe(12.76); // 4.00 + 2.00 + 6.76 (sanitation variable on ACTUAL 13 m3 only)
    expect(b.igic).toBe(0.89);
    expect(b.total).toBe(197.97);
  });
  it("club domestic SEPTIC case: 29 m3 + 40 m3 separate loss line, no sanitation lines", () => {
    const b = fullBill({ rates, category: "domestic_standard", m3: 29, lossM3: 40, biller: "club", onMainsSewer: false });
    const kinds = b.lines.map((l) => l.kind);
    expect(kinds).toEqual(["consumption", "loss", "water_quota"]);
    expect(b.lines[0]!.amount).toBe(25.57); // 6.00 + 19@1.03
    expect(b.lines[1]!.amount).toBe(43.7); // separate Perdida domestica at LOSS rates
    expect(b.base7).toBe(4.0); // quota only — septic = zero sanitation
    expect(b.total).toBe(round2(25.57 + 43.7 + 4.0 + 0.28));
  });
  it("tourist case: flat 2.91 supply, 40mm quotas, flat 1.88 loss, industrial sanitation", () => {
    const b = fullBill({ rates, category: "industrial_tourist", m3: 20, lossM3: 12, biller: "club", caliber: "40mm" });
    expect(b.lines.find((l) => l.kind === "consumption")!.amount).toBe(58.2);
    expect(b.lines.find((l) => l.kind === "loss")!.amount).toBe(22.56);
    expect(b.lines.find((l) => l.kind === "water_quota")!.amount).toBe(65.0);
    expect(b.lines.find((l) => l.kind === "sanitation_fixed")!.amount).toBe(10.0);
    expect(b.lines.find((l) => l.kind === "sanitation_variable")!.amount).toBe(10.4);
  });
  it("zero consumption still pays the quotas", () => {
    const b = fullBill({ rates, category: "domestic_standard", m3: 0 });
    expect(b.base0).toBe(0);
    expect(b.base7).toBe(6.0);
    expect(b.total).toBe(round2(6.0 + 0.42));
  });
  it("reports the Tier-1 fields it consumed (disclaimer layer input)", () => {
    const noLoss = fullBill({ rates, category: "domestic_standard", m3: 25 });
    expect(noLoss.fieldsUsed).toEqual(["tariff_category", "meter_caliber", "on_mains_sewer"]);
    const withLoss = fullBill({ rates, category: "domestic_standard", m3: 13, lossM3: 65, biller: "canal" });
    expect(withLoss.fieldsUsed).toContain("biller");
    expect(withLoss.fieldsUsed).toContain("typical_loss");
  });
});

describe("marginalCost — the sanitation-inclusive anchor", () => {
  it("10 m3 landing wholly in block 2, domestic, mains sewer = 15.86 EUR (10x1.03 + 10x0.5564)", () => {
    const m = marginalCost(10_000, 15, "domestic_standard", rates);
    expect(m.supplyEuros).toBe(10.3);
    expect(m.sanitationEuros).toBe(5.56);
    expect(m.totalEuros).toBe(15.86);
    expect(m.blocksTouched).toEqual([{ m3: 10, rate: 1.03, amount: 10.3 }]);
  });
  it("same volume on a septic tank = 10.30 EUR (no sewerage)", () => {
    const m = marginalCost(10_000, 15, "domestic_standard", rates, { onMainsSewer: false });
    expect(m.totalEuros).toBe(10.3);
    expect(m.sanitationEuros).toBe(0);
  });
  it("canal-merged prior loss moves the block position", () => {
    // 13 m3 own use + 65 m3 loss already billed (canal): the NEXT m3 starts at 78 -> block 4 (3.69)
    const m = marginalCost(1_000, 13, "domestic_standard", rates, { biller: "canal", priorLossM3: 65 });
    expect(m.startsAtM3).toBe(78);
    expect(m.blocksTouched[0]!.rate).toBe(3.69);
    // club: the same prior loss does NOT move the customer's own block position
    const c = marginalCost(1_000, 13, "domestic_standard", rates, { biller: "club", priorLossM3: 65 });
    expect(c.startsAtM3).toBe(13);
    expect(c.blocksTouched[0]!.rate).toBe(1.03);
  });
  it("straddles blocks correctly", () => {
    // 8 m3 starting at 26: 4 m3 @1.03 + 4 m3 @1.75 = 4.12 + 7.00 = 11.12 supply
    const m = marginalCost(8_000, 26, "domestic_standard", rates, { onMainsSewer: false });
    expect(m.supplyEuros).toBe(11.12);
    expect(m.blocksTouched.map((b) => b.rate)).toEqual([1.03, 1.75]);
  });
});

describe("blockCharge primitive", () => {
  it("caps at block boundaries and rounds per block", () => {
    const { total, breakdown } = blockCharge(78, rates.supply.domestic_standard!.blocks!);
    expect(breakdown).toEqual([
      { m3: 10, rate: 0.6, amount: 6.0 },
      { m3: 20, rate: 1.03, amount: 20.6 },
      { m3: 10, rate: 1.75, amount: 17.5 },
      { m3: 38, rate: 3.69, amount: 140.22 },
    ]);
    expect(total).toBe(184.32);
  });
});

describe("2026 proposed set", () => {
  it("carries the announced domestic blocks 0.69/1.19/2.01/4.25", () => {
    expect(proposed.supply.domestic_standard!.blocks!.map((b) => b.rate)).toEqual([0.69, 1.19, 2.01, 4.25]);
    expect(proposed.supply.domestic_standard!.source).toBe("announced-proposal");
  });
  it("announced industrial flat 3.35; derived figures flagged as estimates", () => {
    expect(proposed.supply.industrial_tourist!.flatRate).toBe(3.35);
    expect(proposed.supply.domestic_reduced!.source).toBe("derived-estimate");
  });
  it("is dearer than 2011 on a like-for-like bill", () => {
    const a = fullBill({ rates, category: "domestic_standard", m3: 25 }).total;
    const b = fullBill({ rates: proposed, category: "domestic_standard", m3: 25 }).total;
    expect(b).toBeGreaterThan(a);
  });
});
