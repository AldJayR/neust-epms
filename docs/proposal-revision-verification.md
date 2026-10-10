# Proposal revision responses and verification

## Workflow

1. A RET Chair or Director marks feedback as **Revision required** or **Remark** while reviewing the current submission.
2. Returning a proposal creates a response cycle. If no actionable request exists at the returning stage, the return reason becomes a general revision request.
3. The project leader uploads a revised PDF and saves a **Changed** or **Clarification / change not made** response for each outstanding request. Revised-page references are optional.
4. Resubmission validates PDF freshness and saved responses in one proposal-locked transaction, records the submitted PDF, and freezes the response snapshots.
5. The Chair reviews Chair feedback. The Director reviews Director feedback. Any authorized reviewer at the owning stage can verify, with their identity recorded.
6. Endorsement/approval requires that stage's requests to be resolved. A Director return still goes through fresh Chair endorsement.
7. Further returns require fresh or explicitly reconfirmed responses. Older documents, responses, and verification decisions remain available in history.
8. An authorized reviewer at the owning stage can reopen a resolved request during a later submission. A reason is required; the reopening records the current submission separately and preserves earlier acceptance decisions. Reopened requests block that stage's approval until addressed in a new return/resubmission cycle.

## UI

- **Proposal Review → Feedback:** cross-version requests, status/stage filters, original/revised PDF navigation, and verification controls. Current-PDF comments are shown beneath revision requests.
- **Returned proposal editor → Responses:** a sixth wizard step with saved leader responses and resubmission readiness. The preceding File step saves the revised upload before entering Responses.
- Save each response using **Save response**. Editing a previously saved response shows an unsaved-changes notice.
- Special-order PDFs and institutional approval scans remain viewable through the existing document viewer.

## Persistence

- `proposal_submissions` identifies the PDF actually submitted, independently of PDF upload version and proposal `revision_num`.
- `proposal_revision_requests` preserves the original concern and owning stage.
- `proposal_revision_responses` holds editable cycle-specific drafts and immutable submitted snapshots.
- `proposal_revision_verifications` is append-only verification history.
- `proposal_revision_reopenings` records why a historical resolved request was reopened, by whom, and against which submitted PDF. Apply migration `0011` as well as `0010` before using reopening.
- New review rows reference their submission. Legacy rows retain null references rather than inventing authoritative history.

## Migration

Apply `backend/drizzle/0010_proposal_revision_verification.sql` through the existing migration runner before using the feature:

```sh
# From backend/
pnpm db:migrate
```

Existing comments default to **Remark** and do not introduce retroactive blockers. A reviewer can explicitly promote an existing comment into an actionable request with **Require revision**.

## Verification

- `backend/test/integration/proposal-revisions.integration.spec.ts` covers version linkage, saved-response gates, stage ownership, permission enforcement, repeated returns, legacy promotion, and concurrent resubmission.
- `frontend/src/features/proposals/components/revision-workspace.test.tsx` covers leader response payloads, verification explanations, and stage-specific action visibility.
