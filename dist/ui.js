import {
  fullBill,
  pickRateSet
} from "./chunk-RUVGECG6.js";

// src/ui/BillCalculator.tsx
import { useEffect, useId, useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var DEFAULTS = {
  category: "domestic_standard",
  m3: 25,
  biller: "club",
  caliber: "13-15mm",
  onMainsSewer: true,
  lossM3: "",
  rateSetId: "2011_current"
};
var DOMESTIC_CALIBERS = ["13-15mm", "20mm", "25mm", "30mm", "40mm"];
var INDUSTRIAL_CALIBERS = ["13-15mm", "20mm", "25mm", "30mm", "40mm", "50mm", "65mm", "80mm", "100mm+"];
function loadPersisted(key) {
  if (!key || typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}
var euro = (n) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
function BillCalculator({ dictionary: t, rateSets, persistKey, defaultCategory, className }) {
  const [state, setState] = useState(() => ({
    ...DEFAULTS,
    ...defaultCategory ? { category: defaultCategory } : {},
    ...loadPersisted(persistKey)
  }));
  useEffect(() => {
    if (persistKey && typeof window !== "undefined") {
      window.localStorage.setItem(persistKey, JSON.stringify(state));
    }
  }, [state, persistKey]);
  const set = (k, v) => setState((s) => ({ ...s, [k]: v }));
  const setCategory = (c) => setState((s) => {
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
    onMainsSewer: state.onMainsSewer
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
  const maxBlockAmount = Math.max(...consumptionLine?.breakdown?.map((b) => b.amount) ?? [1], 0.01);
  return /* @__PURE__ */ jsxs("div", { className: `mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-6 ${className ?? ""}`, children: [
    /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold", children: t.title }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-slate-600", children: t.intro }),
    /* @__PURE__ */ jsxs("fieldset", { className: "mt-5", children: [
      /* @__PURE__ */ jsx("legend", { className: "text-sm font-semibold", children: t.categoryLabel }),
      /* @__PURE__ */ jsx("p", { className: "mb-2 text-xs text-slate-500", children: t.categoryHelp }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-2", children: Object.keys(t.categories).map((c) => /* @__PURE__ */ jsxs(
        "label",
        {
          className: `flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${state.category === c ? "border-sky-500 bg-sky-50 font-medium" : "border-slate-200 hover:border-slate-300"}`,
          children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "radio",
                name: `${uid}-category`,
                value: c,
                checked: state.category === c,
                onChange: () => setCategory(c),
                className: "h-4 w-4 accent-sky-600"
              }
            ),
            t.categories[c]
          ]
        },
        c
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
      /* @__PURE__ */ jsx("label", { className: "text-sm font-semibold", htmlFor: `${uid}-m3`, children: t.m3Label }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: t.m3Help }),
      /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center gap-3", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            id: `${uid}-m3`,
            type: "range",
            min: 0,
            max: 150,
            value: state.m3,
            onChange: (e) => set("m3", Number(e.target.value)),
            className: "h-2 w-full accent-sky-600"
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            min: 0,
            value: state.m3,
            onChange: (e) => set("m3", Math.max(0, Number(e.target.value) || 0)),
            className: "w-20 rounded-lg border border-slate-300 p-2 text-right text-sm",
            "aria-label": t.m3Label
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4 grid gap-4 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-sm font-semibold", htmlFor: `${uid}-biller`, children: t.billerLabel }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: t.billerHelp }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            id: `${uid}-biller`,
            value: state.biller,
            onChange: (e) => set("biller", e.target.value),
            className: "mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm",
            children: [
              /* @__PURE__ */ jsx("option", { value: "club", children: t.billers.club }),
              /* @__PURE__ */ jsx("option", { value: "canal", children: t.billers.canal })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-sm font-semibold", htmlFor: `${uid}-caliber`, children: t.caliberLabel }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: t.caliberHelp }),
        /* @__PURE__ */ jsx(
          "select",
          {
            id: `${uid}-caliber`,
            value: state.caliber,
            onChange: (e) => set("caliber", e.target.value),
            className: "mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm",
            children: calibers.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c))
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("fieldset", { className: "mt-4", children: [
      /* @__PURE__ */ jsx("legend", { className: "text-sm font-semibold", children: t.sewerLabel }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: t.sewerHelp }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 grid gap-2 sm:grid-cols-2", children: [true, false].map((v) => /* @__PURE__ */ jsxs(
        "label",
        {
          className: `flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm ${state.onMainsSewer === v ? "border-sky-500 bg-sky-50 font-medium" : "border-slate-200"}`,
          children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "radio",
                name: `${uid}-sewer`,
                checked: state.onMainsSewer === v,
                onChange: () => set("onMainsSewer", v),
                className: "h-4 w-4 accent-sky-600"
              }
            ),
            v ? t.sewerOn : t.sewerOff
          ]
        },
        String(v)
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
      /* @__PURE__ */ jsx("label", { className: "text-sm font-semibold", htmlFor: `${uid}-loss`, children: t.lossLabel }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: t.lossHelp }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: `${uid}-loss`,
          type: "number",
          min: 0,
          placeholder: t.lossPlaceholder,
          value: state.lossM3,
          onChange: (e) => set("lossM3", e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0)),
          className: "mt-1 w-32 rounded-lg border border-slate-300 p-2 text-sm"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
      /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: t.versionLabel }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 inline-flex w-full rounded-xl border border-slate-200 p-1 text-sm", children: ["2011_current", "2026_proposed"].map((id) => /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => set("rateSetId", id),
          className: `flex-1 rounded-lg px-3 py-1.5 ${state.rateSetId === id ? "bg-sky-600 font-medium text-white" : "text-slate-600"}`,
          children: id === "2011_current" ? t.versions.current : t.versions.proposed
        },
        id
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-2xl bg-slate-50 p-4", "data-testid": "wc-result", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold uppercase tracking-wide text-slate-500", children: t.resultTitle }),
      /* @__PURE__ */ jsxs("ul", { className: "mt-2 space-y-1 text-sm", children: [
        bill.lines.map((l, i) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-slate-600", children: l.kind === "consumption" && lossM3 > 0 && state.biller === "canal" ? `${t.lineLabels.consumptionMerged} (${state.m3} + ${lossM3} m\xB3)` : `${t.lineLabels[l.kind]}${l.kind === "consumption" ? ` (${l.quantity} m\xB3)` : l.kind === "loss" ? ` (${l.quantity} m\xB3)` : ""}` }),
          /* @__PURE__ */ jsx("span", { className: "tabular-nums", children: euro(l.amount) })
        ] }, i)),
        /* @__PURE__ */ jsxs("li", { className: "flex justify-between gap-2 text-slate-600", children: [
          /* @__PURE__ */ jsx("span", { children: t.igicLine }),
          /* @__PURE__ */ jsx("span", { className: "tabular-nums", children: euro(bill.igic) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3", children: [
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: t.totalLabel }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-2xl font-bold tabular-nums", "data-testid": "wc-total", children: euro(bill.total) }),
          /* @__PURE__ */ jsx("span", { className: "ml-1 text-xs text-slate-500", children: t.perPeriod })
        ] })
      ] }),
      deltaVsProposed !== null && deltaVsProposed > 0 && /* @__PURE__ */ jsx("p", { className: "mt-2 text-xs text-amber-700", children: t.proposedDelta(euro(deltaVsProposed)) })
    ] }),
    consumptionLine?.breakdown && consumptionLine.breakdown.length > 0 && state.category !== "industrial_tourist" && /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
      /* @__PURE__ */ jsx("h4", { className: "text-sm font-semibold", children: t.blocksTitle }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 space-y-1.5", children: consumptionLine.breakdown.map((b, i) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
        /* @__PURE__ */ jsxs("span", { className: "w-24 shrink-0 text-slate-500 tabular-nums", children: [
          b.m3,
          " m\xB3 \xD7 ",
          euro(b.rate)
        ] }),
        /* @__PURE__ */ jsx("div", { className: "h-3 flex-1 overflow-hidden rounded bg-slate-100", children: /* @__PURE__ */ jsx(
          "div",
          {
            className: "h-full rounded bg-sky-500",
            style: { width: `${Math.max(2, b.amount / maxBlockAmount * 100)}%` }
          }
        ) }),
        /* @__PURE__ */ jsx("span", { className: "w-16 shrink-0 text-right tabular-nums", children: euro(b.amount) })
      ] }, i)) })
    ] }),
    lossM3 === 0 && /* @__PURE__ */ jsx("p", { className: "mt-4 text-xs text-slate-500", children: t.lossDisclaimer }),
    /* @__PURE__ */ jsxs("p", { className: "mt-2 text-xs text-slate-400", children: [
      t.estimateNote,
      " ",
      t.sourceNote
    ] })
  ] });
}

