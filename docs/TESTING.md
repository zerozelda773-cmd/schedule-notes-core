# Validation groups

| Command | Scope |
|---|---|
| `npm run test:unit` | Platform helpers, original legacy behaviors and scanner rejection. |
| `npm run test:contract` | Schema, identity, periods, validation, API lifecycle and output envelopes. |
| `npm run test:storage` | Memory/interface transactions, CAS, validation and metadata. |
| `npm run test:migration` | Source validation, backup, deterministic mappings, atomic commit, idempotency. |
| `npm run test:import` | Frozen single-entity and new multi-entity reliability. |
| `npm run test:recovery` | Snapshots, corruption, stale/tampered restores, explicit recovery. |
| `npm run test:integration` | Activity/Task transactions and end-to-end migration/import/output. |
| `npm run test:browser` | Real Chrome/Chromium IndexedDB, native abort, process kill/restart, demo. |
| `npm test` | All Node groups together; browser remains an independent command. |

Browser requires an installed Chrome/Chromium (`CHROME_BIN` can select it). The zero-dependency runner uses Node's native WebSocket and the browser debugging protocol against a fresh temporary synthetic profile. It does not attach to the user's browser, reuse cookies, log in or access production services. The local HTTP origin remains stable while separate browser processes restart. Browser profile cleanup is confined to its verified temporary directory. No browser executable/package is installed or redistributed by the project.

CI runs every group separately, original synthetic generation/provenance, manifest/secret/license checks, a closed build, example and clean diff. `scripts/provenance.cjs` checks generated files against their from-zero generators. These checks prove the tested local/CI scope, not real-world source authenticity or immunity to every future storage failure.
