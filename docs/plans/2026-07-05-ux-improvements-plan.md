# UX Research-Driven Improvements Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the gap between UX research findings (personas, journey maps, pain points, accessibility concerns, concept selection) and the current codebase implementation, prioritized by impact.

**Architecture:** Backend-first — derived-state helper functions and endpoints land first, then frontend builds UI on top. Each task produces a testable increment.

**Tech Stack:** Hono + Drizzle ORM (backend), TanStack Start/Router + shadcn/ui + Tailwind CSS v4 (frontend).

---

## Context

The deep-dive codebase analysis against UX research revealed 6 critical gaps and 7 moderate gaps. This plan addresses them in priority order:

1. **Act/Wait/Watch** derived states — raw DB statuses replaced with user-facing action states
2. **Action Center** — prioritized "Needs Your Action" landing for RET Chair and Director
3. **Project Readiness** — approval ≠ activation made explicit
4. **Proposal preparation** — drafts, requirements checklist, completeness checks
5. **Reporting schedule visibility** — due dates surfaced to users
6. **Accessibility** — color-independent statuses, plain-language explanations

---

## Phase 1: Act/Wait/Watch Derived States (Backend)

### Task 1.1: Create derived-state helper

**Files:**
- Create: `backend/src/lib/derived-states.ts`

**Steps:**

1. Create the derived state computation module:

