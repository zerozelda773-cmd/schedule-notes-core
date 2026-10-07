# Schedule Notes Core

An independent, small Web Core for schedule and activity experiments. Version 0.1.0 uses only original code and synthetic data. It is not the complete private product and does not connect to production systems.

## Run locally

Requires Node.js 24 or later, npm, and Python 3.10 or later for the static checks. No packages or production credentials are needed.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run generate
npm run build
npm test
python tools/check.py
npm start
```

Open http://127.0.0.1:4173. The demonstration uses a fixed fictional 2030 period. Browser storage stays on your device. This server binds to loopback and is for local demonstration, not production hosting.

## Included

Activity approval creates preparation, execution and review tasks. Repeated synchronization preserves tasks; cancellation preserves their records. Customer visits use stable customer and product identities. Sales summaries show their source, identity, period and completeness: missing amounts remain `null`, true zero stays zero, and returns remain negative. Local JSON storage verifies readback and reports failures.

The fixture is generated from scratch: fictional hospitals, departments, customers, employees, products, sales, employee plans, activities, expenses and tasks. Duplicate customer names have different IDs. It is not anonymized business data. Do not import private data into this public repository.

## Limits and roadmap

No Android package, native persistence bridge, cloud sync, AI integration, Office import/export, signing, deployment infrastructure or real attachments are included. The public API is an independent subset; compatibility with the private product is not promised. Future work: stronger input validation, richer synthetic edge cases, accessible task editing and a generic import interface. Any private product extraction needs a separate audit.

## Contributing and security

See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [public boundary](PUBLIC-BOUNDARY.md), [file manifest](PUBLIC-MANIFEST.json), and [third-party inventory](THIRD-PARTY.md).

Licensed under [Apache-2.0](LICENSE). This license applies to this public tree only.
