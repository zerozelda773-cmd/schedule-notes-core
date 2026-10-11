# Schedule Notes Core

Zero-dependency public data Core: stable identities, explainable facts, atomic import and local storage. [v0.4.0](https://github.com/zerozelda773-cmd/schedule-notes-core/tree/v0.4.0) is the frozen published compatibility baseline. Main includes a separately imported Experimental Wave 1 pure-contract delta; no next-version release or npm publication is implied.

## Consume the Core

```js
import ScheduleNotesCore from 'schedule-notes-core';
const client = ScheduleNotesCore.createClient();
const response = await client.query('getCurrentTasks');
```

The package is prepared for local tarball consumption, not published to npm. CommonJS uses require('schedule-notes-core'); a browser can import index.mjs. Public exports hide implementation module paths. New client/matching interfaces remain experimental. See [API](docs/API.md), [package entry](docs/PACKAGE.md), [types](docs/TYPES.md), and [compatibility](docs/COMPATIBILITY.md).

## Develop and verify

Node 24+, npm, Python 3.10+ and installed Chrome/Chromium (CHROME_BIN optional) are required. No runtime/build packages, account credentials or production services are needed.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run generate
npm run build
npm test
npm run test:browser
npm run provenance
python tools/check.py
python tools/dangerous.py
npm run benchmark
npm start
```

The existing thin synthetic demo is at http://127.0.0.1:4173. Core business logic also runs headlessly. Unknown remains null; ambiguity never becomes exact; corrupt storage is retained for explicit recovery. Checksums detect changes, not authenticity. Browser storage needs external backups.

## Contracts and boundaries

- [API lifecycle](docs/API-SURFACE.md), [baseline](docs/API-CONTRACT-BASELINE.md), [data](docs/DATA-CONTRACT.md), [output](docs/OUTPUT-CONTRACT.md)
- [Storage](docs/STORAGE.md), [migration](docs/MIGRATION.md), [snapshot](docs/SNAPSHOT.md), [recovery](docs/RECOVERY.md)
- [Import](docs/IMPORT.md), [matching and aliases](docs/MATCHING.md), [adapters](docs/ADAPTERS.md), [tests](docs/TESTING.md)
- [Contributing](CONTRIBUTING.md), [security](SECURITY.md), [boundary](PUBLIC-BOUNDARY.md), [manifest](PUBLIC-MANIFEST.json), [dependencies](THIRD-PARTY.md), [license](LICENSE)

Sources and fixtures are independently authored/from-zero synthetic. Private product source/history, real business data, production configurations, signing material and internal evidence are excluded. Android/SQLite/AI contracts do not include private implementations or network providers. npm publishing, tags and releases require a separate explicit Gate.

## Experimental Wave 1 and release limitations

The root retains 37 Stable APIs, 22 existing Experimental registry entries and 6 Deprecated entries. The separate `schedule-notes-core/experimental-wave1` subpath adds 16 Experimental pure functions; none is promoted to Stable. Schema 2 remains unchanged. See [Wave 1](docs/IMPLEMENTATION-WAVE1.md) and [release limitations](docs/RELEASE-LIMITATIONS.md).
