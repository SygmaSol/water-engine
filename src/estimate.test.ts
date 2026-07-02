import { describe, expect, it } from "vitest";
import { LANZAROTE_POOL_EVAPORATION, activityCost, poolVolume, topUpCost, topUpLoss } from "./estimate.js";
import { FIXTURE_RATE_SETS, pickRateSet } from "./rates.js";

const rates = pickRateSet(FIXTURE_RATE_SETS, "2011_current");

describe("poolVolume", () => {
  it("rectangular 8x4x1.5m = 48,000 L", () => {
    expect(poolVolume("rectangular", { lengthM: 8, widthM: 4, avgDepthM: 1.5 })).toBe(48000);
  });
  it("circular d=4m, 1.2m deep ~ 15,080 L", () => {
    expect(poolVolume("circular", { diameterM: 4, avgDepthM: 1.2 })).toBe(15080);
  });
  it("oval 8x4 ~ pi/4 of the rectangle", () => {
    const oval = poolVolume("oval", { lengthM: 8, widthM: 4, avgDepthM: 1.5 });
    expect(oval).toBe(Math.round(Math.PI * 4 * 2 * 1.5 * 1000));
  });
  it("kidney uses the 0.75 industry approximation", () => {
    expect(poolVolume("kidney", { lengthM: 8, widthM: 4, avgDepthM: 1.5 })).toBe(36000);
  });
});

describe("topUpLoss (surface area x drop — depth is irrelevant)", () => {
  it("8x4m pool, 2cm drop = 640 L (the spec anchor)", () => {
    expect(topUpLoss(8, 4, 2)).toBe(640);
  });
  it("scales linearly with drop", () => {
    expect(topUpLoss(8, 4, 4)).toBe(1280);
  });
});

describe("topUpCost", () => {
  it("640 L domestic on-top range: block-2 floor to top-block ceiling, sanitation included", () => {
    const r = topUpCost(640, "domestic_standard", rates);
    // low: 0.64x1.03 + 0.64x0.52x1.07 = 0.66 + 0.36 = 1.02; high: 0.64x3.69 + 0.36 = 2.72
    expect(r.lowEuros).toBe(1.02);
    expect(r.highEuros).toBe(2.72);
  });
  it("flat tourist category collapses the range", () => {
    const r = topUpCost(640, "industrial_tourist", rates);
    expect(r.lowEuros).toBe(r.highEuros);
  });
  it("not-on-top prices from block 1", () => {
    const r = topUpCost(640, "domestic_standard", rates, { onTopOfHomeUse: false });
    expect(r.lowEuros).toBe(r.highEuros);
    expect(r.lowEuros).toBeLessThan(1.02);
  });
  it("septic drops the sewerage component", () => {
    const mains = topUpCost(640, "domestic_standard", rates);
    const septic = topUpCost(640, "domestic_standard", rates, { onMainsSewer: false });
    expect(septic.highEuros).toBeLessThan(mains.highEuros);
  });
});

describe("activityCost", () => {
  it("30 baths at 80 L, domestic mains = 2400 L at block-2 marginal", () => {
    const r = activityCost({ litresPerUnit: 80, count: 30, category: "domestic_standard", rates });
    // 2.4x1.03 + 2.4x0.5564 = 2.47 + 1.34 = 3.81
    expect(r.litres).toBe(2400);
    expect(r.euros).toBe(3.81);
  });
});

describe("Lanzarote evaporation benchmark (sourced)", () => {
  it("carries the citation and the 5cm/week leak threshold", () => {
    expect(LANZAROTE_POOL_EVAPORATION.leakSuspicionCmPerWeek).toBe(5);
    expect(LANZAROTE_POOL_EVAPORATION.sourceUrl).toContain("canary-detect.com");
  });
});
