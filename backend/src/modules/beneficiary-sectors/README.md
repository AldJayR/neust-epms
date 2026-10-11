# Dynamic beneficiary sectors

Sectors are shared reference data, but leaders may create new labels when saving a
proposal. There is no approval or management workflow.

## Identity and search

- PostgreSQL generates `normalized_key` using the expression in
  `src/db/sector-normalization.ts`: collapse whitespace, trim, then lowercase.
- A partial unique index prevents duplicate active identities, including
  concurrent inserts. Display labels retain their capitalization.
- `synchronizeProposalSectors` handles both proposal create/update and legacy
  `sectorNames`/`sectorIds` requests. Selected IDs and new labels can coexist.
- `GET /beneficiary-sectors/search?q=...` is authenticated for operational roles
  and returns at most ten labels. Exact matches precede prefixes and fuzzy matches.
- Searches of fewer than three characters use only exact/prefix matching.
  Longer searches use `pg_trgm` similarity and word similarity. Its namespace is
  discovered so existing `public` or `extensions` installations work unchanged.
- SQL patterns escape `%`, `_`, and backslashes. Search values are bound parameters.
- Similarity is **not** used to resolve or merge identities. Acronyms and synonyms
  without an explicit existing selection remain separate labels.

## Migration and analytics

Migration `0013_beneficiary_sector_search.sql` enables `pg_trgm`, preserves original
labels, and redirects case/spacing-equivalent proposal links to the lowest existing
sector ID. If any equivalent link was active, the surviving link remains active.
Superseded sector rows remain with `merged_into_id` for provenance and compatibility
with older IDs. They are excluded from suggestions and new identity creation.

`proposal_beneficiaries.entered_labels` preserves original wording, including across
subsequent saves. It is not an alias dictionary used by search.

Analytics continues grouping by sector ID and counting distinct proposals. Since
links are reconciled in the migration and writes use the shared resolver, charts,
drill-downs, and CSV exports use the same identities. Category counts overlap when
a proposal targets multiple sectors; they cannot be summed as unique project totals.

## Deployment

From `backend`, inspect existing data before migrating:

```sh
node --import tsx scripts/audit-beneficiary-sectors.ts
node node_modules/drizzle-kit/bin.cjs migrate
```

Deploy backend and frontend after applying the migration. The migration fails
transactionally if blank legacy sector names exist, rather than silently discarding
them. It discovers the installed extension schema when creating the trigram index.
