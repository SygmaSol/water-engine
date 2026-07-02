# water-engine

Lanzarote water tariff + estimate engine. Pure TypeScript, no IO. The single shared implementation of
the island's validated water-billing maths (two parallel charge streams: supply blocks + network-loss
allocation, per-line IGIC, optional sanitation, biller-dependent loss handling), plus the estimate
calculators (pool volume, pool top-up, typical-use costs).

**This repo is public so Pete's apps can consume tagged builds without a registry. It is proprietary —
all rights reserved; no licence is granted for reuse.**

## Hard rules

- **No customer data, ever.** No real bills, names, addresses, account numbers or meter numbers may be
  committed here — not even in test fixtures. Committed fixtures are synthetic or fully redacted.
  Integration tests against the real bill corpus live in the private LeakGuard repo.
- **No secrets.** The package is pure maths; it takes rates and (for extraction) a Claude client as inputs.
- Rate **numbers** are data in the Water Knowledge store (`water_tariffs` table — the SSOT). The vendored
  `src/rates.fixture.json` is a test fixture and offline fallback only, refreshed when rates change.

## Consuming

Tagged releases commit the built `dist/` so consumers need no build step.

- **npm apps (LeakGuard, CD site):** `"water-engine": "github:SygmaSol/water-engine#v<tag>"`
- **Deno edge functions:** `import { fullBill } from "https://esm.sh/gh/SygmaSol/water-engine@v<tag>/dist/index.js"`

The package is never published to the npm registry — a bare `npm:water-engine` specifier will not resolve.
Bump the pinned tag deliberately in each consumer.

## Release process

1. Implement + `npm run typecheck && npm test`.
2. Bump `version` in package.json, `npm run build`, **commit `dist/`**.
3. `git tag v<version> && git push origin main --tags`.
