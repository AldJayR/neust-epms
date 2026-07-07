# UX Heuristics Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address the remaining UX issues from the heuristics evaluation not covered by the existing UX improvements plan (Act/Wait/Watch, Action Center, Project Readiness, status descriptions, accessibility).

**Architecture:** Backend-first — error handling, audit, and consistency fixes land first, then frontend confirmation dialogs and onboarding build on stable APIs.

**Tech Stack:** Hono + Drizzle ORM + Zod (backend), React 19 + TanStack Start + shadcn/ui (frontend)

**shadcn/ui Components Used:** `AlertDialog` (confirm dialogs), `Tooltip` (status tooltips), `Stepper` + `StepperItem` + `StepperSeparator` (lifecycle stepper), `Tour` + `TourStep` + `TourSpotlight` (onboarding), `Empty` + `EmptyMedia` + `EmptyTitle` + `EmptyDescription` (empty states), `StatusBadge` (already has tooltips via `getStatusDescription()`), `Button` (CTAs), `Badge` (status indicators), `Field` + `FieldLabel` + `FieldError` (form fields), `Progress` (upload progress)

---

## Phase 1: Backend Consistency Fixes

### Task 1.1: Fix project details 404 response format

**Files:**
- Modify: `backend/src/routes/projects.routes.ts:936-938`

**Step 1: Read the current inconsistent response**

Read around line 936 of `projects.routes.ts` to see the 404 handler that's missing the `code` field.

**Step 2: Fix the response**

Change:
```ts
return c.json({ error: { message: "Project not found" } }, 404);
```
To:
```ts
throw new ApiError(404, "NOT_FOUND", "Project not found");
```

This matches the standard pattern used across all other routes.

**Step 3: Verify**

Run: `cd backend && npx vitest run`
Expected: All existing tests pass (no behavior change, only format change).

### Task 1.2: Normalize notification type casing

**Files:**
- Modify: `backend/src/lib/notification.helpers.ts`
- Search: All files calling `createNotification` or inserting into `notifications` table

**Step 1: Find all notification type values**

Grep for `type:` in notification creation calls to find inconsistent casing (`"proposal"` vs `"Proposal"`).

**Step 2: Normalize to lowercase**

Change all occurrences to `"proposal"` (lowercase). Add a comment in `notification.helpers.ts` documenting the allowed types as a TypeScript union:

```ts
export type NotificationType = "proposal" | "project" | "moa" | "report" | "system" | "admin";
```

**Step 3: Verify**

Run: `cd backend && npx tsc --noEmit`
Expected: No type errors.

### Task 1.3: Add custom Zod validation error handler

**Files:**
- Modify: `backend/src/lib/errors.ts`
- Modify: `backend/src/app.ts` (wire error handler)

**Step 1: Read current error handler**

Read `errors.ts` to understand the existing `installApiErrorHandler` pattern.

**Step 2: Add Zod validation interceptor**

```ts
import { ZodError } from "zod";

// In installApiErrorHandler, before the existing handlers:
app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.errors.map(e => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    }, 400);
  }
  // ... existing error handling
});
```

**Step 3: Verify the error format**

Write a quick test hitting a route with invalid body:
```bash
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email"}' | python -m json.tool
```
Expected: `"code": "VALIDATION_ERROR"` with `details` array.

### Task 1.4: Add database constraint error mapping

**Files:**
- Modify: `backend/src/lib/errors.ts`

**Step 1: Add Drizzle/PostgreSQL error interceptor**

After existing error handlers in `installApiErrorHandler`, add:

```ts
// Drizzle/PostgreSQL constraint violations
if (err instanceof PostgresError) {
  if (err.code === "23505") { // unique_violation
    return c.json({
      error: {
        code: "DUPLICATE_ENTRY",
        message: "A record with this value already exists.",
      },
    }, 409);
  }
  if (err.code === "23503") { // foreign_key_violation
    return c.json({
      error: {
        code: "REFERENCE_ERROR",
        message: "This record is referenced by other data and cannot be modified.",
      },
    }, 409);
  }
  if (err.code === "23514") { // check_violation
    return c.json({
      error: {
        code: "CONSTRAINT_VIOLATION",
        message: "The data violates a business rule constraint.",
      },
    }, 400);
  }
}
```