// src/ui/dictionaries.ts
var en = {
  title: "Lanzarote water bill calculator",
  intro: "Work out a bi-monthly water bill under the island's regulated tariff. Same prices for Canal Gesti\xF3n and Club Lanzarote.",
  categoryLabel: "What kind of supply is it?",
  categoryHelp: "This is the biggest cost lever \u2014 holiday-let/commercial pays a much higher flat rate.",
  categories: {
    domestic_standard: "Home (standard)",
    domestic_reduced: "Home (large family / pensioner reduced rate)",
    industrial_tourist: "Holiday let / commercial"
  },
  m3Label: "Water used in the billing period (m\xB3)",
  m3Help: "Your bill covers roughly two months. 1 m\xB3 = 1,000 litres.",
  billerLabel: "Who sends your bill?",
  billerHelp: "Prices are identical; they present the network-loss charge differently.",
  billers: { club: "Club Lanzarote", canal: "Canal Gesti\xF3n" },
  caliberLabel: "Meter size",
  caliberHelp: "On your bill as 'calibre'. Most homes are 13\u201315 mm.",
  sewerLabel: "Sewerage (saneamiento) on your bill?",
  sewerHelp: "Check a recent bill \u2014 it's the only reliable guide. Septic-tank homes never have sewerage lines, and some mains-sewer homes aren't billed sewerage on the water bill either.",
  sewerOn: "My bill has sewerage lines",
  sewerOff: "No sewerage lines on my bill",
  lossLabel: "Network-loss m\xB3 on your bill (optional)",
  lossHelp: "The 'Diferencia contador general' line \u2014 your share of the community's general-meter difference. Only your bill knows it.",
  lossPlaceholder: "e.g. 12",
  versionLabel: "Tariff",
  versions: { current: "Current (2011, in force)", proposed: "Proposed +15% (not in force)" },
  resultTitle: "Your estimated bill",
  perPeriod: "per billing period (~2 months)",
  igicLine: "IGIC (7% on quotas & sewerage)",
  totalLabel: "Total",
  proposedDelta: (d) => `Under the proposed +15% tariff this bill would be ${d} more.`,
  blocksTitle: "How your m\xB3 land in the price blocks",
  lossDisclaimer: "Without the network-loss ('Diferencia') figure from a real bill, this estimate covers your own use only \u2014 many Lanzarote bills add a significant shared-loss charge on top.",
  estimateNote: "Estimate for guidance. Your bill's printed period dates and figures always win.",
  sourceNote: "Rates: Consorcio del Agua de Lanzarote tariff (BOP 06/07/2011), validated against real bills.",
  lineLabels: {
    consumption: "Water consumption",
    consumptionMerged: "Water consumption incl. network-loss m\xB3",
    loss: "Network loss (Diferencia contador general)",
    water_quota: "Water service quota",
    sanitation_fixed: "Sewerage service quota",
    sanitation_variable: "Sewerage on consumption"
  }
};
var es = {
  title: "Calculadora de la factura de agua de Lanzarote",
  intro: "Calcula una factura bimestral con la tarifa regulada de la isla. Mismos precios para Canal Gesti\xF3n y Club Lanzarote.",
  categoryLabel: "\xBFQu\xE9 tipo de suministro es?",
  categoryHelp: "Es el factor que m\xE1s cambia el precio: el uso tur\xEDstico/comercial paga una tarifa plana mucho m\xE1s alta.",
  categories: {
    domestic_standard: "Vivienda (dom\xE9stica)",
    domestic_reduced: "Vivienda (familia numerosa / pensionista, tarifa reducida)",
    industrial_tourist: "Alquiler vacacional / comercial"
  },
  m3Label: "Agua consumida en el periodo (m\xB3)",
  m3Help: "La factura cubre unos dos meses. 1 m\xB3 = 1.000 litros.",
  billerLabel: "\xBFQui\xE9n te factura?",
  billerHelp: "Los precios son id\xE9nticos; presentan la p\xE9rdida de red de forma distinta.",
  billers: { club: "Club Lanzarote", canal: "Canal Gesti\xF3n" },
  caliberLabel: "Calibre del contador",
  caliberHelp: "Aparece en tu factura como 'calibre'. La mayor\xEDa de viviendas: 13\u201315 mm.",
  sewerLabel: "\xBFSaneamiento en tu factura?",
  sewerHelp: "Compru\xE9balo en una factura reciente: es la \xFAnica gu\xEDa fiable. Las viviendas con fosa s\xE9ptica nunca llevan saneamiento, y algunas conectadas al alcantarillado tampoco lo pagan en la factura del agua.",
  sewerOn: "Mi factura incluye saneamiento",
  sewerOff: "Mi factura no lleva l\xEDneas de saneamiento",
  lossLabel: "m\xB3 de p\xE9rdida de red en tu factura (opcional)",
  lossHelp: "La l\xEDnea 'Diferencia contador general': tu parte de la diferencia del contador general de la comunidad. Solo tu factura la conoce.",
  lossPlaceholder: "p. ej. 12",
  versionLabel: "Tarifa",
  versions: { current: "Vigente (2011)", proposed: "Propuesta +15% (no vigente)" },
  resultTitle: "Tu factura estimada",
  perPeriod: "por periodo de facturaci\xF3n (~2 meses)",
  igicLine: "IGIC (7% sobre cuotas y saneamiento)",
  totalLabel: "Total",
  proposedDelta: (d) => `Con la tarifa propuesta (+15%) esta factura subir\xEDa ${d}.`,
  blocksTitle: "C\xF3mo caen tus m\xB3 en los tramos",
  lossDisclaimer: "Sin el dato de p\xE9rdida de red ('Diferencia') de una factura real, esta estimaci\xF3n solo cubre tu consumo propio; muchas facturas de Lanzarote a\xF1aden un cargo de p\xE9rdidas comunitarias importante.",
  estimateNote: "Estimaci\xF3n orientativa. Mandan siempre las fechas y cifras impresas en tu factura.",
  sourceNote: "Tarifas: Consorcio del Agua de Lanzarote (BOP 06/07/2011), validadas con facturas reales.",
  lineLabels: {
    consumption: "Consumo de agua",
    consumptionMerged: "Consumo de agua incl. m\xB3 de p\xE9rdida de red",
    loss: "P\xE9rdida de red (Diferencia contador general)",
    water_quota: "Cuota servicio agua",
    sanitation_fixed: "Saneamiento cuota servicio",
    sanitation_variable: "Saneamiento consumo"
  }
};
export {
  BillCalculator,
  en,
  es
};
//# sourceMappingURL=ui.js.map