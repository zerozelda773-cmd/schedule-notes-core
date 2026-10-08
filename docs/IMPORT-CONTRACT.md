# Preview-first import

importPreview({format,text,entityType,dataset,sourceId,batchId,policy}) performs READ → PARSE → NORMALIZE → VALIDATE → MATCH → PREVIEW without writing. Explicit commitImport(preview,store) performs the write. This public adapter requires synthetic rows.

JSON is an array without source fields. CSV supports quoted commas, doubled quotes, multiline cells and CRLF. Use JSON for nested fields such as customerIds or planPeriod. Excel has an interface only. BOM removal and decimal/boolean/null conversion are listed in normalizations. Names/IDs are not trimmed or repaired. CSV empty or literal null numeric cells become explicit null; scientific notation and invalid tokens fail. Assigned import source metadata is reported.

Preview counts: valid=eligible changes; invalid=blocked rows; duplicate=repeated rows/facts; ignored=unchanged duplicates. Duplicate/ignored overlap. Ambiguous/unmatched are quality counts overlapping invalid. Any invalid row or projected reference error blocks the whole batch. No valid subset commits automatically.

Optional transient hospitalName/departmentName/employeeName/customerName/productName can show matching candidates. They do not become stored keys. PROBABLE requires an explicit ID; AMBIGUOUS remains blocked. A supplied ID never falls back to name. A contradictory name/ID pair fails.

Policies: updates reject by default, replace explicitly. Deletes reject by default; explicit requires {id,synthetic:true,operation:"delete"}. Absence never means deletion. Deleting a referenced entity fails preview. Upsert is the default operation.

Exact text SHA-256 plus sourceId detects repeated files. Different formatting can create a distinct batch but cannot duplicate identical facts. Batch IDs cannot be reused for different input. Conflicting duplicates in one file all fail. Limits: 2 million text characters, 10,000 rows.

Preview actions are frozen with dataset revision and plan-integrity hash. Hashing detects changes; it does not authenticate authorship. Commit revalidates, rejects stale/tampered/relabelled previews, and uses compare-and-swap. Repeated import returns NO_CHANGE.

Storage interface: read() returns an isolated snapshot; writeAtomic(next,{expectedRevision}) must atomically compare/swap or return STALE_PREVIEW. Bundled memory storage guarantees this within one JavaScript instance only. Durable/multi-process storage needs an external transaction implementation; no production database is included.
