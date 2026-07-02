// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FIXTURE_RATE_SETS } from "../rates.js";
import { fullBill } from "../tariff.js";
import { pickRateSet } from "../rates.js";
import { BillCalculator } from "./BillCalculator.js";
import { en, es } from "./dictionaries.js";

afterEach(cleanup);

const euro = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const rates = pickRateSet(FIXTURE_RATE_SETS, "2011_current");

describe("BillCalculator", () => {
  it("renders the default 25 m3 domestic bill matching the engine (41.78)", () => {
    render(<BillCalculator dictionary={en} rateSets={FIXTURE_RATE_SETS} />);
    expect(screen.getByTestId("wc-total").textContent).toBe(euro(41.78));
  });

  it("switching to holiday-let/commercial uses the flat tourist rate", () => {
    render(<BillCalculator dictionary={en} rateSets={FIXTURE_RATE_SETS} />);
    fireEvent.click(screen.getByLabelText(en.categories.industrial_tourist));
    const expected = fullBill({ rates, category: "industrial_tourist", m3: 25, caliber: "13-15mm" }).total;
    expect(screen.getByTestId("wc-total").textContent).toBe(euro(expected));
  });

  it("septic toggle removes sewerage lines", () => {
    render(<BillCalculator dictionary={en} rateSets={FIXTURE_RATE_SETS} />);
    fireEvent.click(screen.getByLabelText(en.sewerOff));
    const expected = fullBill({ rates, category: "domestic_standard", m3: 25, onMainsSewer: false }).total;
    expect(screen.getByTestId("wc-total").textContent).toBe(euro(expected));
    expect(screen.queryByText(en.lineLabels.sanitation_fixed)).toBeNull();
  });

  it("network-loss m3 adds the loss stream (club = separate line)", () => {
    render(<BillCalculator dictionary={en} rateSets={FIXTURE_RATE_SETS} />);
    fireEvent.change(screen.getByLabelText(en.lossLabel), { target: { value: "40" } });
    const expected = fullBill({ rates, category: "domestic_standard", m3: 25, lossM3: 40, biller: "club" }).total;
    expect(screen.getByTestId("wc-total").textContent).toBe(euro(expected));
    expect(screen.getByText(new RegExp("Network loss"))).toBeTruthy();
  });

  it("proposed tariff toggle reprices and shows the delta note under current", () => {
    render(<BillCalculator dictionary={en} rateSets={FIXTURE_RATE_SETS} />);
    expect(screen.getByText(/proposed \+15% tariff/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: en.versions.proposed }));
    const proposed = pickRateSet(FIXTURE_RATE_SETS, "2026_proposed");
    const expected = fullBill({ rates: proposed, category: "domestic_standard", m3: 25 }).total;
    expect(screen.getByTestId("wc-total").textContent).toBe(euro(expected));
  });

  it("renders in Spanish from the es dictionary", () => {
    render(<BillCalculator dictionary={es} rateSets={FIXTURE_RATE_SETS} />);
    expect(screen.getByText("Calculadora de la factura de agua de Lanzarote")).toBeTruthy();
    expect(screen.getByLabelText(es.categories.industrial_tourist)).toBeTruthy();
  });

  it("switching back from industrial resets an out-of-range caliber instead of crashing", () => {
    render(<BillCalculator dictionary={en} rateSets={FIXTURE_RATE_SETS} />);
    fireEvent.click(screen.getByLabelText(en.categories.industrial_tourist));
    fireEvent.change(screen.getByLabelText(en.caliberLabel), { target: { value: "65mm" } });
    fireEvent.click(screen.getByLabelText(en.categories.domestic_standard));
    expect((screen.getByLabelText(en.caliberLabel) as HTMLSelectElement).value).toBe("13-15mm");
    expect(screen.getByTestId("wc-total").textContent).toBe(euro(41.78));
  });

  it("persists inputs to localStorage under persistKey", () => {
    render(<BillCalculator dictionary={en} rateSets={FIXTURE_RATE_SETS} persistKey="wc-test" />);
    fireEvent.click(screen.getByLabelText(en.categories.industrial_tourist));
    const saved = JSON.parse(window.localStorage.getItem("wc-test")!);
    expect(saved.category).toBe("industrial_tourist");
  });
});
