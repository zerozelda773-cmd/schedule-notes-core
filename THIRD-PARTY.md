# Dependency and redistribution inventory

No runtime, build or test package dependencies are bundled or installed. Node.js, npm and Python are user-provided tools, not distributed in this repository. The UI uses system fonts and no external images.

| Component | Version | License | Source | Redistribution / notice | Compatibility |
|---|---|---|---|---|---|
| Original Web Core, scripts, tests, fixture and docs | 0.3.0-candidate.1 | Apache-2.0 | This repository | LICENSE and NOTICE included | Apache-2.0 |
| Apache license text | 2.0 | Standard license text | https://www.apache.org/licenses/LICENSE-2.0.txt | Unmodified standard text | Project license |
| actions/checkout (CI only; not bundled) | v7, 3d3c42e5aac5ba805825da76410c181273ba90b1 | MIT | https://github.com/actions/checkout | Used as upstream GitHub Action; upstream MIT notice retained by upstream distribution | Compatible, separately licensed |
| actions/setup-node (CI only; not bundled) | v7, 820762786026740c76f36085b0efc47a31fe5020 | MIT | https://github.com/actions/setup-node | Used as upstream GitHub Action; upstream MIT notice retained by upstream distribution | Compatible, separately licensed |

All original private assets and dependencies of uncertain license are excluded. Nothing from those components is redistributed here. No permission to distribute the private product is implied.

Phase 2 adds no third-party dependency, image, font or provider implementation. CSV/validation are original code. Web Crypto and structuredClone are platform APIs. New sources carry Apache-2.0 SPDX identifiers.

Phase 3 adds **zero package dependencies**. Persistence uses native IndexedDB, checksums use Web Crypto, and browser automation uses Node 24 native WebSocket against an isolated test profile. No database framework or browser automation library is installed or bundled. License remains Apache-2.0; LICENSE/NOTICE remain intact.

Browser verification requires user/CI-provided Chrome or Chromium, selected by CHROME_BIN or standard executable locations. Its version is environment-provided and is not locked as a project dependency. The runner records the actual version in evidence. Chrome is separately licensed browser software; Chromium and its third-party notices remain with their upstream distribution. No browser binary/source/resource is redistributed in the public tree. It exposes only a temporary loopback debugging endpoint for synthetic tests; no user profile, cookies, credentials or production service is accessed. This is an execution prerequisite, not an added runtime/build/test package dependency.
