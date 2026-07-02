import { describe, expect, it } from "vitest";
import { VERSION, round2 } from "./index.js";

describe("round2", () => {
  it("rounds euro amounts to the cent", () => {
    expect(round2(21.454999)).toBe(21.45);
    expect(round2(21.455)).toBe(21.46);
    expect(round2(0)).toBe(0);
    expect(round2(140.22)).toBe(140.22);
  });
});

describe("package", () => {
  it("exposes a version", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
