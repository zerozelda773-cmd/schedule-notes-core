# Consumable entry and package boundary

index.mjs is the ES Module entry; core/index.js is the CommonJS entry. The default ESM export is ScheduleNotesCore, and every public facade member has the corresponding named export. Runtime exports match the declaration surface and are checked in a real tarball consumer. Node and native browser ESM retain existing modules behind an ordered bridge. No large module rewrite or build dependency is required. Existing browser global ScheduleNotesCore remains supported; ScheduleCoreV2 is internal.

The conditional exports map admits only the package root, documented deprecated ./legacy boundary and ./adapter-test-suite conformance helper. Implementation subpaths such as core/state.js are blocked by Node's export map. Internal files remain distributed implementation details, not caller contracts.

The files whitelist includes Core/adapter source, entry, declarations, documentation, license and notices. Tests, synthetic source fixtures, demo, scanners, Git history and internal evidence are excluded from the tarball. The real consumer test packs and installs a local tarball into a separate temporary project, verifies ESM and CJS, and verifies internal subpaths are blocked. It uses offline npm with lifecycle scripts disabled.

Package metadata remains private: true; version is 0.4.0-candidate.1. This prevents npm publication. No npm package, version tag, attestation or new signing infrastructure is published by Phase 4 work. Future npm publication requires a separate Human Gate and reviewed package whitelist.

Core business logic does not depend on Demo UI or DOM. Persistent storage needs a supported IndexedDB environment. Android WebView and a second browser engine are not silently implied to be tested.