```ts
import type { AuthUser } from "./types.js";
import type { ProjectStatus, ProposalStatus } from "./types.js";

export interface DerivedState {
  state: "ACT" | "WAIT" | "WATCH";
  owner: string;
  reason: string;
  nextTransition: string;
}

/**
 * Derives the user-facing action state for a proposal.
 * The same proposal may have different derived states for different users.
 */
export function deriveProposalState(
  proposal: {
    status: ProposalStatus;
    bypassedRetChair: boolean;
    leaderId?: string;
    campusId?: number;
    departmentId?: number | null;
  },
  user: AuthUser,
  options?: {
    isRtChair?: boolean;
    isDirector?: boolean;
    hasReviewed?: boolean;
  },
): DerivedState {
  const { status } = proposal;
  const { roleName } = user;

  if (status === "Returned") {
    if (user.userId === proposal.leaderId) {
      return {
        state: "ACT",
        owner: "You",
        reason: "Your proposal was returned for revision. Review the feedback and resubmit.",
        nextTransition: "Submit revised proposal",
      };
    }
    return {
      state: "WAIT",
      owner: "Project Leader",
      reason: "Proposal returned — waiting for faculty member to revise and resubmit.",
      nextTransition: "Resubmitted proposal",
    };
  }

  if (status === "Pending Review") {
    if (proposal.bypassedRetChair && options?.isDirector) {
      return {
        state: "ACT",
        owner: "You",
        reason: "This proposal previously cleared RET Chair review and has been resubmitted directly to your office.",
        nextTransition: "Approve, return, or reject",
      };
    }
    if (options?.isRtChair && !proposal.bypassedRetChair) {
      return {
        state: "ACT",
        owner: "You",
        reason: "New proposal awaiting college endorsement.",
        nextTransition: "Endorse, return, or reject",
      };
    }
    return {
      state: "WAIT",
      owner: proposal.bypassedRetChair ? "Director/Admin" : "RET Chair",
      reason: `Proposal pending ${proposal.bypassedRetChair ? "Director/Admin" : "RET Chair"} review.`,
      nextTransition: "Review decision",
    };
  }

  if (status === "Endorsed") {
    if (options?.isDirector) {
      return {
        state: "ACT",
        owner: "You",
        reason: "RET Chair endorsed this proposal. Final approval decision needed.",
        nextTransition: "Approve or return",
      };
    }
    return {
      state: "WAIT",
      owner: "Director/Admin",
      reason: "Proposal endorsed by RET Chair — awaiting Director/Admin approval.",
      nextTransition: "Approval decision",
    };
  }

  if (status === "Draft") {
    return {
      state: "ACT",
      owner: "You",
      reason: "Draft proposal — ready for editing and submission.",
      nextTransition: "Submit for review",
    };
  }

  if (status === "Approved") {
    return {
      state: "WATCH",
      owner: "System",
      reason: "Proposal approved — a project will be created automatically.",
      nextTransition: "Project activation",
    };
  }

  if (status === "Rejected") {
    return {
      state: "WATCH",
      owner: "System",
      reason: "Proposal rejected — project cannot proceed.",
      nextTransition: "No further action",
    };
  }

  return {
    state: "WATCH",
    owner: "System",
    reason: `Status: ${status}`,
    nextTransition: "No further action",
  };
}

/**
 * Derives the user-facing action state for a project.
 */
export function deriveProjectState(
  project: {
    projectStatus: ProjectStatus;
    moaId?: string | null;
    hasReports?: boolean;
    reportingSchedule?: boolean;
    leaderId?: string;
  },
  user: AuthUser,
): DerivedState {
  const { projectStatus } = project;
  const { roleName } = user;

  if (projectStatus === "Overdue") {
    return {
      state: "ACT",
      owner: "Project Leader",
      reason: "One or more reports are overdue. Immediate attention required.",
      nextTransition: "Submit overdue report(s)",
    };
  }

  if (projectStatus === "Expired") {
    return {
      state: "ACT",
      owner: "Director/Admin",
      reason: "MOA has expired. Project cannot continue until a valid MOA is assigned.",
      nextTransition: "Renew or reassign MOA",
    };
  }

  if (projectStatus === "Approved") {
    const blockers: string[] = [];
    if (!project.moaId) blockers.push("Valid MOA not assigned");
    if (!project.reportingSchedule) blockers.push("Reporting schedule not established");

    if (blockers.length > 0) {
      return {
        state: "WAIT",
        owner: "Director/Admin",
        reason: `Project approved but not yet activated. ${blockers.join("; ")}.`,
        nextTransition: "Activate project (Director/Admin)",
      };
    }
    return {
      state: "ACT",
      owner: "Director/Admin",
      reason: "All prerequisites complete. Ready for activation.",
      nextTransition: "Activate project",
    };
  }

  if (projectStatus === "Ongoing") {
    return {
      state: "WATCH",
      owner: "Director/Admin",
      reason: "Project is active and ongoing.",
      nextTransition: "Submit reports as scheduled",
    };
  }

  if (projectStatus === "Pending Closure") {
    if (user.userId === project.leaderId) {
      return {
        state: "ACT",
        owner: "You",
        reason: "Final reports submitted — awaiting Director/Admin review and closure.",
        nextTransition: "Closure confirmation",
      };
    }
    return {
      state: "WATCH",
      owner: "Director/Admin",
      reason: "Pending closure — awaiting Director/Admin review.",
      nextTransition: "Close project",
    };
  }

  if (projectStatus === "Completed") {
    return {
      state: "WATCH",
      owner: "System",
      reason: "Project completed.",
      nextTransition: "No further action",
    };
  }

  if (projectStatus === "Closed") {
    return {
      state: "WATCH",
      owner: "System",
      reason: "Project closed. No further action required.",
      nextTransition: "No further action",
    };
  }

  return {
    state: "WATCH",
    owner: "System",
    reason: `Status: ${projectStatus}`,
    nextTransition: "No further action",
  };
}
```

2. Verify: `npx tsc --noEmit`

### Task 1.2: Add derived states endpoint for proposals

**Files:**
- Modify: `backend/src/routes/proposals.routes.ts`

**Steps:**

1. Add a new GET endpoint `/proposals/:id/derived-state` that returns the derived Act/Wait/Watch state for the authenticated user
2. Join `proposals` with `proposal_members` to get the leader userId
3. Check the user's role and whether they've reviewed this proposal already
4. Call `deriveProposalState` and return the result

**Verify:** Run backend tests with `npx vitest run`

### Task 1.3: Add derived states endpoint for projects

**Files:**
- Modify: `backend/src/routes/projects.routes.ts`

**Steps:**

1. Add a new GET endpoint `/projects/:id/derived-state` that returns the derived Act/Wait/Watch state
2. Join with proposals to get leader userId, check MOA presence, check reporting schedule presence
3. Call `deriveProjectState` and return the result

**Verify:** Run backend tests

---

## Phase 2: Action Center Backend

### Task 2.1: Create action-center endpoint

**Files:**
- Create: `backend/src/routes/action-center.routes.ts`

**Steps:**

1. Create a new route module that aggregates actionable items for the authenticated user based on role:

