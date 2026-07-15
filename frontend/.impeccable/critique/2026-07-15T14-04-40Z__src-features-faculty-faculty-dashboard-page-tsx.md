---
target: frontend/src/features/faculty/faculty-dashboard-page.tsx
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-07-15T14-04-40Z
slug: src-features-faculty-faculty-dashboard-page-tsx
---
Method: dual-agent (A: ses_099ec5211ffeSHVy6TN4AGBDED · B: ses_099ec4f28ffeUx46zOQcTPy2Jk)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Loading is covered, but failed portfolio queries appear as an empty portfolio. |
| 2 | Match System / Real World | 3 | Domain language is strong, but metric labels do not always match their meaning. |
| 3 | User Control and Freedom | 2 | The page offers no sorting, filtering, grouping, or scalable portfolio controls. |
| 4 | Consistency and Standards | 3 | Shared components are coherent, but metric definitions diverge. |
| 5 | Error Prevention | 2 | Name-based ownership permits preventable classification errors. |
| 6 | Recognition Rather Than Recall | 3 | Status, dates, and roles are visible; item type and next step remain implicit. |
| 7 | Flexibility and Efficiency | 1 | No search, sort, filters, shortcuts, or pagination for recurring use. |
| 8 | Aesthetic and Minimalist Design | 3 | Calm and restrained, but generic KPIs and repeated cards weaken focus. |
| 9 | Error Recovery | 2 | Action Center has retry; the dashboard's core data and invalid dates do not. |
| 10 | Help and Documentation | 2 | Status explanations help, but counts and workflow implications are undefined. |
| **Total** | | **23/40** | **Acceptable: significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment:** The dashboard avoids gradient text, glassmorphism, display-font labels, ornamental motion, and loud color. Its remaining AI-slop signal is structural: greeting plus CTA, three interchangeable KPI cards, then repeated record cards. This conflicts with the project's explicit rejection of generic SaaS dashboards and decorative metrics.

**Deterministic scan:** `detect.mjs` returned exit code 0 and `[]`: zero findings, rules, severities, or locations. This is useful evidence that the target avoids detector-recognizable syntax problems, but it does not invalidate semantic and workflow issues such as ambiguous counts, false empty states, or weak information architecture.

**Visual overlays:** Browser automation is not exposed in this session. No browser inspection or reliable user-visible overlay was available; visual conclusions are source-based.

## Overall Impression

The dashboard has a coherent, calm visual foundation and an unusually product-aligned Action Center. Its biggest opportunity is to stop behaving like a summary dashboard and become a trustworthy faculty work queue: every row should identify its type, deadline, ownership, status, and next action.

## What's Working

- The Action Center separates required action, waiting, and monitoring, directly supporting the product principle that the next step must be unmistakable.
- Shared typography, semantic colors, subtle borders, status icons, dark-mode tokens, and reduced-motion handling form a restrained and consistent visual system.
- Skeletons, an instructive empty state, visible primary action, and status explanations provide a solid baseline for state communication.

## Priority Issues

### P1: Query failures masquerade as “no work”

**Why it matters:** The component reads loading state but not error state. Failed requests fall back to empty arrays and present “No proposals or projects yet,” creating false reassurance in a deadline-driven institutional workflow.

**Fix:** Combine query errors into a dedicated recovery state with plain-language context and retry actions. Render true emptiness only after successful responses.

**Reference:** `src/features/faculty/faculty-dashboard-page.tsx:26-43`, `:173-181`

**Suggested command:** `/impeccable harden src/features/faculty/faculty-dashboard-page.tsx`

### P1: Ownership is inferred from display names

**Why it matters:** Comparing concatenated names can mislabel duplicate names, reformatted names, or renamed users as leader/member. Ownership is a trust-critical state, not presentational metadata.

**Fix:** Compare stable user IDs supplied by the API. If the required identifier is absent, extend the data contract rather than guessing from names.

**Reference:** `src/features/faculty/faculty-dashboard-page.tsx:45-53`, `:71-75`, `:198-214`

**Suggested command:** `/impeccable harden src/features/faculty/faculty-dashboard-page.tsx`

### P1: The portfolio does not expose the next required action

**Why it matters:** Projects and proposals are merged without a heading, type, deadline priority, next action, grouping, sorting, filtering, or pagination. Up to 100 identical records become a scanning burden and the silent cap can make the portfolio incomplete.

**Fix:** Replace the undifferentiated card stream with a compact workflow list. Show type, status, ownership, nearest deadline, and next action; sort urgent work first and provide search/filter/pagination when volume requires it.

**Reference:** `src/features/faculty/faculty-dashboard-page.tsx:26-38`, `:47-98`, `:153-225`

**Suggested command:** `/impeccable layout src/features/faculty/faculty-dashboard-page.tsx`

### P2: Generic metrics and narrow-screen row structure dilute focus

**Why it matters:** “My Total Submission” and “Proposals Submitted” overlap conceptually, while fixed opposing row groups can collide with long titles, statuses, localization, or zoom. This is the page's clearest generic-SaaS tell.

**Fix:** Keep only metrics that change a faculty decision, rename them precisely, and make rows wrap structurally on narrow screens. Give titles truncation/line-clamp behavior and keep status/action targets accessible.

**Reference:** `src/features/faculty/faculty-dashboard-page.tsx:135-151`, `:184-222`

**Suggested command:** `/impeccable distill src/features/faculty/faculty-dashboard-page.tsx`

## Persona Red Flags

**Alex, recurring power user:** No search, sorting, filtering, grouping, pagination, or keyboard accelerator supports a growing portfolio. Repeated card scanning and a silent 100-record cap make routine use progressively slower.

**Sam, keyboard/low-vision user:** The small `text-xs` inline record action has a weak touch target; fixed opposing row groups risk collisions under zoom; core data failures are not announced as errors. Status badge labeling is a strength but still needs rendered keyboard verification.

**NEUST faculty member:** The page emphasizes counts while omitting the nearest deadline and next required step from each record. False empty states and fragile ownership directly threaten accurate, on-time completion.

## Minor Observations

- “My Total Submission” is grammatically awkward and lacks a precise definition.
- “Proposals Submitted” appears to count every non-project proposal, potentially including drafts.
- “Invalid Date” is implementation-oriented copy; “Date unavailable” is calmer and actionable when paired with recovery guidance.
- The record list needs a visible heading to preserve page structure for scanning and assistive technology.
- Project and proposal rows are visually indistinguishable except for their link copy.
- Four fixed skeleton cards imply arbitrary content volume rather than mirroring the final list structure.

## Questions to Consider

- If the dashboard exists to help faculty finish work on time, why are raw counts more prominent than the nearest deadline or blocked requirement?
- What decision is “My Total Submission” intended to help a faculty member make?
- Should approved proposals remain visible as proposal history after they become projects?
- Would one compact, sortable workflow list communicate type, status, owner, deadline, and next action better than three metrics plus repeated cards?
