export const VERSION = "0.3.0";

export * from "./types.js";
export {
  LANZAROTE_POOL_EVAPORATION,
  poolVolume,
  topUpLoss,
  topUpCost,
  activityCost,
} from "./estimate.js";
export type { PoolShape, PoolDims, CostRange } from "./estimate.js";
export {
  round2,
  blockCharge,
  consumptionCharge,
  lossCharge,
  resolveQuota,
  waterQuota,
  sanitation,
  fullBill,
  marginalCost,
} from "./tariff.js";
export { FIXTURE_RATE_SETS, pickRateSet, assertRateSet, fetchRateSets } from "./rates.js";
