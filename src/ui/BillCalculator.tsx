import { useEffect, useId, useMemo, useState } from "react";
import type { Biller, Caliber, Category, RateSet } from "../types.js";
import { fullBill } from "../tariff.js";
import { pickRateSet } from "../rates.js";
import type { CalculatorDictionary } from "./dictionaries.js";

export interface BillCalculatorProps {
  dictionary: CalculatorDictionary;
  /** Rate sets loaded by the host (from the water_tariffs store; fixture as offline fallback). */
  rateSets: RateSet[];
  /** localStorage key for input persistence; omit to disable persistence (e.g. SSR harnesses). */
  persistKey?: string;
  defaultCategory?: Category;
  className?: string;
}

interface CalcState {
  category: Category;
  m3: number;
  biller: Biller;
  caliber: Caliber;
  onMainsSewer: boolean;
  lossM3: number | "";
  rateSetId: string;
}

const DEFAULTS: CalcState = {
  category: "domestic_standard",
  m3: 25,
  biller: "club",
  caliber: "13-15mm",
  onMainsSewer: true,
  lossM3: "",
  rateSetId: "2011_current",
};

const DOMESTIC_CALIBERS: Caliber[] = ["13-15mm", "20mm", "25mm", "30mm", "40mm"];
const INDUSTRIAL_CALIBERS: Caliber[] = ["13-15mm", "20mm", "25mm", "30mm", "40mm", "50mm", "65mm", "80mm", "100mm+"];

function loadPersisted(key: string | undefined): Partial<CalcState> {
  if (!key || typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Partial<CalcState>;
  } catch {
    return {};
  }
}