Import `PostgresError` from `postgres` package.

**Step 2: Verify**

Run: `cd backend && npx vitest run`
Expected: All tests pass.

### Task 1.5: Mark HTTP 422 as used or consolidate

**Files:**
- Modify: `backend/src/lib/errors.ts` (the `Status` type union)

If 422 is never used across all routes, remove it from the type union and always use 400 for validation errors. This prevents future developers from wondering which to use.

---

## Phase 2: Audit Trail Enhancement

### Task 2.1: Create audit diff helper

**Files:**
- Create: `backend/src/lib/audit-diff.ts`

```ts
export function captureAuditDiff<T extends Record<string, unknown>>(
  before: T,
  after: T,
  sensitiveKeys: (keyof T)[],
): { oldValue: Partial<T>; newValue: Partial<T> } {
  const oldValue: Partial<T> = {};
  const newValue: Partial<T> = {};

  for (const key of sensitiveKeys) {
    const beforeVal = JSON.stringify(before[key]);
    const afterVal = JSON.stringify(after[key]);
    if (beforeVal !== afterVal) {
      oldValue[key] = before[key];
      newValue[key] = after[key];
    }
  }

  return { oldValue, newValue };
}
```

**Step 2: Write a test**

```ts
describe("captureAuditDiff", () => {
  it("captures changed fields only", () => {
    const before = { title: "Old", budget: 100, status: "Draft" };
    const after = { title: "New", budget: 100, status: "Draft" };
    const result = captureAuditDiff(before, after, ["title", "budget", "status"]);
    expect(result.oldValue).toEqual({ title: "Old" });
    expect(result.newValue).toEqual({ title: "New" });
  });
});
```

### Task 2.2: Populate diffs for proposal updates

**Files:**
- Modify: `backend/src/routes/proposals.routes.ts`

Find the PATCH handler (around the proposal update section). Before the update:

```ts
const [oldProposal] = await db.select(...).where(eq(proposals.proposalId, id)).limit(1);
```

After update, before `createAuditLog`:
```ts
const diff = captureAuditDiff(oldProposal, updatedData, ["title", "budgetNeust", "budgetPartner", "targetStartDate", "targetEndDate"]);
```

Pass `oldValue: diff.oldValue, newValue: diff.newValue` to `createAuditLog`.

### Task 2.3: Populate diffs for user profile updates

**Files:**
- Modify: `backend/src/routes/admin.routes.ts`

Same pattern as 2.2 but for user profile updates. Sensitive keys: `firstName`, `lastName`, `email`, `roleId`, `isActive`, `campusId`, `departmentId`.

### Task 2.4: Populate diffs for project transitions

**Files:**
- Modify: `backend/src/routes/projects.routes.ts`

Same pattern for project status transitions. Sensitive keys: `projectStatus`.

### Task 2.5: Create AUDIT_GUIDE.md

**Files:**
- Create: `docs/audit-guide.md`

Document what audit logs track, how to read diffs, and how to use them for compliance. Audience: Super Admin (Alex).

---

## Phase 3: Frontend UX Fixes

### Task 3.1: Add `isDeniedAccess` alias for `requireRole`

**Files:**
- Modify: `frontend/src/lib/permissions.ts`

```ts
export function isDeniedAccess(user: AuthUser | null, ...roles: string[]): boolean {
  return requireRole(user, ...roles);
}
```

Add a JSDoc comment clarifying the semantics: `"Returns true if the user does NOT have any of the specified roles (i.e., access is denied)."`

Update all route guards to use `isDeniedAccess` instead of `requireRole` for readability.

### Task 3.2: Add confirmation dialogs for destructive actions

