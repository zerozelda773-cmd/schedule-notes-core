# Schedule Notes Core

A zero-dependency public core for explainable data, atomic imports and local persistence. Main is Phase 3 development; [v0.2.0](https://github.com/zerozelda773-cmd/schedule-notes-core/tree/v0.2.0) is the frozen released compatibility baseline (`f0a2256f118b57ed77f95e050437036131dfa8d2`). No v0.3.0 release is implied.

## Quick start

Requires Node.js 24+, npm and Python 3.10+. Browser tests also require installed Chrome/Chromium (optional `CHROME_BIN`); no packages, credentials or production services are used.

~~~sh
npm ci --ignore-scripts --no-audit --no-fund
npm run generate
npm run build
npm test
npm run test:browser
npm run provenance
python tools/check.py
node examples/reliability.cjs
npm start
~~~

Open http://127.0.0.1:4173. The thin demo persists original synthetic facts in IndexedDB and displays identity, output, import, Activity transactions, snapshots and migration preview. Corrupt data is retained for explicit recovery. Never paste real business inputs or credentials.

## Architecture

Use `core/index.js` / `ScheduleNotesCore` as the Public API Layer. Core handles contracts and generic transforms through a storage interface. Adapters provide native IndexedDB, memory and CSV/JSON boundaries. Tests, synthetic generators and the demo are separate.

`apiVersion = "1.0"` describes call contracts; `schemaVersion = 2` describes facts. Persistent envelope/database versions are separate. Schema 3 is not invented for this phase. The [API registry](docs/API-SURFACE.md) records stable, experimental, deprecated and internal surfaces.

## Core principles

Names are not IDs. Departments remain hospital-scoped. Unknown stays null, zero stays zero, plans stay distinct from observation/report periods, and ambiguity never becomes a guessed exact match. Outputs explain source, entity, period, truth, matching, completeness and limitations. Critical multi-record writes are atomic; stale previews and conflicts cannot silently overwrite.

**Integrity ≠ authenticity.** Snapshot checksums detect changed or corrupt content; they are not signatures or proof of who created facts. Synthetic/source declarations alone do not prove origin. Browser persistence can be evicted or lost; retain backups.

## Documentation

- [API and deprecation](docs/API-SURFACE.md), [compatibility](docs/COMPATIBILITY.md), [data](docs/DATA-CONTRACT.md), [output](docs/OUTPUT-CONTRACT.md)
- [Storage](docs/STORAGE.md), [migration](docs/MIGRATION.md), [snapshot](docs/SNAPSHOT.md), [recovery](docs/RECOVERY.md)
- [Frozen single-entity import](docs/IMPORT-CONTRACT.md), [multi-entity import](docs/IMPORT-PHASE3.md)
- [Tests and CI](docs/TESTING.md), [working example](examples/reliability.cjs)
- [Contributing](CONTRIBUTING.md), [security](SECURITY.md), [boundary](PUBLIC-BOUNDARY.md), [manifest](PUBLIC-MANIFEST.json), [dependencies](THIRD-PARTY.md), [Apache-2.0](LICENSE)

Register reviewed files explicitly with `python tools/update_manifest.py --add path/to/file`; refresh hashes only after reviewing changes. The public tree contains from-zero synthetic data and original generic code. Private product source/history, business data, attachments, signing and infrastructure stay excluded. No Android package, cloud sync, production AI, Office template or private schema migration is included.