const euro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export function BillCalculator({ dictionary: t, rateSets, persistKey, defaultCategory, className }: BillCalculatorProps) {
  const [state, setState] = useState<CalcState>(() => {
    // Restore sticky inputs (m3, biller, caliber...) but NEVER the rate type: every visit starts on
    // the standard home rate so nobody reads a reduced/holiday-let figure without choosing it.
    const persisted = loadPersisted(persistKey);
    delete persisted.category;
    return {
      ...DEFAULTS,
      ...(defaultCategory ? { category: defaultCategory } : {}),
      ...persisted,
    };
  });

  useEffect(() => {
    if (persistKey && typeof window !== "undefined") {
      window.localStorage.setItem(persistKey, JSON.stringify(state));
    }
  }, [state, persistKey]);

  const set = <K extends keyof CalcState>(k: K, v: CalcState[K]) => setState((s) => ({ ...s, [k]: v }));
  // Category switch can invalidate the caliber (industrial meters go beyond the domestic table).
  const setCategory = (c: Category) =>
    setState((s) => {
      const allowed = c === "industrial_tourist" ? INDUSTRIAL_CALIBERS : DOMESTIC_CALIBERS;
      return { ...s, category: c, caliber: allowed.includes(s.caliber) ? s.caliber : "13-15mm" };
    });
  const uid = useId();

  const rates = useMemo(() => pickRateSet(rateSets, state.rateSetId), [rateSets, state.rateSetId]);
  const current = useMemo(() => pickRateSet(rateSets, "2011_current"), [rateSets]);
  const proposed = useMemo(() => rateSets.find((r) => r.id === "2026_proposed"), [rateSets]);

  const lossM3 = state.lossM3 === "" ? 0 : Math.max(0, Number(state.lossM3) || 0);
  const inputs = {
    category: state.category,
    m3: state.m3,
    lossM3,
    biller: state.biller,
    caliber: state.caliber,
    onMainsSewer: state.onMainsSewer,
  };
  const bill = useMemo(() => fullBill({ rates, ...inputs }), [rates, state, lossM3]);
  const deltaVsProposed = useMemo(() => {
    if (!proposed) return null;
    const a = fullBill({ rates: current, ...inputs }).total;
    const b = fullBill({ rates: proposed, ...inputs }).total;
    return b - a;
  }, [current, proposed, state, lossM3]);

  const calibers = state.category === "industrial_tourist" ? INDUSTRIAL_CALIBERS : DOMESTIC_CALIBERS;
  const consumptionLine = bill.lines.find((l) => l.kind === "consumption");
  const maxBlockAmount = Math.max(...(consumptionLine?.breakdown?.map((b) => b.amount) ?? [1]), 0.01);

  return (
    <div className={`mx-auto w-full max-w-xl rounded-lg border border-t-4 border-slate-200 border-t-[hsl(33,93%,54%)] bg-white p-4 text-slate-900 shadow-sm sm:p-6 ${className ?? ""}`}>
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{t.intro}</p>

      {/* D2: category first + prominent */}
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">{t.categoryLabel}</legend>
        <p className="mb-2 text-xs text-slate-500">{t.categoryHelp}</p>
        <div className="grid gap-2">
          {(Object.keys(t.categories) as Category[]).map((c) => (
            <label
              key={c}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                state.category === c ? "border-[hsl(33,93%,54%)] bg-[hsl(33,93%,96%)] font-medium" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name={`${uid}-category`}
                value={c}
                checked={state.category === c}
                onChange={() => setCategory(c)}
                className="h-4 w-4 accent-[hsl(33,93%,54%)]"
              />
              {t.categories[c]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <label className="text-sm font-semibold" htmlFor={`${uid}-m3`}>
          {t.m3Label}
        </label>
        <p className="text-xs text-slate-500">{t.m3Help}</p>
        <div className="mt-2 flex items-center gap-3">
          <input
            id={`${uid}-m3`}
            type="range"
            min={0}
            max={150}
            value={state.m3}
            onChange={(e) => set("m3", Number(e.target.value))}
            className="h-2 w-full accent-[hsl(33,93%,54%)]"
          />
          <input
            type="number"
            min={0}
            value={state.m3}
            onChange={(e) => set("m3", Math.max(0, Number(e.target.value) || 0))}
            className="w-20 rounded-lg border border-slate-300 p-2 text-right text-sm"
            aria-label={t.m3Label}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor={`${uid}-biller`}>
            {t.billerLabel}
          </label>
          <p className="text-xs text-slate-500">{t.billerHelp}</p>
          <select
            id={`${uid}-biller`}
            value={state.biller}
            onChange={(e) => set("biller", e.target.value as Biller)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          >
            <option value="club">{t.billers.club}</option>
            <option value="canal">{t.billers.canal}</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor={`${uid}-caliber`}>
            {t.caliberLabel}
          </label>
          <p className="text-xs text-slate-500">{t.caliberHelp}</p>
          <select
            id={`${uid}-caliber`}
            value={state.caliber}
            onChange={(e) => set("caliber", e.target.value as Caliber)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
          >
            {calibers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">{t.sewerLabel}</legend>
        <p className="text-xs text-slate-500">{t.sewerHelp}</p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {[true, false].map((v) => (
            <label
              key={String(v)}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm ${
                state.onMainsSewer === v ? "border-[hsl(33,93%,54%)] bg-[hsl(33,93%,96%)] font-medium" : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                name={`${uid}-sewer`}
                checked={state.onMainsSewer === v}
                onChange={() => set("onMainsSewer", v)}
                className="h-4 w-4 accent-[hsl(33,93%,54%)]"
              />
              {v ? t.sewerOn : t.sewerOff}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <label className="text-sm font-semibold" htmlFor={`${uid}-loss`}>
          {t.lossLabel}
        </label>
        <p className="text-xs text-slate-500">{t.lossHelp}</p>
        <input
          id={`${uid}-loss`}
          type="number"
          min={0}
          placeholder={t.lossPlaceholder}
          value={state.lossM3}
          onChange={(e) => set("lossM3", e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))}
          className="mt-1 w-32 rounded-lg border border-slate-300 p-2 text-sm"
        />
      </div>

      <div className="mt-4">
        <span className="text-sm font-semibold">{t.versionLabel}</span>
        <div className="mt-1 inline-flex w-full rounded-xl border border-slate-200 p-1 text-sm">
          {(["2011_current", "2026_proposed"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => set("rateSetId", id)}
              className={`flex-1 rounded-lg px-3 py-1.5 ${
                state.rateSetId === id ? "bg-[hsl(33,93%,54%)] font-medium text-white" : "text-slate-600"
              }`}
            >
              {id === "2011_current" ? t.versions.current : t.versions.proposed}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      <div className="mt-6 rounded-2xl bg-slate-50 p-4" data-testid="wc-result">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.resultTitle}</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {bill.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="text-slate-600">
                {l.kind === "consumption" && lossM3 > 0 && state.biller === "canal"
                  ? `${t.lineLabels.consumptionMerged} (${state.m3} + ${lossM3} m³)`
                  : `${t.lineLabels[l.kind]}${l.kind === "consumption" ? ` (${l.quantity} m³)` : l.kind === "loss" ? ` (${l.quantity} m³)` : ""}`}
              </span>
              <span className="tabular-nums">{euro(l.amount)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-2 text-slate-600">
            <span>{t.igicLine}</span>
            <span className="tabular-nums">{euro(bill.igic)}</span>
          </li>
        </ul>
        <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3">
          <span className="font-semibold">{t.totalLabel}</span>
          <span>
            <span className="text-2xl font-bold tabular-nums" data-testid="wc-total">
              {euro(bill.total)}
            </span>
            <span className="ml-1 text-xs text-slate-500">{t.perPeriod}</span>
          </span>
        </div>
        {deltaVsProposed !== null && deltaVsProposed > 0 && (
          <p className="mt-2 text-xs text-amber-700">{t.proposedDelta(euro(deltaVsProposed))}</p>
        )}
      </div>

      {/* Block breakdown */}
      {consumptionLine?.breakdown && consumptionLine.breakdown.length > 0 && state.category !== "industrial_tourist" && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">{t.blocksTitle}</h4>
          <p className="mt-0.5 text-sm text-slate-600">{t.blocksHelp}</p>
          <div className="mt-2 space-y-2">
            {consumptionLine.breakdown.map((b, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-slate-700 tabular-nums">
                  {b.m3} m³ × {euro(b.rate)}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <div
                    className="h-full rounded-full bg-[hsl(33,93%,54%)]"
                    style={{ width: `${Math.max(3, (b.amount / maxBlockAmount) * 100)}%` }}
                    title={`${b.m3} m³ × ${euro(b.rate)} = ${euro(b.amount)}`}
                  />
                </div>
                <span className="w-20 shrink-0 text-right font-semibold text-slate-900 tabular-nums">{euro(b.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lossM3 === 0 && <p className="mt-4 text-xs text-slate-500">{t.lossDisclaimer}</p>}
      <p className="mt-2 text-xs text-slate-400">
        {t.estimateNote} {t.sourceNote}
      </p>
    </div>
  );
}