**Files:**
- Modify: `frontend/src/features/director/proposal-review-page.tsx` (reject proposal)
- Modify: `frontend/src/features/director/project-details-page.tsx` (close project)
- Modify: `frontend/src/features/admin/users-page.tsx` (deactivate user, bulk actions)

**Step 1: Create a reusable `ConfirmDialog` component**

**Files:**
- Create: `frontend/src/components/custom/confirm-dialog.tsx`

```tsx
// Props: open, onOpenChange, onConfirm, title, description, confirmLabel, confirmVariant
// Uses shadcn AlertDialog
// For permanent actions: requires typing confirmation text
```

**Step 2: Wrap each destructive action**

For proposal rejection:
```tsx
<ConfirmDialog
  open={rejectDialogOpen}
  onOpenChange={setRejectDialogOpen}
  onConfirm={handleReject}
  title="Reject Proposal"
  description={`This will permanently reject "${proposal.title}". This action cannot be undone.`}
  confirmLabel="Reject Proposal"
  confirmVariant="destructive"
  requireTyping="REJECT"
/>
```

For project closure — similar pattern with `"CLOSE"` typed confirmation.

For user deactivation — use a medium-tier confirmation (simple "Are you sure?" without typed text, since deactivation is reversible).

**UI Components:** `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel` from `components/ui/alert-dialog.tsx`. Also uses `Input` from `components/ui/input.tsx` for typed confirmation, `Field` + `FieldError` from `components/ui/field.tsx`.

---

## Phase 4: In-App Help & Onboarding

### Task 4.1: Verify and enhance contextual tooltip system for status badges

**Files:**
- Verify: `frontend/src/components/ui/status-badge.tsx` (already has tooltips)
- Verify: `frontend/src/lib/status-descriptions.ts` (already imported)
- Modify (if needed): `frontend/src/components/ui/status-badge.tsx`

**NOTE:** `status-badge.tsx` already wraps each badge in `Tooltip` + `TooltipContent` and calls `getStatusDescription()` from `@/lib/status-descriptions`. This task is to **verify** the existing implementation covers all statuses and add any missing ones.

**Step 1: Verify `getStatusDescription()` coverage**

Read `frontend/src/lib/status-descriptions.ts` and confirm all statuses in `STATUS_MAP` (from `status-badge.tsx`) have corresponding entries. Missing statuses to check: `"Draft"`, `"Active"`, `"Deactivated"`, `"Terminated"`, `"Renewal Needed"`.

**Step 2: Add any missing status descriptions**

If `getStatusDescription()` falls through to a fallback for any status, add the missing entry:

```ts
// Only if missing from status-descriptions.ts:
"Draft": { label: "Draft", explanation: "Saved but not yet submitted for review." },
"Active": { label: "Active", explanation: "This account is active and in good standing." },
"Deactivated": { label: "Deactivated", explanation: "This account has been deactivated by an administrator." },
```

**UI Components:** `Tooltip`, `TooltipTrigger`, `TooltipContent` from `components/ui/tooltip.tsx`. `Badge` from `components/ui/badge.tsx`. `StatusBadge` already uses these — verify only.

### Task 4.2: Create proposal lifecycle stepper

**Files:**
- Create: `frontend/src/features/proposals/proposal-lifecycle-stepper.tsx`
- Modify: `frontend/src/features/director/proposal-review-page.tsx` (place stepper)

**UI Components:** Use the existing `Stepper`, `StepperItem`, `StepperSeparator`, `StepperIndicator`, `StepperTitle` from `components/ui/stepper.tsx`. These support keyboard navigation, RTL, and `data-[state=active|completed]` styling out of the box.

**Step 1: Create the stepper wrapper**

