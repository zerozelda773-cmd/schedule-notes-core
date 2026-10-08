# Candidate matching and aliases

The matching namespace offers `normalize`, `score`, `createAliasRegistry` and
`candidates`. It proposes identity candidates only. Existing `resolveIdentity`
keeps the v0.3.0 contract: an explicit stable ID in the right scope can resolve
EXACT; matching a name is never enough to produce an accepted exact ID.

`normalize(text)` applies Unicode NFKC, trims and collapses whitespace and uses
explicit English case folding. Empty or non-text input becomes an empty string.
`score(left, right)` is deterministic, symmetric and bounded from zero to one.
Identical nonempty normalized text scores one. Other text uses character-set
Jaccard similarity. This intentionally small scoring function is not a medical
or business-specific mapping, and no probability calibration is implied.

```js
const registered = ScheduleNotesCore.matching.createAliasRegistry(dataset, [
  { entityType: 'Department', id: 'D_SYN_001',
    namespace: 'H_SYN_001', alias: 'Synthetic Previous Department' }
]);
const result = ScheduleNotesCore.matching.candidates('Department', {
  name: 'Synthetic Previous Department', namespace: 'H_SYN_001'
}, dataset, { aliases: registered.aliases });
```

An alias belongs to a known stable entity ID and its namespace. The registry is
separate metadata: it does not add alias fields to schema 2 facts, mutate a name,
or generate a new entity on rename. Non-Department entities use their global
entity-type namespace (`namespace: null`). Department entries require the owner
Hospital ID. The same text in two Hospital namespaces remains isolated. Unknown
owners, invalid scope, unsupported fields and unsafe inputs reject the complete
alias registry. Equivalent aliases for the same owner deduplicate; the same
alias owned by different IDs remains an ambiguous candidate relation.

`candidates(type, { name, namespace? }, dataset, options)` accepts optional
`aliases`, `threshold` (default 0.25) and `limit` (default 20, maximum 100).
Department queries require a Hospital namespace. Candidate names are bounded to
4096 characters. The result includes `quality`, `id: null`, `candidates` and an
optional typed error. A candidate contains its stable `id`, `namespace`, `score`,
`basis` (`CANONICAL` or `ALIAS`) and `quality: PROBABLE`.

Candidates sort by descending score, then by stable ID for equal scores. A tied
top score is AMBIGUOUS, no positive match is UNMATCHED, otherwise quality remains
PROBABLE. Applying a display limit never removes the ambiguity classification.
The result never contains `quality: EXACT` or a selected top-level ID. Callers
must validate an explicit stable ID separately before a fact command.

This public implementation contains no real Hospital/Customer names or private
mapping tables. Scores and aliases are local outputs, not diagnostic logs.
