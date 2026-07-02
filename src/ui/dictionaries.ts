export interface CalculatorDictionary {
  title: string;
  intro: string;
  categoryLabel: string;
  categoryHelp: string;
  categories: { domestic_standard: string; domestic_reduced: string; industrial_tourist: string };
  m3Label: string;
  m3Help: string;
  billerLabel: string;
  billerHelp: string;
  billers: { club: string; canal: string };
  caliberLabel: string;
  caliberHelp: string;
  sewerLabel: string;
  sewerHelp: string;
  sewerOn: string;
  sewerOff: string;
  lossLabel: string;
  lossHelp: string;
  lossPlaceholder: string;
  versionLabel: string;
  versions: { current: string; proposed: string };
  resultTitle: string;
  perPeriod: string;
  igicLine: string;
  totalLabel: string;
  proposedDelta: (delta: string) => string;
  blocksTitle: string;
  lossDisclaimer: string;
  estimateNote: string;
  sourceNote: string;
  lineLabels: {
    consumption: string;
    consumptionMerged: string;
    loss: string;
    water_quota: string;
    sanitation_fixed: string;
    sanitation_variable: string;
  };
}

export const en: CalculatorDictionary = {
  title: "Lanzarote water bill calculator",
  intro: "Work out a bi-monthly water bill under the island's regulated tariff. Same prices for Canal Gestión and Club Lanzarote.",
  categoryLabel: "What kind of supply is it?",
  categoryHelp: "This is the biggest cost lever — holiday-let/commercial pays a much higher flat rate.",
  categories: {
    domestic_standard: "Home (standard)",
    domestic_reduced: "Home (large family / pensioner reduced rate)",
    industrial_tourist: "Holiday let / commercial",
  },
  m3Label: "Water used in the billing period (m³)",
  m3Help: "Your bill covers roughly two months. 1 m³ = 1,000 litres.",
  billerLabel: "Who sends your bill?",
  billerHelp: "Prices are identical; they present the network-loss charge differently.",
  billers: { club: "Club Lanzarote", canal: "Canal Gestión" },
  caliberLabel: "Meter size",
  caliberHelp: "On your bill as 'calibre'. Most homes are 13–15 mm.",
  sewerLabel: "Sewerage (saneamiento) on your bill?",
  sewerHelp:
    "Check a recent bill — it's the only reliable guide. Septic-tank homes never have sewerage lines, and some mains-sewer homes aren't billed sewerage on the water bill either.",
  sewerOn: "My bill has sewerage lines",
  sewerOff: "No sewerage lines on my bill",
  lossLabel: "Network-loss m³ on your bill (optional)",
  lossHelp: "The 'Diferencia contador general' line — your share of the community's general-meter difference. Only your bill knows it.",
  lossPlaceholder: "e.g. 12",
  versionLabel: "Tariff",
  versions: { current: "Current (2011, in force)", proposed: "Proposed +15% (not in force)" },
  resultTitle: "Your estimated bill",
  perPeriod: "per billing period (~2 months)",
  igicLine: "IGIC (7% on quotas & sewerage)",
  totalLabel: "Total",
  proposedDelta: (d) => `Under the proposed +15% tariff this bill would be ${d} more.`,
  blocksTitle: "How your m³ land in the price blocks",
  lossDisclaimer:
    "Without the network-loss ('Diferencia') figure from a real bill, this estimate covers your own use only — many Lanzarote bills add a significant shared-loss charge on top.",
  estimateNote: "Estimate for guidance. Your bill's printed period dates and figures always win.",
  sourceNote: "Rates: Consorcio del Agua de Lanzarote tariff (BOP 06/07/2011), validated against real bills.",
  lineLabels: {
    consumption: "Water consumption",
    consumptionMerged: "Water consumption incl. network-loss m³",
    loss: "Network loss (Diferencia contador general)",
    water_quota: "Water service quota",
    sanitation_fixed: "Sewerage service quota",
    sanitation_variable: "Sewerage on consumption",
  },
};

export const es: CalculatorDictionary = {
  title: "Calculadora de la factura de agua de Lanzarote",
  intro: "Calcula una factura bimestral con la tarifa regulada de la isla. Mismos precios para Canal Gestión y Club Lanzarote.",
  categoryLabel: "¿Qué tipo de suministro es?",
  categoryHelp: "Es el factor que más cambia el precio: el uso turístico/comercial paga una tarifa plana mucho más alta.",
  categories: {
    domestic_standard: "Vivienda (doméstica)",
    domestic_reduced: "Vivienda (familia numerosa / pensionista, tarifa reducida)",
    industrial_tourist: "Alquiler vacacional / comercial",
  },
  m3Label: "Agua consumida en el periodo (m³)",
  m3Help: "La factura cubre unos dos meses. 1 m³ = 1.000 litros.",
  billerLabel: "¿Quién te factura?",
  billerHelp: "Los precios son idénticos; presentan la pérdida de red de forma distinta.",
  billers: { club: "Club Lanzarote", canal: "Canal Gestión" },
  caliberLabel: "Calibre del contador",
  caliberHelp: "Aparece en tu factura como 'calibre'. La mayoría de viviendas: 13–15 mm.",
  sewerLabel: "¿Saneamiento en tu factura?",
  sewerHelp:
    "Compruébalo en una factura reciente: es la única guía fiable. Las viviendas con fosa séptica nunca llevan saneamiento, y algunas conectadas al alcantarillado tampoco lo pagan en la factura del agua.",
  sewerOn: "Mi factura incluye saneamiento",
  sewerOff: "Mi factura no lleva líneas de saneamiento",
  lossLabel: "m³ de pérdida de red en tu factura (opcional)",
  lossHelp: "La línea 'Diferencia contador general': tu parte de la diferencia del contador general de la comunidad. Solo tu factura la conoce.",
  lossPlaceholder: "p. ej. 12",
  versionLabel: "Tarifa",
  versions: { current: "Vigente (2011)", proposed: "Propuesta +15% (no vigente)" },
  resultTitle: "Tu factura estimada",
  perPeriod: "por periodo de facturación (~2 meses)",
  igicLine: "IGIC (7% sobre cuotas y saneamiento)",
  totalLabel: "Total",
  proposedDelta: (d) => `Con la tarifa propuesta (+15%) esta factura subiría ${d}.`,
  blocksTitle: "Cómo caen tus m³ en los tramos",
  lossDisclaimer:
    "Sin el dato de pérdida de red ('Diferencia') de una factura real, esta estimación solo cubre tu consumo propio; muchas facturas de Lanzarote añaden un cargo de pérdidas comunitarias importante.",
  estimateNote: "Estimación orientativa. Mandan siempre las fechas y cifras impresas en tu factura.",
  sourceNote: "Tarifas: Consorcio del Agua de Lanzarote (BOP 06/07/2011), validadas con facturas reales.",
  lineLabels: {
    consumption: "Consumo de agua",
    consumptionMerged: "Consumo de agua incl. m³ de pérdida de red",
    loss: "Pérdida de red (Diferencia contador general)",
    water_quota: "Cuota servicio agua",
    sanitation_fixed: "Saneamiento cuota servicio",
    sanitation_variable: "Saneamiento consumo",
  },
};
