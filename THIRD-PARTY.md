# Dependency and redistribution inventory

No runtime, build or test package dependencies are bundled or installed. Node.js, npm and Python are user-provided tools, not distributed in this repository. The UI uses system fonts and no external images.

| Component | Version | License | Source | Redistribution / notice | Compatibility |
|---|---|---|---|---|---|
| Original Web Core, scripts, tests, fixture and docs | 0.1.0 | Apache-2.0 | This repository | LICENSE and NOTICE included | Apache-2.0 |
| Apache license text | 2.0 | Standard license text | https://www.apache.org/licenses/LICENSE-2.0.txt | Unmodified standard text | Project license |
| actions/checkout (CI only; not bundled) | v7, 3d3c42e5aac5ba805825da76410c181273ba90b1 | MIT | https://github.com/actions/checkout | Used as upstream GitHub Action; upstream MIT notice retained by upstream distribution | Compatible, separately licensed |
| actions/setup-node (CI only; not bundled) | v7, 820762786026740c76f36085b0efc47a31fe5020 | MIT | https://github.com/actions/setup-node | Used as upstream GitHub Action; upstream MIT notice retained by upstream distribution | Compatible, separately licensed |

All original private assets and dependencies of uncertain license are excluded. Nothing from those components is redistributed here. No permission to distribute the private product is implied.