```ts
import { createRoute, z } from "@hono/zod-openapi";
import { Hono } from "hono";
// ... imports

const actionCenter = new Hono();

// GET /action-center — returns prioritized actionable items
// Returns: {
//   actItems: [...],    // Items requiring user's immediate action
//   watchItems: [...],  // Items user is monitoring
//   stats: {
//     pendingReviews: number,
//     returnedProposals: number,
//     overdueReports: number,
//     expiringMoas: number,
//     projectsNeedingActivation: number,
//   }
// }
```

2. Build the queries:
   - **For RET Chair:** proposals pending their endorsement (Pending Review, not bypassed), returned proposals from their college, overdue projects in their college, upcoming report deadlines
   - **For Director:** proposals pending Director approval (Endorsed + bypassedRetChair proposals in Pending Review), projects with status "Approved" (awaiting activation), overdue projects, expiring MOAs (within 30 days)
   - **For Faculty:** their proposals with status "Returned", their projects with "Overdue" status, upcoming report deadlines for their projects
   - **For Super Admin:** pending user registrations

3. Each item includes: `id`, `type` (proposal/project/moa/report), `title`, `status`, `actionRequired`, `owner`, `derivedState`, `createdAt`, `urgency` (urgent/soon/routine)

**Verify:** Run backend tests

### Task 2.2: Register action-center routes

**Files:**
- Modify: `backend/src/app.ts`

**Steps:**

1. Import the new action-center routes
2. Mount at `/api/v1/action-center`
3. Apply JWT auth middleware

**Verify:** `npx tsc --noEmit`

---

## Phase 3: Project Readiness Backend

### Task 3.1: Create project-readiness endpoint

**Files:**
- Modify: `backend/src/routes/projects.routes.ts`

**Steps:**

1. Add GET `/projects/:id/readiness` endpoint that returns the activation readiness checklist:

```ts
// Response:
{
  isReady: boolean;
  prerequisites: [
    { name: "Proposal Approved", complete: boolean, owner: string, details: string },
    { name: "Special Orders Uploaded", complete: boolean, owner: string, details: string },
    { name: "Valid MOA Assigned", complete: boolean, owner: string, details: string },
    { name: "Reporting Schedule Established", complete: boolean, owner: string, details: string },
  ];
  blocker: string | null; // first incomplete prerequisite
}
```

2. For each prerequisite, check the actual data:
   - Proposal status must be "Approved" or later
   - All proposal members with a Special Order role must have uploaded Special Orders
   - Project must have a linked MOA where `validUntil > now()`
   - Project must have a reporting schedule with at least one due date

**Verify:** Run backend tests

### Task 3.2: Add plain-language status explanations

**Files:**
- Create: `backend/src/lib/status-descriptions.ts`

**Steps:**

1. Create a mapping of statuses to human-readable descriptions and explanations:

```ts
export const PROPOSAL_STATUS_DESCRIPTIONS: Record<string, { label: string; explanation: string; nextStep: string }> = {
  "Draft": {
    label: "Draft",
    explanation: "Your proposal is saved but not yet submitted for review.",
    nextStep: "Edit and submit when ready.",
  },
  "Pending Review": {
    label: "Awaiting Review",
    explanation: "Your proposal has been submitted and is awaiting review by the appropriate reviewer.",
    nextStep: "No action required — you will be notified when a decision is made.",
  },
  "Endorsed": {
    label: "Endorsed — Awaiting Approval",
    explanation: "Your RET Chair has endorsed your proposal and forwarded it to the Extension Services office for final approval.",
    nextStep: "No action required — waiting for Director/Admin decision.",
  },
  "Approved": {
    label: "Approved — Activation Required",
    explanation: "Your proposal has been approved! However, the project is not yet authorized for implementation. Additional requirements must be completed before the project can begin.",
    nextStep: "Wait for Director/Admin to complete activation requirements.",
  },
  "Returned": {
    label: "Revision Required",
    explanation: "Your proposal has been returned for revision. Review the feedback carefully, make the requested changes, and resubmit.",
    nextStep: "Review feedback and submit a revised proposal.",
  },
  "Rejected": {
    label: "Not Approved",
    explanation: "Your proposal was not approved. Please review the feedback for details.",
    nextStep: "No further action on this proposal.",
  },
};

export const PROJECT_STATUS_DESCRIPTIONS: Record<string, { label: string; explanation: string; nextStep: string }> = {
  "Approved": {
    label: "Approved — Awaiting Activation",
    explanation: "Your proposal is approved, but implementation cannot begin yet. Required: valid MOA, reporting schedule, and Special Orders.",
    nextStep: "Wait for Director/Admin to complete activation.",
  },
  "Ongoing": {
    label: "Active Project",
    explanation: "Your project is approved and actively implementing.",
    nextStep: "Submit reports on time per your schedule.",
  },
  "Overdue": {
    label: "Reports Overdue",
    explanation: "One or more required reports have not been submitted by their deadline.",
    nextStep: "Submit overdue report(s) immediately.",
  },
  "Expired": {
    label: "MOA Expired",
    explanation: "The Memorandum of Agreement covering this project has expired. The project cannot continue until a valid MOA is renewed.",
    nextStep: "Contact the Extension Services office.",
  },
  "Pending Closure": {
    label: "Pending Closure",
    explanation: "Final reports have been submitted. The project is awaiting final review and closure.",
    nextStep: "No action required — waiting for Director/Admin review.",
  },
  "Completed": {
    label: "Completed",
    explanation: "All reports submitted and project activities finished.",
    nextStep: "No further action required.",
  },
  "Closed": {
    label: "Closed",
    explanation: "Project has been officially closed. All institutional requirements satisfied.",
    nextStep: "No further action required.",
  },
};
```

