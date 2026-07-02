// src/tariff.ts
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function blockCharge(m3, blocks) {
  if (m3 < 0) throw new Error(`blockCharge: negative volume ${m3}`);
  let remaining = m3;
  let lastCap = 0;
  let total = 0;
  const breakdown = [];
  for (const b of blocks) {
    const cap = b.upTo ?? Infinity;
    const used = Math.max(0, Math.min(remaining, cap - lastCap));
    if (used > 0) {
      const amount = round2(used * b.rate);
      breakdown.push({ m3: used, rate: b.rate, amount });
      total += amount;
      remaining -= used;
    }
    lastCap = cap;
    if (remaining <= 0) break;
  }
  return { total: round2(total), breakdown };
}
function componentCharge(m3, comp) {
  if (comp.mode === "flat") {
    const amount = round2(m3 * (comp.flatRate ?? 0));
    return { total: amount, breakdown: [{ m3, rate: comp.flatRate ?? 0, amount }] };
  }
  return blockCharge(m3, comp.blocks ?? []);
}
function consumptionCharge(m3, rates, category) {
  const comp = rates.supply[category];
  if (!comp) throw new Error(`No supply rates for category '${category}' in set '${rates.id}'`);
  return componentCharge(m3, comp);
}
function lossCharge(lossM3, rates, category, biller, consumptionM3) {
  if (lossM3 === 0) return { total: 0, breakdown: [] };
  if (biller === "club") {
    const comp = rates.loss[category];
    if (!comp) throw new Error(`No loss rates for category '${category}' in set '${rates.id}'`);
    return componentCharge(lossM3, comp);
  }
  const combined = consumptionCharge(consumptionM3 + lossM3, rates, category);
  const alone = consumptionCharge(consumptionM3, rates, category);
  return { total: round2(combined.total - alone.total), breakdown: combined.breakdown };
}
var CALIBER_TABLE = {
  domestic_standard: "domestic",
  domestic_reduced: "domestic",
  industrial_tourist: "industrial"
};
function parseCaliberMm(caliber) {
  const m = caliber.match(/(\d+)/);
  if (!m) throw new Error(`Unparseable caliber '${caliber}'`);
  return Number(m[1]);
}
function resolveQuota(rows, caliber) {
  const mm = parseCaliberMm(caliber);
  for (const row of rows) {
    if (row.caliber === "unica") return row;
    const plus = /\+/.test(row.caliber);
    const nums = row.caliber.match(/\d+/g)?.map(Number) ?? [];
    const lo = nums[0] ?? 0;
    const hi = plus ? Infinity : nums[1] ?? nums[0] ?? 0;
    if (mm >= lo && mm <= hi) return row;
  }
  throw new Error(`No quota row covers caliber '${caliber}'`);
}
function waterQuota(caliber, category, rates) {
  return resolveQuota(rates.waterServiceQuota[CALIBER_TABLE[category]], caliber);
}
function sanitation(m3, caliber, category, rates) {
  const fixed = resolveQuota(rates.sanitation.fixed[CALIBER_TABLE[category]], caliber);
  const variableRate = category === "domestic_reduced" ? rates.sanitation.variable.reduced.rate : rates.sanitation.variable.standard.rate;
  return { fixed, variableRate, variableAmount: round2(m3 * variableRate) };
}
function fullBill(inputs) {
  const { rates, category, m3 } = inputs;
  const lossM3 = inputs.lossM3 ?? 0;
  const biller = inputs.biller ?? "club";
  const caliber = inputs.caliber ?? "13-15mm";
  const onMainsSewer = inputs.onMainsSewer ?? true;
  if (m3 < 0 || lossM3 < 0) throw new Error("Volumes must be >= 0");
  const lines = [];
  const fieldsUsed = ["tariff_category", "meter_caliber", "on_mains_sewer"];
  if (lossM3 > 0) fieldsUsed.push("biller", "typical_loss");
  if (biller === "canal" && lossM3 > 0) {
    const combined = consumptionCharge(m3 + lossM3, rates, category);
    lines.push({
      kind: "consumption",
      labelEn: `Water consumption incl. network-loss allocation (${m3} + ${lossM3} m3)`,
      labelEs: `Consumo agua incl. diferencias contador general (${m3} + ${lossM3} m3)`,
      quantity: m3 + lossM3,
      unitRate: NaN,
      amount: combined.total,
      igicRate: rates.igic.consumption,
      breakdown: combined.breakdown
    });
  } else {
    const cons = consumptionCharge(m3, rates, category);
    lines.push({
      kind: "consumption",
      labelEn: "Water consumption",
      labelEs: "Consumo agua",
      quantity: m3,
      unitRate: NaN,
      amount: cons.total,
      igicRate: rates.igic.consumption,
      breakdown: cons.breakdown
    });
    if (lossM3 > 0) {
      const loss = lossCharge(lossM3, rates, category, biller, m3);
      lines.push({
        kind: "loss",
        labelEn: "Network-loss allocation (Diferencia contador general)",
        labelEs: category === "industrial_tourist" ? "Perdida turistica" : "Perdida domestica",
        quantity: lossM3,
        unitRate: NaN,
        amount: loss.total,
        igicRate: rates.igic.loss,
        breakdown: loss.breakdown
      });
    }
  }
  const quota = waterQuota(caliber, category, rates);
  lines.push({
    kind: "water_quota",
    labelEn: `Water service quota (${quota.caliber})`,
    labelEs: `Cuota servicio agua (${quota.caliber})`,
    quantity: 1,
    unitRate: quota.fee,
    amount: quota.fee,
    igicRate: rates.igic.quotas
  });
  if (onMainsSewer) {
    const san = sanitation(m3, caliber, category, rates);
    lines.push({
      kind: "sanitation_fixed",
      labelEn: `Sewerage service quota (${san.fixed.caliber})`,
      labelEs: `Saneamiento cuota servicio (${san.fixed.caliber})`,
      quantity: 1,
      unitRate: san.fixed.fee,
      amount: san.fixed.fee,
      igicRate: rates.igic.sanitation
    });
    lines.push({
      kind: "sanitation_variable",
      labelEn: "Sewerage on consumption",
      labelEs: "Saneamiento consumo",
      quantity: m3,
      unitRate: san.variableRate,
      amount: san.variableAmount,
      igicRate: rates.igic.sanitation
    });
  }
  const base0 = round2(
    lines.filter((l) => l.igicRate === 0).reduce((s, l) => s + l.amount, 0)
  );
  const base7 = round2(
    lines.filter((l) => l.igicRate > 0).reduce((s, l) => s + l.amount, 0)
  );
  const igic = round2(base7 * rates.igic.quotas);
  return { lines, base0, base7, igic, total: round2(base0 + base7 + igic), fieldsUsed };
}
function marginalCost(volumeL, priorPeriodM3, category, rates, opts = {}) {
  if (volumeL < 0 || priorPeriodM3 < 0) throw new Error("Volumes must be >= 0");
  const biller = opts.biller ?? "club";
  const priorLossM3 = opts.priorLossM3 ?? 0;
  const onMainsSewer = opts.onMainsSewer ?? true;
  const volumeM3 = volumeL / 1e3;
  const startsAtM3 = priorPeriodM3 + (biller === "canal" ? priorLossM3 : 0);
  const before = consumptionCharge(startsAtM3, rates, category);
  const after = consumptionCharge(startsAtM3 + volumeM3, rates, category);
  const supplyEuros = round2(after.total - before.total);
  const blocksTouched = [];
  for (const a of after.breakdown) {
    const b = before.breakdown.find((x) => x.rate === a.rate);
    const dm3 = round2(a.m3 - (b?.m3 ?? 0));
    if (dm3 > 0) blocksTouched.push({ m3: dm3, rate: a.rate, amount: round2(a.amount - (b?.amount ?? 0)) });
  }
  const sanitVarRate = category === "domestic_reduced" ? rates.sanitation.variable.reduced.rate : rates.sanitation.variable.standard.rate;
  const sanitationEuros = onMainsSewer ? round2(volumeM3 * sanitVarRate * (1 + rates.igic.sanitation)) : 0;
  const fieldsUsed = ["tariff_category", "on_mains_sewer", "billing_period_anchor"];
  if (biller === "canal" && priorLossM3 > 0) fieldsUsed.push("biller", "typical_loss");
  return {
    totalEuros: round2(supplyEuros + sanitationEuros),
    supplyEuros,
    sanitationEuros,
    volumeM3,
    startsAtM3,
    blocksTouched,
    fieldsUsed
  };
}

