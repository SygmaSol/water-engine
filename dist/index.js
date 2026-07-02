// src/index.ts
var VERSION = "0.0.1";
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
export {
  VERSION,
  round2
};
//# sourceMappingURL=index.js.map