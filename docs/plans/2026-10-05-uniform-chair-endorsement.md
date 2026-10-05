# Uniform Chair Endorsement Implementation Plan

**Goal:** All submissions, including RET Chair submissions and revisions, require Chair endorsement before Director review. Per the updated requirement, endorsement is a direct action and requires no endorsement document.

**Architecture:** Retain the legacy `bypassedRetChair` field for data/API compatibility, but stop using it as a workflow permission. Use current proposal status to authorize review. Chairs may directly endorse their own submissions. Existing historical documents remain readable.

**Tech Stack:** TypeScript, Hono, Drizzle/PostgreSQL, React/TanStack Start, Vitest.

## 1. Reproduce the mismatch
- Update `backend/src/modules/proposals/proposal-review-policy.unit.test.ts`, `backend/src/lib/derived-states.unit.test.ts`, and `frontend/src/features/proposals/helpers/proposal-review-helpers.test.ts` to reject pending Director review even with a legacy bypass flag and allow Chair review on resubmission.
- Run the focused Vitest suites and confirm failures against the old behavior.

## 2. Align backend evaluation and queues
- Create proposals with `bypassedRetChair: false` in `backend/src/modules/proposals/proposals.service.ts`.
- Allow direct endorsement without a scan and remove the bypass branch from `proposal-review-policy.ts`.
- Route pending proposals to Chairs in `backend/src/lib/derived-states.ts` and `backend/src/modules/action-center/action-center.service.ts`.
- Remove bypass-based visibility/annotation restrictions in `backend/src/modules/director/director.service.ts` and `backend/src/modules/proposals/comments.routes.ts`.
- Update route and integration regressions for the uniform flow.

## 3. Align frontend evaluation
- Update `frontend/src/features/proposals/helpers/proposal-review-helpers.ts` and review UI to use current status rather than legacy bypass flags or historical reviews when exposing Chair controls.
- Expose Director approval only for the Endorsed state; remove the endorsement upload requirement from the dialog.

## 4. Verify
- Run backend unit/route tests and typecheck, frontend helper tests and typecheck, and relevant PostgreSQL integration tests.
- Inspect `git diff --check` and the final diff. Report any unavailable verification prerequisites.