// src/rates.fixture.json
var rates_fixture_default = {
  comment: "Vendored snapshot of the Water Knowledge store's water_tariffs rows. Test fixture + offline fallback ONLY - production paths read the water_tariffs table (the SSOT). Refresh via store/build-fixture.mjs and re-run store/parity-check.mjs whenever rates change.",
  tariffSets: [
    {
      id: "2011_current",
      labelEn: "Current tariff (2011)",
      labelEs: "Tarifa vigente (2011)",
      status: "current",
      effective: "2011-07-06",
      source: "https://oficinavirtual.canalgestionlanzarote.es/api/public/descarga?nombre_fichero=Tarifas+Web.pdf",
      notes: "Consorcio del Agua de Lanzarote tariff, BOP no.87 06/07/2011 (agua) + BOP 28/10/2011 (saneamiento). Validated against 49/49 real bills to the cent (2 Jul 2026): 'bill-validated' figures are corpus-proven; 'official-sheet' figures come from the Canal Gestion Tarifas Web PDF where the corpus had no exercising bill. IGIC is applied per line: 0% on consumption and loss allocations, 7% on every quota and all sanitation.",
      igic: {
        consumption: 0,
        loss: 0,
        quotas: 0.07,
        sanitation: 0.07
      },
      supply: {
        domestic_standard: {
          mode: "blocks",
          blocks: [
            {
              upTo: 10,
              rate: 0.6
            },
            {
              upTo: 30,
              rate: 1.03
            },
            {
              upTo: 40,
              rate: 1.75
            },
            {
              upTo: null,
              rate: 3.69
            }
          ],
          source: "bill-validated"
        },
        domestic_reduced: {
          mode: "blocks",
          blocks: [
            {
              upTo: 10,
              rate: 0.51
            },
            {
              upTo: 30,
              rate: 0.71
            },
            {
              upTo: 40,
              rate: 1.2
            },
            {
              upTo: null,
              rate: 2.64
            }
          ],
          source: "official-sheet"
        },
        industrial_tourist: {
          mode: "flat",
          flatRate: 2.91,
          source: "bill-validated"
        },
        agri_registered: {
          mode: "flat",
          flatRate: 0.98,
          source: "official-sheet"
        },
        agri_unregistered: {
          mode: "flat",
          flatRate: 1.12,
          source: "official-sheet"
        },
        agri_over_assigned: {
          mode: "flat",
          flatRate: 2.69,
          source: "official-sheet"
        },
        local_corporations: {
          mode: "flat",
          flatRate: 2.09,
          source: "official-sheet"
        },
        reclaimed_agri: {
          mode: "flat",
          flatRate: 0.22,
          source: "official-sheet"
        },
        reclaimed_gardens: {
          mode: "flat",
          flatRate: 0.3,
          source: "official-sheet"
        },
        especial_lecturas: {
          mode: "flat",
          flatRate: 0.98,
          source: "official-sheet"
        },
        urbanisations: {
          mode: "flat",
          flatRate: 3.21,
          source: "official-sheet"
        },
        convenios: {
          mode: "flat",
          flatRate: 0.31,
          source: "official-sheet"
        },
        cubas_domestic: {
          mode: "flat",
          flatRate: 1.01,
          source: "official-sheet"
        },
        cubas_agricola: {
          mode: "flat",
          flatRate: 1.12,
          source: "official-sheet"
        },
        cubas_industrial: {
          mode: "flat",
          flatRate: 2.91,
          source: "official-sheet"
        }
      },
      loss: {
        domestic_standard: {
          mode: "blocks",
          blocks: [
            {
              upTo: 10,
              rate: 0.6
            },
            {
              upTo: 30,
              rate: 1.01
            },
            {
              upTo: 40,
              rate: 1.75
            },
            {
              upTo: null,
              rate: 2.09,
              source: "official-sheet"
            }
          ],
          source: "bill-validated",
          notes: "Top block 2.09 (NOT the supply 3.69) per the official sheet; the corpus never exercised a loss line above 40 m3."
        },
        domestic_reduced: {
          mode: "blocks",
          blocks: [
            {
              upTo: 10,
              rate: 0.6
            },
            {
              upTo: 30,
              rate: 1.01
            },
            {
              upTo: 40,
              rate: 1.75
            },
            {
              upTo: null,
              rate: 2.09
            }
          ],
          source: "bill-validated",
          notes: "Reduced (familia numerosa/jubilados) customers pay the STANDARD domestic loss rates on the Diferencia/Perdida line, NOT reduced ones \u2014 the reduced discount applies to their own supply + sanitation only. Proven by a real reduced bill (Club, 2 Jul 2026): loss 10@0.60 + 4@1.01. Supersedes the misleading official-sheet 0.51/0.71 reduced-loss figures."
        },
        industrial_tourist: {
          mode: "flat",
          flatRate: 1.88,
          source: "bill-validated"
        }
      },
      waterServiceQuota: {
        domestic: [
          {
            caliber: "13-15mm",
            fee: 4,
            source: "bill-validated"
          },
          {
            caliber: "20mm",
            fee: 6,
            source: "official-sheet"
          },
          {
            caliber: "25mm",
            fee: 8,
            source: "official-sheet"
          },
          {
            caliber: "30mm",
            fee: 10,
            source: "official-sheet"
          },
          {
            caliber: "40mm",
            fee: 12,
            source: "official-sheet"
          }
        ],
        industrial: [
          {
            caliber: "13-15mm",
            fee: 12,
            source: "bill-validated"
          },
          {
            caliber: "20mm",
            fee: 20,
            source: "official-sheet"
          },
          {
            caliber: "25mm",
            fee: 30,
            source: "official-sheet"
          },
          {
            caliber: "30mm",
            fee: 50,
            source: "official-sheet"
          },
          {
            caliber: "40mm",
            fee: 65,
            source: "bill-validated"
          },
          {
            caliber: "50mm",
            fee: 80,
            source: "official-sheet"
          },
          {
            caliber: "65mm",
            fee: 100,
            source: "official-sheet"
          },
          {
            caliber: "80mm",
            fee: 150,
            source: "official-sheet"
          },
          {
            caliber: "100mm+",
            fee: 200,
            source: "official-sheet"
          }
        ],
        corporations: [
          {
            caliber: "unica",
            fee: 4,
            source: "official-sheet"
          }
        ]
      },
      sanitation: {
        variable: {
          standard: {
            rate: 0.52,
            source: "bill-validated"
          },
          reduced: {
            rate: 0.39,
            source: "official-sheet"
          }
        },
        fixed: {
          domestic: [
            {
              caliber: "13-15mm",
              fee: 2,
              source: "bill-validated"
            },
            {
              caliber: "20-40mm",
              fee: 6,
              source: "official-sheet"
            },
            {
              caliber: "50mm+",
              fee: 12,
              source: "official-sheet"
            }
          ],
          industrial: [
            {
              caliber: "13-15mm",
              fee: 2,
              source: "bill-validated"
            },
            {
              caliber: "20mm",
              fee: 4,
              source: "official-sheet"
            },
            {
              caliber: "25-40mm",
              fee: 10,
              source: "bill-validated"
            },
            {
              caliber: "50-65mm",
              fee: 20,
              source: "official-sheet"
            },
            {
              caliber: "80mm",
              fee: 30,
              source: "official-sheet"
            },
            {
              caliber: "100mm+",
              fee: 40,
              source: "official-sheet"
            }
          ],
          corporations: [
            {
              caliber: "13-15mm",
              fee: 4,
              source: "official-sheet"
            },
            {
              caliber: "20-40mm",
              fee: 6,
              source: "official-sheet"
            },
            {
              caliber: "50mm+",
              fee: 12,
              source: "official-sheet"
            }
          ]
        }
      }
    },
    {
      id: "2026_proposed",
      labelEn: "Proposed 2026 (+15.06%) - pending approval",
      labelEs: "Propuesta 2026 (+15,06%) - pendiente de aprobacion",
      status: "proposed",
      effective: "pending",
      source: "Consorcio del Agua de Lanzarote, Feb 2026 approval; NOT in force (pending Comision de Precios de Canarias)",
      igic: {
        consumption: 0,
        loss: 0,
        quotas: 0.07,
        sanitation: 0.07
      },
      supply: {
        domestic_standard: {
          mode: "blocks",
          blocks: [
            {
              upTo: 10,
              rate: 0.69
            },
            {
              upTo: 30,
              rate: 1.19
            },
            {
              upTo: 40,
              rate: 2.01
            },
            {
              upTo: null,
              rate: 4.25
            }
          ],
          source: "announced-proposal"
        },
        domestic_reduced: {
          mode: "blocks",
          blocks: [
            {
              upTo: 10,
              rate: 0.59
            },
            {
              upTo: 30,
              rate: 0.82
            },
            {
              upTo: 40,
              rate: 1.38
            },
            {
              upTo: null,
              rate: 3.04
            }
          ],
          source: "derived-estimate"
        },
        industrial_tourist: {
          mode: "flat",
          flatRate: 3.35,
          source: "announced-proposal"
        },
        agri_registered: {
          mode: "flat",
          flatRate: 1.13,
          source: "derived-estimate"
        },
        agri_unregistered: {
          mode: "flat",
          flatRate: 1.29,
          source: "derived-estimate"
        },
        agri_over_assigned: {
          mode: "flat",
          flatRate: 3.1,
          source: "derived-estimate"
        },
        local_corporations: {
          mode: "flat",
          flatRate: 2.4,
          source: "derived-estimate"
        },
        reclaimed_agri: {
          mode: "flat",
          flatRate: 0.25,
          source: "derived-estimate"
        },
        reclaimed_gardens: {
          mode: "flat",
          flatRate: 0.35,
          source: "derived-estimate"
        },
        especial_lecturas: {
          mode: "flat",
          flatRate: 1.13,
          source: "derived-estimate"
        },
        urbanisations: {
          mode: "flat",
          flatRate: 3.69,
          source: "derived-estimate"
        },
        convenios: {
          mode: "flat",
          flatRate: 0.36,
          source: "derived-estimate"
        },
        cubas_domestic: {
          mode: "flat",
          flatRate: 1.16,
          source: "derived-estimate"
        },
        cubas_agricola: {
          mode: "flat",
          flatRate: 1.29,
          source: "derived-estimate"
        },
        cubas_industrial: {
          mode: "flat",
          flatRate: 3.35,
          source: "derived-estimate"
        }
      },
      loss: {
        domestic_standard: {
          mode: "blocks",
          blocks: [
            {
              upTo: 10,
              rate: 0.69
            },
            {
              upTo: 30,
              rate: 1.16
            },
            {
              upTo: 40,
              rate: 2.01
            },
            {
              upTo: null,
              rate: 2.4,
              source: "derived-estimate"
            }
          ],
          source: "derived-estimate"
        },
        domestic_reduced: {
          mode: "blocks",
          blocks: [
            {
              upTo: 10,
              rate: 0.69
            },
            {
              upTo: 30,
              rate: 1.16
            },
            {
              upTo: 40,
              rate: 2.01
            },
            {
              upTo: null,
              rate: 2.4
            }
          ],
          source: "derived-estimate"
        },
        industrial_tourist: {
          mode: "flat",
          flatRate: 2.16,
          source: "derived-estimate"
        }
      },
      waterServiceQuota: {
        domestic: [
          {
            caliber: "13-15mm",
            fee: 4.6,
            source: "derived-estimate"
          },
          {
            caliber: "20mm",
            fee: 6.9,
            source: "derived-estimate"
          },
          {
            caliber: "25mm",
            fee: 9.2,
            source: "derived-estimate"
          },
          {
            caliber: "30mm",
            fee: 11.51,
            source: "derived-estimate"
          },
          {
            caliber: "40mm",
            fee: 13.81,
            source: "derived-estimate"
          }
        ],
        industrial: [
          {
            caliber: "13-15mm",
            fee: 13.81,
            source: "derived-estimate"
          },
          {
            caliber: "20mm",
            fee: 23.01,
            source: "derived-estimate"
          },
          {
            caliber: "25mm",
            fee: 34.52,
            source: "derived-estimate"
          },
          {
            caliber: "30mm",
            fee: 57.53,
            source: "derived-estimate"
          },
          {
            caliber: "40mm",
            fee: 74.79,
            source: "derived-estimate"
          },
          {
            caliber: "50mm",
            fee: 92.05,
            source: "derived-estimate"
          },
          {
            caliber: "65mm",
            fee: 115.06,
            source: "derived-estimate"
          },
          {
            caliber: "80mm",
            fee: 172.59,
            source: "derived-estimate"
          },
          {
            caliber: "100mm+",
            fee: 230.12,
            source: "derived-estimate"
          }
        ],
        corporations: [
          {
            caliber: "unica",
            fee: 4.6,
            source: "derived-estimate"
          }
        ]
      },
      sanitation: {
        variable: {
          standard: {
            rate: 0.6,
            source: "derived-estimate"
          },
          reduced: {
            rate: 0.45,
            source: "derived-estimate"
          }
        },
        fixed: {
          domestic: [
            {
              caliber: "13-15mm",
              fee: 2.3,
              source: "derived-estimate"
            },
            {
              caliber: "20-40mm",
              fee: 6.9,
              source: "derived-estimate"
            },
            {
              caliber: "50mm+",
              fee: 13.81,
              source: "derived-estimate"
            }
          ],
          industrial: [
            {
              caliber: "13-15mm",
              fee: 2.3,
              source: "derived-estimate"
            },
            {
              caliber: "20mm",
              fee: 4.6,
              source: "derived-estimate"
            },
            {
              caliber: "25-40mm",
              fee: 11.51,
              source: "derived-estimate"
            },
            {
              caliber: "50-65mm",
              fee: 23.01,
              source: "derived-estimate"
            },
            {
              caliber: "80mm",
              fee: 34.52,
              source: "derived-estimate"
            },
            {
              caliber: "100mm+",
              fee: 46.02,
              source: "derived-estimate"
            }
          ],
          corporations: [
            {
              caliber: "13-15mm",
              fee: 4.6,
              source: "derived-estimate"
            },
            {
              caliber: "20-40mm",
              fee: 6.9,
              source: "derived-estimate"
            },
            {
              caliber: "50mm+",
              fee: 13.81,
              source: "derived-estimate"
            }
          ]
        }
      },
      notes: "Derived from the 2011 catalogue at +15.06% rounded to the cent. The publicly announced figures (domestic 0.69/1.19/2.01/4.25, industrial 3.35) match this derivation exactly; all other figures are estimates on the same basis. NOT in force as of July 2026 - bills through Mar-May 2026 still show 2011 rates."
    }
  ]
};

