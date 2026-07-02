export const VERSION = "0.0.1";

/** Round to 2 decimal places (euro cents). All engine money maths rounds per line, like the bills do. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