```tsx
import { Stepper, StepperItem, StepperSeparator, StepperIndicator, StepperTitle } from "#/components/ui/stepper";
import { Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { getStatusDescription } from "@/lib/status-descriptions";

interface ProposalLifecycleStepperProps {
  currentStatus: string;
  className?: string;
}

const LIFECYCLE_STEPS = [
  { status: "Draft",            label: "Draft" },
  { status: "Pending Review",   label: "Review" },
  { status: "Endorsed",         label: "Endorsed" },
  { status: "Approved",         label: "Approved" },
  { status: "PROJECT",          label: "Project", isTerminal: true },
] as const;

function getStepState(stepStatus: string, currentStatus: string, steps: readonly { status: string }[]) {
  const currentIndex = steps.findIndex(s => s.status === currentStatus);
  const stepIndex = steps.findIndex(s => s.status === stepStatus);
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "inactive";
}

export function ProposalLifecycleStepper({ currentStatus, className }: ProposalLifecycleStepperProps) {
  const isRejected = currentStatus === "Rejected";
  const isReturned = currentStatus === "Returned";

  // Map status to the linear step index for the Stepper component
  const activeStep = LIFECYCLE_STEPS.findIndex(s => s.status === currentStatus);

  return (
    <div className="flex flex-col gap-2">
      <Stepper
        defaultValue={Math.max(0, activeStep)}
        orientation="horizontal"
        className={className}
      >
        {LIFECYCLE_STEPS.map((step, index) => (
          <StepperItem key={step.status} value={String(index)} completed={index < activeStep}>
            <Tooltip>
              <TooltipTrigger render={<StepperIndicator />}>
                {index < activeStep ? <Check className="size-4" /> : index + 1}
              </TooltipTrigger>
              <TooltipContent>
                <p>{getStatusDescription(step.status).explanation}</p>
              </TooltipContent>
            </Tooltip>
            <StepperTitle>{step.label}</StepperTitle>
            {index < LIFECYCLE_STEPS.length - 1 && <StepperSeparator />}
          </StepperItem>
        ))}
      </Stepper>

      {/* Branch indicators for Returned/Rejected */}
      {isReturned && (
        <p className="text-sm text-orange-600">
          Returned for revision — resubmit to restart the review process.
        </p>
      )}
      {isRejected && (
        <p className="text-sm text-red-600">
          Proposal was not approved.
        </p>
      )}
    </div>
  );
}
```

### Task 4.3: Add first-login onboarding

**Files:**
- Create: `frontend/src/features/layout/onboarding.tsx`
- Modify: `frontend/src/routes/_authenticated.tsx`

**UI Components:** Use the existing `Tour`, `TourStep`, `TourSpotlight`, `TourSpotlightRing`, `TourPortal`, `TourHeader`, `TourTitle`, `TourDescription`, `TourFooter`, `TourNext`, `TourSkip`, `TourStepCounter` from `components/ui/tour.tsx`. This component already handles focus trapping, Escape key, spotlight masking, step navigation, and accessibility out of the box.

**Alternative:** If a spotlight tour is too intrusive for first-time users, use `Dialog` + `DialogHeader` + `DialogTitle` + `DialogDescription` + `DialogContent` from `components/ui/dialog.tsx` for a simpler modal approach.

**Step 1: Track onboarding state**

Use `localStorage` flag `onboarding_seen` (simpler than backend change, no DB migration).

**Step 2A: Tour-based approach (recommended)**

