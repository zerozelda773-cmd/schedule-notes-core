# Security

The public Core and synthetic demo are independent from the private production product. Do not store sensitive data in the demo or expose its local server on an untrusted network.

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/zerozelda773-cmd/schedule-notes-core/security/advisories/new). Do not include secrets or real business data in public issues, PRs or screenshots. Provide synthetic reproduction steps, affected version and impact. No response-time guarantee is offered.

The project does not need production credentials. If private data or credentials enter a public surface, preserve evidence and notify the maintainer privately; deleting the file does not undo disclosure. Never test a discovered credential against a provider.

## Local diagnostics and code safety

Diagnostic callbacks are opt-in and local; listener failures are isolated and no uploader/provider is connected. Events contain enumerated operations/entities/results/error codes and counts, never caller text, names, input rows, token values or exception messages. Returned application records remain the caller's responsibility; diagnostic privacy does not anonymize arbitrary exports.

tools/dangerous.py rejects executable evaluation, dynamic Function construction, untrusted HTML sinks, prototype mutation sinks and executable deserialization patterns. JSON parsing alone does not execute code; inputs still require structural/schema guards and prototype-pollution boundary tests. Static pattern scanning is not complete data-flow analysis. Use textContent for UI output, fail closed on unsafe state and retain corruption evidence.
