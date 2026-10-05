# Extension Analytics Simplification

## Goal
Keep extension analytics focused on read-only reporting. Trainee counts are recorded during terminal submission and approved through project closure; there is no separate post-closure correction workflow.

## Implementation
1. Remove the correction dialog, server function, PATCH endpoint, schema, service, and correction-specific documentation/tests. Keep nullable historical counts, report package recovery, and closure checks.
2. Extract the existing faculty active-involvement query into a shared helper used by the faculty directory and analytics. Analytics keeps its authorized project/unit filters; the directory retains its existing behavior.
3. Replace the mixed faculty/project analytics row with two explicit row contracts and dedicated table components. Share filters, summary cards, pagination, and layout without duplicating whole pages.
4. Separate summary calculation from detail-row fetching. CSV export computes summaries once and fetches only detail rows for subsequent batches in the same read-only snapshot.

## Verification
- Per the user's latest instruction, skip further test writing and execution.
- Run backend/frontend typechecks and relevant lint/format checks.
- Review role scopes, shared involvement conditions, missing versus zero, CSV batching, and removal of the correction workflow in the diff.
- Inspect the final diff; do not change committed migrations or stored trainee counts.
