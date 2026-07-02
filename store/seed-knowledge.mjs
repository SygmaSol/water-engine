// Seeds knowledge_docs in the Water Knowledge store. Every fact is grounded in the validated
// Lanzarote tariff reference (49/49 bills reconciled) — NO invented claims. Audience-tagged:
// 'public' (CD hub), 'leakguard' (customer/admin), 'both'. Embedded on write by the embed-docs fn.
// Env: WK_URL, WK_SERVICE_KEY.

const docs = [
  {
    slug: "how-water-billing-works-lanzarote",
    title: "How water billing works in Lanzarote — the complete guide",
    audience: "both",
    tags: ["billing", "explainer", "flagship", "tariff", "diferencia", "igic"],
    body: `Water in Lanzarote is billed under a single island-wide regulated tariff set by the Consorcio del Agua de Lanzarote. Two companies send the bills — **Canal Gestión** (most of the island) and **Club Lanzarote** (the Montaña Roja urbanisation area, Playa Blanca/Yaiza, under a convenio) — but they charge exactly the same prices. The only real difference between them is how they present one line (the network-loss charge, below).

## What's on the bill
A typical bill has up to four billable parts, plus tax:
1. **Water service quota** — a fixed charge per bill, set by your meter size (calibre). A standard 13–15 mm domestic meter is €4.00 per bill.
2. **Water consumption** — charged on a **progressive block (sliding-scale) tariff**: you pay each block's rate only on the cubic metres (m³) that fall inside that block, not your whole usage at the top rate.
3. **Sewerage (saneamiento)** — only if your property is connected to the mains sewer. It has a fixed quota (by calibre) plus a variable charge on your actual consumption. Properties on a septic tank (fosa séptica) have no sewerage lines at all.
4. **Network-loss allocation ("Diferencia contador general")** — your share of the difference between the community's general meter and the sum of the individual meters (communal leaks and losses). This can be a large part of the bill and is explained in its own article.

## The block (sliding-scale) tariff
For a standard home, the consumption blocks are:
- 0–10 m³: €0.60 per m³
- 11–30 m³: €1.03 per m³
- 31–40 m³: €1.75 per m³
- over 40 m³: €3.69 per m³

So 25 m³ costs 10×€0.60 + 15×€1.03 = €21.45 for consumption — not 25×€3.69. The top block is more than six times the entry rate, which is why a leak or a pool top-up that pushes you into the upper blocks gets expensive fast. Blocks reset each billing period.

## IGIC (the Canary Islands tax)
IGIC is applied **per line**: **0% on water consumption and on the network-loss allocation**, and **7% on the fixed quotas and all sewerage charges**. This is why you can't just add one tax rate to the whole bill.

## Billing period
Billing is bi-monthly (roughly every two months), but the periods are not exactly 60 days — real bills run anywhere from about 49 to 62 days. Always use the printed period dates on your bill.

## Reduced and other rates
There is a cheaper **domestic reduced** rate for large families and pensioners/retirees (0.51 / 0.71 / 1.20 / 2.64 per block), which requires eligibility proof. Holiday lets and commercial premises pay the **industrial/tourist** rate — a flat €2.91 per m³ with no cheap first block, which works out much higher for the same usage. There is no separate "resident vs non-resident" water rate — that discount exists for Canary transport, not water.

## The pending price rise
A +15.06% increase was approved in February 2026 but, as of mid-2026, is **not yet in force** — it still needs sign-off from the Comisión de Precios de Canarias. Bills through spring 2026 still show the 2011 rates. When it lands, the first domestic block would go from €0.60 to about €0.69.`,
  },
  {
    slug: "diferencia-contador-general-explained",
    title: 'What is the "Diferencia contador general" on my water bill?',
    audience: "both",
    tags: ["diferencia", "network-loss", "billing", "leak"],
    body: `The "Diferencia contador general" (or "Diferencias contador general" on newer bills; Club Lanzarote calls it "Pérdida doméstica" or "Pérdida turística") is the single most confusing line on a Lanzarote water bill — and often one of the largest.

It is your allocated share of the difference between the **community's main meter** and the total of all the **individual meters** in the development. That gap is the water the network lost — communal leaks, a shared pipe fault, unmetered use. The Consorcio recovers it by sharing it across the properties on that network.

Two things make it important:
- **It can dwarf your own use.** On one real Canal Gestión bill a property used 13 m³ but was allocated 65 m³ of loss, so it was billed on 78 m³ — a bill of about €198 for 13 m³ of actual use.
- **Your meter cannot see it.** It is the biller's allocation and appears only on the printed bill, so a smart meter or usage monitor can price your own consumption exactly but cannot know your loss share until a bill arrives.

**How the two billers show it:**
- **Canal Gestión merges it into consumption** — your use and your loss share are added together and run through the same consumption blocks (so the loss can push your own water into a dearer block).
- **Club Lanzarote itemises it as a separate line** at its own loss rates (domestic 0.60 / 1.01 / 1.75; tourist a flat 1.88 per m³). IGIC on the loss line is 0%.

A persistently large "Diferencia" is worth investigating — it usually means a communal leak somewhere on the shared network.`,
  },
  {
    slug: "sewers-vs-septic-tanks",
    title: "Sewers vs septic tanks — why some bills have no sewerage charge",
    audience: "both",
    tags: ["saneamiento", "septic", "billing"],
    body: `Sewerage (saneamiento) is only charged if your property is connected to the mains sewer. If you are on a **septic tank (fosa séptica)**, your bill has **no sewerage lines at all** — no fixed sewerage quota and no variable sewerage charge.

When you are on the mains sewer, there are two sewerage charges:
- A **fixed sewerage quota** by meter calibre (€2.00 per bill for a standard 13–15 mm domestic meter).
- A **variable sewerage charge** on your **actual consumption only** (€0.52 per m³ for domestic; €0.39 reduced). It is never charged on the network-loss allocation.

Both sewerage charges carry 7% IGIC. If you know whether your property is on the mains sewer or a septic tank, set it in your water settings — it changes your bill materially, and quoting sewerage to a septic-tank property would overstate the cost.`,
  },
  {
    slug: "reduced-tariff-eligibility",
    title: "The reduced water tariff (large families and pensioners)",
    audience: "both",
    tags: ["reduced", "tariff", "eligibility"],
    body: `Lanzarote has a cheaper **domestic reduced** water rate for large families (familia numerosa) and pensioners/retirees (jubilados/pensionistas). The consumption blocks are 0.51 / 0.71 / 1.20 / 2.64 per m³ (versus the standard 0.60 / 1.03 / 1.75 / 3.69), the variable sewerage rate is €0.39 per m³ (versus €0.52), and losses are charged at reduced loss rates.

Eligibility must be proven and typically requires residency-type documentation (income below the SMI threshold via the INSS, a certificado de convivencia / empadronamiento, and ownership of a single property). It is not automatic and it is not a general "resident" discount — there is no resident-vs-non-resident water rate in Lanzarote. If a household qualifies, it is worth applying, as it lowers every block.`,
  },
  {
    slug: "two-billers-one-tariff",
    title: "Canal Gestión and Club Lanzarote — two billers, one tariff",
    audience: "public",
    tags: ["canal", "club", "biller", "tariff"],
    body: `Lanzarote has one regulated water tariff set by the Consorcio del Agua de Lanzarote, and two companies that send the bills: **Canal Gestión**, which covers most of the island, and **Club Lanzarote**, which serves the Montaña Roja urbanisation and parts of Playa Blanca/Yaiza under a convenio.

The prices are identical — the block rates, quotas, sewerage and IGIC are the same whichever company bills you. The only practical difference is presentation: Canal Gestión merges the network-loss allocation into your consumption total, while Club Lanzarote shows it as a separate "Pérdida" line. Bill numbers differ too (Canal bills start with "D…", Club bills with "FAC0…"). If you move between the two, your rates don't change.`,
  },
  {
    slug: "leak-vs-evaporation-pool",
    title: "Is my pool losing water to a leak or just evaporation?",
    audience: "both",
    tags: ["pool", "leak", "evaporation", "canary-detect"],
    body: `In Lanzarote's warm climate a swimming pool naturally loses water to evaporation. Published local guidance puts normal evaporation at roughly **3–7 mm per day**, or about **2–4 cm per week in summer**. As a rule of thumb, if your pool is dropping **more than about 5 cm per week** in calm weather with no heavy use, that points to a leak rather than evaporation.

A simple check is the **bucket test**: put a bucket of pool water on a step so it sits at the same level as the pool, wait 24 hours without using the pool or running equipment, then compare how much each dropped. If the pool dropped noticeably more than the bucket, you likely have a leak worth investigating.

Because water in the upper price blocks is expensive, a slow pool leak that you keep topping up can quietly add a lot to your bill. (Source: Canary Detect, "How to check for pool leaks in Lanzarote".)`,
  },
  {
    slug: "water-saving-lanzarote",
    title: "Practical ways to cut your water bill in Lanzarote",
    audience: "public",
    tags: ["saving", "tips", "usage"],
    body: `Because the tariff is a rising block scale, the cheapest savings come from staying out of the upper blocks. A few figures worth knowing (UK/EU averages, useful as a guide):
- A dripping tap at one drip per second wastes over 12,000 litres a year.
- A leaking or running toilet can waste up to 400 litres a day.
- A full bath uses about 80 litres; a power/mixer shower about 15 litres a minute.
- A washing machine cycle uses about 50 litres; a modern dishwasher about 14.

Fixing a running toilet or a dripping tap is usually the biggest single win. Watering a garden or topping up a pool tends to land in the dear upper blocks, so a leak on either is costly. If your overnight usage is never zero, something is running when it shouldn't be — that is exactly the kind of silent waste a monitor catches.`,
  },
  {
    slug: "reading-your-usage-charts",
    title: "Reading your LeakGuard usage charts",
    audience: "leakguard",
    tags: ["charts", "usage", "device", "help"],
    body: `Your LeakGuard device records water flow every 15 minutes, so the chart shows the shape of your day, not just a monthly total.

- **Overnight baseline:** between roughly midnight and 6 am, usage should normally drop to zero. A flat, non-zero overnight line almost always means something is running — a leak, a faulty valve, or a running toilet.
- **Spikes:** short tall bars are normal draws (a shower, the washing machine, filling a pool). The assistant can price a specific event for you.
- **Repeating patterns:** a draw at the same time every day is usually irrigation or an appliance on a timer. If it's happening when you didn't expect it, that's worth a look.

Ask the assistant about any window you don't recognise — it can measure the exact litres and, if your tariff is set, tell you what it cost.`,
  },
  {
    slug: "what-your-device-alert-means",
    title: "What your LeakGuard alert means",
    audience: "leakguard",
    tags: ["alert", "device", "help"],
    body: `LeakGuard sends an alert when it sees water use that looks like a problem — most often continuous flow overnight, or usage during a period you've told us the property should be empty. An alert is a prompt to check, not a guarantee of a burst pipe: common innocent causes are a guest using water, an irrigation timer, or a pool top-up.

If you get an alert: check whether anyone was using water at that time, look at the chart for the flagged window, and if nothing explains it, check the usual suspects (toilets, outside taps, the pool). If you can't find it, contact the team and we'll help you trace it.`,
  },
  {
    slug: "billing-dispute-boundary",
    title: "Billing disputes and overcharge questions",
    audience: "both",
    tags: ["policy", "boundary", "dispute", "complaint"],
    body: `The assistant can explain how a Lanzarote water bill is calculated and estimate what usage should cost, but it cannot resolve a billing dispute, confirm whether you have been overcharged, or handle a complaint against a water company. Those need the biller (Canal Gestión or Club Lanzarote) or the Consorcio del Agua de Lanzarote.

If someone believes they have been overcharged or wants to dispute a bill, the right response is to explain the relevant charges clearly and point them to the team or the biller — not to assert that a bill is wrong.`,
  },
];

const url = process.env.WK_URL;
const key = process.env.WK_SERVICE_KEY;
if (!url || !key) throw new Error("Set WK_URL + WK_SERVICE_KEY");

const rows = docs.map((d) => ({ ...d, lang: "en", embedding: null }));
const res = await fetch(`${url}/rest/v1/knowledge_docs?on_conflict=slug`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify(rows),
});
if (!res.ok) throw new Error(`Seed failed: ${res.status} ${await res.text()}`);
console.log(`Seeded ${rows.length} knowledge docs:`, rows.map((r) => `${r.slug}(${r.audience})`).join(", "));