```tsx
import { Tour, TourStep, TourSpotlight, TourPortal, TourHeader, TourTitle, TourDescription, TourFooter, TourNext, TourSkip, TourStepCounter } from "#/components/ui/tour";

// In the authenticated layout:
<Tour
  open={showOnboarding}
  onOpenChange={setShowOnboarding}
  onComplete={() => localStorage.setItem("onboarding_seen", "true")}
  onSkip={() => localStorage.setItem("onboarding_seen", "true")}
>
  <TourSpotlight />
  <TourPortal>
    <TourStep target="#main-content" side="bottom">
      <TourHeader>
        <TourTitle>Welcome to NEUST-EPMS</TourTitle>
        <TourDescription>
          This system manages extension service projects across all NEUST campuses.
        </TourDescription>
      </TourHeader>
      <TourFooter>
        <TourSkip />
        <TourNext />
      </TourFooter>
    </TourStep>

    <TourStep target="[data-sidebar='sidebar']" side="right">
      <TourHeader>
        <TourTitle>Your Navigation</TourTitle>
        <TourDescription>
          Use the sidebar to access your dashboard, projects, and reports.
        </TourDescription>
      </TourHeader>
      <TourFooter>
        <TourSkip />
        <TourNext />
      </TourFooter>
    </TourStep>

    <TourStep target="#action-center" side="bottom">
      <TourHeader>
        <TourTitle>Action Center</TourTitle>
        <TourDescription>
          Items requiring your attention appear here, prioritized by urgency.
        </TourDescription>
      </TourHeader>
      <TourFooter>
        <TourSkip />
        <TourNext>Got it!</TourNext>
      </TourFooter>
    </TourStep>
  </TourPortal>
</Tour>
```

**Step 2B: Modal-based approach (simpler alternative)**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";

<Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Welcome to NEUST-EPMS</DialogTitle>
      <DialogDescription>
        {role === "Faculty" && "Submit proposals, track projects, and submit reports."}
        {role === "RET Chair" && "Review and endorse proposals from your college."}
        {role === "Director" && "Approve proposals, activate projects, and monitor progress."}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={() => { localStorage.setItem("onboarding_seen", "true"); setShowOnboarding(false); }}>
        Got it, let's go!
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Step 3: Wire into root layout**

Show the tour/modal once when `onboarding_seen` is not in `localStorage`. Set the flag after completion/dismissal.

### Task 4.4: Improve empty states with actionable CTAs

**Files:**
- Search all files containing empty state messages ("No X found", "No records", etc.)
- Modify each with contextual CTAs

