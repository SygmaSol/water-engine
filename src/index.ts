export const VERSION = "0.1.0";

export * from "./types.js";
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