// src/rates.ts
var FIXTURE_RATE_SETS = rates_fixture_default.tariffSets;
function pickRateSet(sets, id) {
  const set = sets.find((s) => s.id === id);
  if (!set) throw new Error(`Rate set '${id}' not found (have: ${sets.map((s) => s.id).join(", ")})`);
  return set;
}
function assertRateSet(x) {
  const s = x;
  if (!s || typeof s.id !== "string") throw new Error("RateSet: missing id");
  for (const k of ["consumption", "loss", "quotas", "sanitation"]) {
    if (typeof s.igic?.[k] !== "number") throw new Error(`RateSet ${s.id}: missing igic.${k}`);
  }
  if (!s.supply?.domestic_standard || !s.supply?.industrial_tourist) {
    throw new Error(`RateSet ${s.id}: missing core supply categories`);
  }
  if (!s.loss?.domestic_standard) throw new Error(`RateSet ${s.id}: missing loss rates`);
  if (!s.waterServiceQuota?.domestic?.length) throw new Error(`RateSet ${s.id}: missing service quotas`);
  if (!s.sanitation?.variable?.standard) throw new Error(`RateSet ${s.id}: missing sanitation rates`);
}
async function fetchRateSets(opts) {
  const f = opts.fetchImpl ?? fetch;
  const res = await f(`${opts.url}/rest/v1/water_tariffs?select=rates&order=id`, {
    headers: { apikey: opts.apikey, Authorization: `Bearer ${opts.apikey}` }
  });
  if (!res.ok) throw new Error(`water_tariffs fetch failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows.map((r) => {
    assertRateSet(r.rates);
    return r.rates;
  });
}

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
  FIXTURE_RATE_SETS,
  pickRateSet,
  assertRateSet,
  fetchRateSets
};
//# sourceMappingURL=chunk-RUVGECG6.js.map