2. Export a `getStatusDescription(status: string)` function that returns the description or a fallback

**Verify:** `npx tsc --noEmit`

---

## Phase 4: Frontend — Act/Wait/Watch & StatusBadge Enhancement

### Task 4.1: Create derived state hook

**Files:**
- Create: `frontend/src/hooks/use-derived-state.ts`

**Steps:**

1. Create a React Query hook that fetches derived state for a proposal or project:

```ts
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";

export function useProposalDerivedState(proposalId: string) {
  return useQuery({
    queryKey: ["proposal-derived-state", proposalId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/proposals/${proposalId}/derived-state`);
      if (!res.ok) throw new Error("Failed to fetch derived state");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useProjectDerivedState(projectId: string) {
  return useQuery({
    queryKey: ["project-derived-state", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/derived-state`);
      if (!res.ok) throw new Error("Failed to fetch derived state");
      return res.json();
    },
    staleTime: 30_000,
  });
}
```

**Verify:** `npx tsc --noEmit` in frontend

### Task 4.2: Enhance StatusBadge with text labels and derived states

**Files:**
- Modify: `frontend/src/components/ui/status-badge.tsx`
- Modify: `frontend/src/components/ui/derived-state-badge.tsx` (create)

**Steps:**

1. Create a new `DerivedStateBadge` component that renders the Act/Wait/Watch state with icons:

```tsx
// ACT = orange/amber, WAIT = blue, WATCH = gray
// Always include text label + icon (not color alone)
// Include aria-label for screen readers

import { AlertCircle, Clock, Eye } from "lucide-react";

interface DerivedStateBadgeProps {
  state: "ACT" | "WAIT" | "WATCH";
  owner: string;
  reason: string;
  className?: string;
}

export function DerivedStateBadge({ state, owner, reason, className }: DerivedStateBadgeProps) {
  const config = {
    ACT: { icon: AlertCircle, color: "bg-amber-100 text-amber-800 border-amber-200", label: "Action Required" },
    WAIT: { icon: Clock, color: "bg-blue-100 text-blue-800 border-blue-200", label: "Waiting" },
    WATCH: { icon: Eye, color: "bg-gray-100 text-gray-800 border-gray-200", label: "Watching" },
  };

  const { icon: Icon, color, label } = config[state];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border ${color} ${className}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}: {owner}</span>
    </span>
  );
}
```

2. Update existing `StatusBadge` to always include a text label alongside any color indicator, and add `aria-label` attribute

**Verify:** `npx tsc --noEmit` in frontend, check that `DerivedStateBadge` renders correctly

### Task 4.3: Add plain-language status descriptions to StatusBadge

**Files:**
- Create: `frontend/src/lib/status-descriptions.ts`

**Steps:**

1. Mirror the backend status descriptions for frontend use (for optimistic rendering before API call):

```ts
export const STATUS_DESCRIPTIONS: Record<string, { label: string; explanation: string }> = {
  "Pending Review": { label: "Awaiting Review", explanation: "Your proposal is pending review." },
  "Returned": { label: "Revision Required", explanation: "Please review feedback and resubmit." },
  "Endorsed": { label: "Endorsed", explanation: "Forwarded to Director/Admin for approval." },
  "Approved": { label: "Approved", explanation: "Proposal approved — activation required." },
  "Rejected": { label: "Not Approved", explanation: "Proposal was not approved." },
  // ... project statuses
};
```

2. Update `StatusBadge` to show a tooltip or `title` attribute with the explanation

**Verify:** Visual check — hover over StatusBadge should show explanation tooltip

---

## Phase 5: Frontend — Action Center

### Task 5.1: Create Action Center component

**Files:**
- Create: `frontend/src/features/action-center/action-center-card.tsx`

**Steps:**

1. Create the Action Center card component that displays prioritized items:

```tsx
// Renders a card with sections:
// - ACT (items requiring immediate action)
// - WAIT (items where user is waiting for someone else)
// - WATCH (items user is monitoring)
// Each item: title, status, project, time waiting, action link

import { AlertCircle, Clock, Eye, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

interface ActionItem {
  id: string;
  type: "proposal" | "project" | "moa" | "report";
  title: string;
  status: string;
  state: "ACT" | "WAIT" | "WATCH";
  owner: string;
  reason: string;
  urgency: "urgent" | "soon" | "routine";
  createdAt: string;
  link: string;
}

interface ActionCenterProps {
  items: ActionItem[];
}

export function ActionCenter({ items }: ActionCenterProps) {
  const actItems = items.filter(i => i.state === "ACT");
  const waitItems = items.filter(i => i.state === "WAIT");
  const watchItems = items.filter(i => i.state === "WATCH");

  // ... render sections with appropriate icons and colors
}
```

**Verify:** `npx tsc --noEmit`

### Task 5.2: Add action-center hook

**Files:**
- Create: `frontend/src/hooks/use-action-center.ts`

**Steps:**

1. Create a React Query hook:

```ts
import { useQuery } from "@tanstack/react-query";

export function useActionCenter() {
  return useQuery({
    queryKey: ["action-center"],
    queryFn: async () => {
      const res = await fetch("/api/v1/action-center");
      if (!res.ok) throw new Error("Failed to fetch action center");
      return res.json();
    },
    refetchInterval: 60_000, // refresh every minute
  });
}
```

**Verify:** `npx tsc --noEmit`

### Task 5.3: Integrate Action Center into RET Chair dashboard

**Files:**
- Modify: `frontend/src/features/ret/ret-dashboard-page.tsx`

**Steps:**

1. Import `ActionCenter` and `useActionCenter`
2. Add the Action Center as the first section of the dashboard (before metric cards)
3. Show "Needs Your Action" at the top, then "Waiting", then "Monitoring"
4. Keep existing metrics as a secondary section

**Verify:** Visual check — RET Chair dashboard shows Action Center at top

### Task 5.4: Integrate Action Center into Director dashboard

**Files:**
- Modify: `frontend/src/features/director/director-dashboard-page.tsx`

**Steps:**

1. Same approach as Task 5.3 but for the Director role
2. Add Action Center as the first section
3. Move metrics below

**Verify:** Visual check — Director dashboard shows Action Center at top

### Task 5.5: Integrate Action Center into Faculty dashboard

**Files:**
- Modify: `frontend/src/features/faculty/faculty-dashboard-page.tsx`

**Steps:**

1. Add an "Attention Required" section at the top showing:
   - Returned proposals (need revision)
   - Overdue reports
   - Upcoming deadlines
2. Keep the existing merged project list below

**Verify:** Visual check — Faculty dashboard shows attention items at top

---

## Phase 6: Frontend — Project Readiness & Workspace

### Task 6.1: Create Project Readiness component

**Files:**
- Create: `frontend/src/features/projects/project-readiness-card.tsx`

**Steps:**

1. Create a readiness checklist component:

```tsx
// Shows prerequisites with ✓/✕ icons
// Each item shows: name, status, responsible person, explanation
// At bottom: "Blocked by: [reason]" or "Ready for activation"

interface ReadinessPrerequisite {
  name: string;
  complete: boolean;
  owner: string;
  details: string;
}

interface ProjectReadinessProps {
  isReady: boolean;
  prerequisites: ReadinessPrerequisite[];
  blocker: string | null;
}
```

2. Use `Card` from shadcn, green checkmark for complete, red X for incomplete
3. Each item shows a tooltip with `details` explanation

**Verify:** `npx tsc --noEmit`

### Task 6.2: Create project readiness hook

**Files:**
- Create: `frontend/src/hooks/use-project-readiness.ts`

**Steps:**

1. React Query hook calling `GET /projects/:id/readiness`

**Verify:** `npx tsc --noEmit`

### Task 6.3: Integrate readiness into project details page

**Files:**
- Modify: `frontend/src/features/director/project-details-page.tsx`

**Steps:**

1. Import `ProjectReadiness` and `useProjectReadiness`
2. For projects with status "Approved" (awaiting activation), show the readiness card prominently at the top
3. Show a clear message: "This project is approved but not yet authorized for implementation"

**Verify:** Visual check — Approved projects show readiness checklist

### Task 6.4: Add plain-language status to project details

**Files:**
- Modify: `frontend/src/features/director/project-details-page.tsx`
- Modify: `frontend/src/features/faculty/faculty-project-hub-page.tsx`

**Steps:**

1. Below the StatusBadge, show the `explanation` and `nextStep` from `STATUS_DESCRIPTIONS`
2. Use a muted text block or info callout

**Verify:** Visual check — status explanation appears below badge

---

## Phase 7: Proposal Preparation

### Task 7.1: Backend — Add proposal requirements endpoint

**Files:**
- Modify: `backend/src/routes/proposals.routes.ts`

**Steps:**

1. Add GET `/proposals/metadata/requirements` endpoint that returns:

```ts
{
  documents: [
    { type: string; label: string; required: boolean; description: string }
  ],
  members: { required: boolean; description: string },
  sectors: { required: boolean; description: string },
  sdgs: { required: boolean; description: string },
  budget: { required: boolean; description: string },
  dates: { required: boolean; description: string }
}
```

2. For now, return a static list based on the current form fields
3. Later, these can be moved to `system_settings` for configurability

**Verify:** Run backend tests

### Task 7.2: Backend — Add proposal completeness check endpoint

**Files:**
- Modify: `backend/src/routes/proposals.routes.ts`

**Steps:**

1. Add POST `/proposals/:id/completeness` endpoint that validates:
   - At least one document uploaded
   - At least one member with "Project Leader" role
   - At least one beneficiary sector
   - At least one SDG
   - Budget values provided
   - Target start/end dates provided
   - Start date < end date

2. Return:
```ts
{
  isComplete: boolean;
  missing: string[];
  warnings: string[];
}
```

**Verify:** Run backend tests

### Task 7.3: Frontend — Add requirements checklist to proposal creation

**Files:**
- Modify: `frontend/src/features/proposals/components/create-proposal-modal.tsx`

**Steps:**

1. Add a "Requirements" step at the beginning of the proposal creation flow
2. Show the requirements checklist from `GET /proposals/metadata/requirements`
3. Add a "Check Completeness" button that calls `POST /proposals/:id/completeness`
4. Show missing items as errors, warnings as info
5. Only enable submit when complete

**Verify:** Visual check — proposal creation shows requirements checklist

### Task 7.4: Frontend — Add draft save button

**Files:**
- Modify: `frontend/src/features/proposals/components/create-proposal-modal.tsx`

**Steps:**

1. Add a "Save as Draft" button alongside the submit button
2. When clicked, POST to `/proposals` with status "Draft" explicitly
3. Show a toast: "Draft saved — you can continue editing later"
4. Add a "Submit for Review" button that calls `POST /proposals/:id/submit`

**Verify:** Visual check — draft save works and shows confirmation

---

## Phase 8: Reporting Schedule Visibility

### Task 8.1: Backend — Add reporting schedule endpoint

**Files:**
- Modify: `backend/src/routes/reports.routes.ts`

**Steps:**

1. Add GET `/projects/:id/reporting-schedule` endpoint that returns:

```ts
{
  schedule: {
    frequency: string;
    dueDates: [
      {
        id: string;
        date: string;
        isCompleted: boolean;
        completedAt: string | null;
        reportType: string;
        reportId: string | null;
      }
    ];
  };
  upcoming: [/* due dates where isCompleted = false, sorted by date */];
  overdue: [/* due dates where reportingDate < now AND isCompleted = false */];
}
```

2. Join `project_reporting_schedules` → `project_reporting_dates` → `project_reports`

**Verify:** Run backend tests

### Task 8.2: Frontend — Add reporting schedule to project workspace

**Files:**
- Create: `frontend/src/features/projects/reporting-schedule-card.tsx`

**Steps:**

1. Create a component that shows upcoming and overdue report obligations:
   - Overdue reports highlighted in red/amber
   - Upcoming reports with due dates and report type
   - Completed reports with checkmark
   - Link to submit report for each upcoming item

**Verify:** `npx tsc --noEmit`

### Task 8.3: Integrate schedule into project details

**Files:**
- Modify: `frontend/src/features/director/project-details-page.tsx`
- Modify: `frontend/src/features/faculty/faculty-project-hub-page.tsx` (for the individual project view)

**Steps:**

1. For Ongoing/Overdue projects, show the reporting schedule component
2. Show overdue reports prominently at the top

**Verify:** Visual check — ongoing projects show reporting schedule

---

## Phase 9: Accessibility Enhancements

### Task 9.1: Add aria-labels to all status elements

**Files:**
- Modify: `frontend/src/components/ui/status-badge.tsx`

**Steps:**

1. Add `aria-label` attribute to StatusBadge that includes the plain-language status description
2. Add `role="status"` to the badge element
3. Ensure all color indicators are accompanied by text labels (icons or text)

**Verify:** Run `npx axe` or manual screen reader check

### Task 9.2: Ensure keyboard navigability

**Files:**
- Audit: All interactive elements in dashboard pages

**Steps:**

1. Verify all buttons, links, and dropdowns are keyboard accessible
2. Add `tabIndex={0}` and `onKeyDown` handlers where needed
3. Add focus indicators to all interactive elements

**Verify:** Tab through all dashboard pages — ensure all elements are reachable

### Task 9.3: Add plain-language tooltips to all status badges

**Files:**
- Modify: `frontend/src/components/ui/status-badge.tsx`

**Steps:**

1. Wrap the StatusBadge in a `Tooltip` component
2. Show the `explanation` text on hover
3. Ensure tooltip is also accessible to screen readers via `aria-describedby`

**Verify:** Visual check — tooltip appears on hover

---

## Phase 10: Testing & Polish

### Task 10.1: Backend test coverage

**Steps:**

1. Run `npx vitest run` — ensure all tests pass
2. Add tests for `derived-states.ts`:
   - Test all proposal statuses for each role
   - Test all project statuses for each role
3. Add tests for action-center endpoint
4. Add tests for project-readiness endpoint
5. Add tests for reporting-schedule endpoint

### Task 10.2: Frontend test coverage

**Steps:**

1. Run `npx vitest run` in frontend — ensure all tests pass
2. Add unit tests for `DerivedStateBadge`
3. Add unit tests for `ActionCenter`
4. Add unit tests for `ProjectReadiness`

### Task 10.3: Lint and type check

**Steps:**

1. Run `npx biome check .` in both backend and frontend
2. Fix any lint errors
3. Run `npx tsc --noEmit` in both packages

### Task 10.4: Manual E2E verification

**Steps:**

1. Login as Faculty → Create proposal → Verify requirements checklist appears
2. Submit proposal → Verify Act/Wait/Watch status shows "Waiting: RET Chair"
3. Login as RET Chair → Verify Action Center shows pending proposals at top
4. Endorse proposal → Verify Director sees "Act: You" in Action Center
5. Approve proposal → Verify Faculty sees "Approved — Activation Required" with readiness checklist
6. Director activates project → Verify project shows "Ongoing" with reporting schedule
7. Wait for overdue → Verify "Overdue" status shows with Act state
8. Submit report → Verify "Overdue" clears, status returns to "Ongoing"

### Task 10.5: Commit and push

**Steps:**

1. `git add -A`
2. `git commit -m "feat: UX research-driven improvements — Act/Wait/Watch, Action Center, Project Readiness, proposal preparation, reporting schedule, accessibility"`
3. `git push origin main`