**UI Components:** Use `Empty`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent` from `components/ui/empty.tsx` and `Button` from `components/ui/button.tsx` for CTA links. The `Empty` component already handles centering, dashed border, and icon styling.

**Pattern:**

| Current | Proposed |
|---------|----------|
| "No project proposals or ongoing projects found for you." | `Empty` with `EmptyMedia variant="icon"` + `EmptyTitle` + `EmptyDescription` with `<Link>` CTA |
| "No records found." | `Empty` with "No records match your filters." + `Button` variant="outline" to clear filters |
| "No recent activities." | `Empty` with "No recent activity yet." + contextual icon |
| "No notifications" | `Empty` with `EmptyMedia` + "No new notifications." |
| "No MOAs expiring soon." | `Empty` with checkmark icon + "All MOAs have valid terms." |

**Step 1: Locate all empty states**

Grep for strings like "No ", "no records", "no projects", "no proposals", "no notifications", "no recent", "nothing found", "nothing here", "empty".

**Step 2: Update each with contextual CTA**

Each empty state gets:
1. A `Empty` wrapper with proper structure
2. `EmptyMedia` with appropriate icon variant
3. `EmptyTitle` with clear message
4. `EmptyDescription` with actionable CTA (Button or Link)
5. `EmptyContent` for CTA buttons

### Task 4.5: Verify onboarding accessibility

**Files:**
- Modify: `frontend/src/features/layout/onboarding.tsx` (if using Tour-based approach, skip — `Tour` handles this)
- Modify: `frontend/src/features/layout/onboarding-modal.tsx` (if using Dialog-based approach)

**If using Tour-based approach (Task 4.2A):** The `Tour` component already handles:
- `Escape` key dismissal (built-in)
- Focus trapping (via `useFocusTrap` hook)
- Focus restoration on close (via `previouslyFocusedElementRef`)
- Spotlight masking
- Keyboard navigation between steps

**No additional work needed** — verify by testing:
1. Press `Escape` during tour → tour closes
2. Tab through tour → focus stays within the step
3. Complete tour → focus returns to the element that was focused before

**If using Dialog-based approach (Task 4.2B):** The `Dialog` component already handles:
- `Escape` key dismissal (built-in)
- Focus trapping (via `@base-ui/react/dialog`)
- Backdrop click dismissal
- `aria-modal="true"` (set by primitive)

**Verify by testing:** Same as above.

---

## Phase 5: Testing & Polish

### Task 5.1: Backend tests

Run: `cd backend && npx vitest run`
Expected: All existing tests pass.

Add tests for:
- `captureAuditDiff` (unit test)
- Error handler with Zod validation (integration)
- Error handler with PostgresError (integration)
- Audit log diff population (integration)

### Task 5.2: Frontend tests

Run: `cd frontend && npx vitest run`
Expected: All existing tests pass.

### Task 5.3: Lint and type check

Run: `npx biome check .` in both backend and frontend
Run: `npx tsc --noEmit` in both packages
Expected: Clean.

### Task 5.4: Manual UX verification checklist

- [x] Submit invalid registration → see `VALIDATION_ERROR` with field details
- [x] View proposal → tooltip shows explanation on status hover
- [x] Click "Reject" → typed confirmation dialog appears
- [x] First login → onboarding tour/modal shows (one time only)
- [x] Empty state on faculty dashboard → "Create your first proposal" CTA visible
- [x] Deactivate user → "Are you sure?" dialog appears
- [x] Update proposal → audit log shows `oldValue`/`newValue` diffs
- [x] Notification with type "Proposal" → still works after casing fix (no frontend breakage)
- [x] Proposal lifecycle stepper shows correct step for each status

---

## Files Changed Summary

| File | Action | Phase |
|------|--------|-------|
| `backend/src/routes/projects.routes.ts` | Modify (2x) | 1.1, 2.4 |
| `backend/src/lib/notification.helpers.ts` | Modify | 1.2 |
| `backend/src/lib/errors.ts` | Modify | 1.3, 1.4, 1.5 |
| `backend/src/app.ts` | Modify | 1.3 |
| `backend/src/lib/audit-diff.ts` | **Create** | 2.1 |
| `backend/src/routes/proposals.routes.ts` | Modify | 2.2 |
| `backend/src/routes/admin.routes.ts` | Modify | 2.3 |
| `docs/audit-guide.md` | **Create** | 2.5 |
| `frontend/src/lib/permissions.ts` | Modify | 3.1 |
| `frontend/src/components/custom/confirm-dialog.tsx` | **Create** | 3.2 |
| `frontend/src/features/director/proposal-review-page.tsx` | Modify | 3.2 |
| `frontend/src/features/director/project-details-page.tsx` | Modify | 3.2 |
| `frontend/src/features/admin/users-page.tsx` | Modify | 3.2 |
| `frontend/src/components/ui/status-badge.tsx` | Verify/Modify | 4.1 |
| `frontend/src/lib/status-descriptions.ts` | Verify/Modify | 4.1 |
| `frontend/src/features/proposals/proposal-lifecycle-stepper.tsx` | **Create** | 4.2 |
| `frontend/src/features/layout/onboarding.tsx` | **Create** | 4.3, 4.5 |
| `frontend/src/routes/_authenticated.tsx` | Modify | 4.3 |
| Various frontend empty states | Modify (n) | 4.4 |

---

## Quick Reference: Principles Addressed

| Heuristic / Principle | Tasks |
|-----------------------|-------|
| H4: Consistency & Standards | 1.1, 1.2, 1.5, 3.1 |
| H5: Error Prevention | 1.4, 3.2 |
| H9: Recognize & Recover | 1.3, 1.4 |
| H10: Help & Documentation | 4.1, 4.2, 4.3, 4.4 |
| Norman: Feedback | 1.3, 1.4, 3.2 |
| Shneiderman: Reversal | 3.2 |
| ISO 9241-210: Whole UX | 2.1-2.5, 4.1-4.5 |
| WCAG: Understandable | 4.1, 4.5 |
| RA 9470 (Compliance) | 2.1-2.5 |
