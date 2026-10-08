# Schedule Notes Core

An independent, zero-dependency Web Core for reliable schedule and activity experiments. Main develops a **v0.2.0 candidate**; [v0.1.0](https://github.com/zerozelda773-cmd/schedule-notes-core/tree/v0.1.0) remains the released baseline.

The tree contains original generic code and fixtures generated from scratch. Real business data, attachments, private source and production infrastructure remain excluded.

## Data truth

Outputs explain source, entity, period, calculation, matching and completeness. Unknown stays unknown: null never becomes zero, names never become IDs, probable never becomes exact, plans never become observations, and period gaps block complete conclusions.

Read the [data contract](docs/DATA-CONTRACT.md), [output contract](docs/OUTPUT-CONTRACT.md), [import contract](docs/IMPORT-CONTRACT.md) and [API surface](docs/API-SURFACE.md). Schema 2 is experimental; the v0.1 demonstration APIs remain separately available.

## Run

Requires Node.js 24+, npm, Python 3.10+. No credentials or packages are needed.

~~~sh
npm ci --ignore-scripts --no-audit --no-fund
npm run generate
npm run provenance
npm run build
npm test
python tools/check.py
npm start
~~~

Open http://127.0.0.1:4173. The loopback-only one-page demo shows identity candidates, output truth, JSON import preview/commit and activity transitions. All input is fictional. Reload resets the memory store. Editing input invalidates the preview.

## Architecture and fixtures

Core contains generic contracts, identity, period, validation, analysis, tasks and the API facade. Adapters contain CSV/JSON import, atomic memory storage and optional interfaces. Fixtures, tests and one-page demo stay separate.

Fixtures cover null, zero, returns, duplicate input, missing identity, unknown product, period gaps, cross-hospital same-named departments, same-named customers, draft/cancelled/completed activities and all four matching qualities. No private distributions or structures are fitted.

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [boundary](PUBLIC-BOUNDARY.md), [manifest](PUBLIC-MANIFEST.json), [third-party inventory](THIRD-PARTY.md) and [Apache-2.0](LICENSE).

Register reviewed new files explicitly: python tools/update_manifest.py --add path/to/file. The tool refreshes only registered files. Review the diff and run checks before pushing. CI uses read-only permissions, no production credentials and no private repository access.

## Limitations and roadmap

No Android/native package, cloud sync, production AI, Excel parser, Office template, signing or deployment system is included. Memory storage is neither durable nor multi-process. Source declarations do not prove real-world truth. Generic finite-number sums do not implement monetary accounting rules. Schema 1 needs manual migration; schema 2 has no long-term API guarantee.

Next: broader generic mappings and synthetic boundaries, accessible editing, and durable storage through the transaction interface. A v0.2.0 release needs local checks, public CI, clean clone, manifest, secret and license PASS. Candidate development alone does not publish a release.
