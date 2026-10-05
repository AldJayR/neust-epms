# Extension Analytics: Trainee Reach, Faculty Participation, and Coverage

**Status:** Implemented on `feat/extension-analytics`; tests and production-build verification are deferred at the user's request.
**Date:** 2026-10-01
**Scope update:** Post-closure trainee corrections were removed by `2026-10-05-extension-analytics-simplification.md`. Analytics is read-only; historical missing counts remain unknown.
**Goal:** Turn existing extension records and manually entered terminal-report trainee counts into reliable, role-scoped institutional reports.
**Stack:** Hono/OpenAPI, Drizzle/PostgreSQL, React, TanStack Router/Query, existing UI components and charts.

## 1. Product direction and working decisions

- Deliver all three connected modules in value-first order:
  1. Trainee Reach Reports (the initial scope of Module 7).
  2. Faculty Participation (Module 6; actual capacity measurement is a later extension).
  3. Program, SDG, and Beneficiary Coverage Explorer (Module 5).
- Enter the number of trainees manually during unified Accomplishment and Terminal Report submission.
- Official trainee totals include only projects whose closure has been approved by the Director (`Closed`).
- Determine the department and campus through the report's project and proposal, rather than asking the submitter to select them.
- Initially attribute the entire trainee count to the project's lead department and originating campus.
- Count each project once in official totals.
- Preserve existing PDF evidence: primary terminal report and Evaluation Forms are required; Attendance Records remain optional.
- Run development checks one command at a time on the user's slow machine. Use focused verification, then broaden only as needed.

### Delivery priorities and user value

| Priority | Module | Primary value | Primary users |
| --- | --- | --- | --- |
| 1 | Trainee Reach | Replace manual consolidation with approved department/campus trainee totals, traceable to terminal reports. | Director and RET Chair; Faculty supply results through guided submission. |
| 2 | Faculty Participation | Support unit coordination with leadership/collaboration counts and contribution histories, extending the existing directory. | RET Chair and Director; Faculty see personal contributions. |
| 3 | Coverage Explorer | Support planning with program/sector coverage, institutional comparisons, and additional SDG/service breakdowns. | Director and RET Chair. |

- Deliver trustworthy totals, evidence/project drill-down, missing-data visibility, and filtered exports before spending effort on additional visualizations.
- Implement Trainee Reach end to end: Faculty records results -> Director approves closure -> RET Chair/Director generates reports.
- Reuse existing directory and reporting components for Faculty Participation. Do not create a competing faculty directory.
- Coverage is descriptive until NEUST defines targets or community needs. Low activity must not automatically be labelled poor performance or an underserved sector.
- After each module, validate representative role-based tasks before proceeding. These are staged releases within the selected three-module scope.

## 2. First-version boundaries

### Included

- Required trainee count for new unified terminal reports.
- Reliable completion and retry of a terminal-report package.
- Director closure review showing the entered count and evidence.
- Campus/department trainee summaries and project drill-down.
- Faculty leadership/collaboration counts, current involvement, recorded participation, and project drill-down.
- Coverage breakdowns using existing banner programs, beneficiary sectors, SDGs, and extension-service classifications.
- Consistent filters, explicit metric definitions, missing-data indicators, and CSV export.

### Later extensions

- Individual beneficiary registration or university-wide unique-person deduplication.
- Actual trainee counts split by beneficiary sector or SDG.
- Activity/session-level participation and faculty assignments.
- Service hours, planned capacity, and workload weighting.
- Evaluation scores, learning assessments, and follow-up outcome indicators.
- Historical faculty eligibility snapshots and membership history where accurate historical participation rates are required.
- Actual expenditures and cost-per-beneficiary calculations.

These later extensions must not be inferred from PDFs, project membership, or the single trainee count.

## 3. Current implementation and dependencies

Relevant existing paths:

- `frontend/src/features/reports/components/submit-report-modal.tsx`
- `frontend/src/features/reports/functions.ts`
- `frontend/src/features/reports/components/report-columns.tsx`
- `frontend/src/types/report.ts`
- `backend/src/modules/reports/reports.schema.ts`
- `backend/src/modules/reports/reports.service.ts`
- `backend/src/modules/projects/projects.service.ts`
- `backend/src/modules/director/director.service.ts`
- `backend/src/db/schema/project-reports.ts`
- `backend/src/db/schema/project-reporting-milestones.ts`
- `backend/src/db/schema/proposals.ts`
- `backend/src/db/schema/proposal-members.ts`
- `backend/src/lib/scope-helpers.ts`
- `frontend/src/components/role-sidebar.tsx`
- `frontend/src/components/layout/app-sidebar.tsx`

The current terminal form creates a report draft, uploads its main PDF, then uploads Evaluation Forms and optional Attendance Records. The backend currently completes the closure milestone and sets Pending Closure after the main PDF alone. A failed attachment upload can therefore leave an incomplete package in a misleading state, and retrying the entire form can encounter an already-submitted document.

The first fix batch already separated report creation and submission timestamps and corrected several report/dashboard counts. Implementation must still inspect the current branch and schema before adding another migration.

Use the existing DFD as system context. Do not modify `docs/final-dfd.md` or other DFD documents as part of this implementation.

## 4. Shared metric definitions

| Metric | Definition |
| --- | --- |
| Reported trainees | People reported as trained by an individual project, counted once within that project, even across multiple sessions. |
| Official trainee total | Sum of recorded trainee counts from one eligible terminal result per Director-approved Closed project. |
| Project-reported reach | Label for summed trainee counts; this is not a university-wide unique-person count. |
| Missing trainee count | Eligible project without a recorded count; `NULL`, not zero. |
| Zero trainees | An explicitly entered and approved count of `0`. |
| Reporting completeness | Projects with a recorded count divided by eligible Closed projects in the same scope and period. |
| Program/SDG coverage | Distinct projects assigned to the classification, with statuses shown separately. |
| Beneficiary-sector coverage | Projects intended to serve a sector; not actual trainees in that sector. |
| Faculty involvement | Distinct projects where the faculty user has a recorded leadership or collaboration membership. |
| Current load | Current active project involvement counts, separated into leadership and collaboration; not hours or performance. |
| Current participation rate | Eligible active Faculty/RET Chair accounts with qualifying involvement divided by eligible active Faculty/RET Chair accounts in the same unit. |

Additional rules:

- A person participating in multiple projects can contribute to multiple project counts. Explain this beside official totals and exports.
- Do not duplicate trainee totals across collaborating departments. Offer collaboration project counts separately.
- Multi-SDG/sector/service projects appear in each tagged category, but category rows are overlapping and must not be summed into an institutional total.
- Joining SDGs, members, departments, or beneficiaries must not multiply report counts or trainee sums. Aggregate at project grain before classification joins.
- A trainee total grouped by SDG means reach of projects aligned with that SDG, not trainees uniquely attributable to it.
- Planned NEUST and partner budgets are planned funding, not actual spending.
- Where a rate has no eligible denominator, display Not applicable rather than a fabricated 0% or 100%.
- V1 operational views exclude archived records. Display that definition; historical retention behavior needs a separate design before promising permanent institutional totals.

## 5. Dates, filters, and attribution

- Use campus and department IDs in requests; display existing campus names and department codes/names.
- Use stable IDs for banner programs and classifications. Put legacy unlinked program text in a clearly labelled Unclassified/Legacy category rather than inventing a mapping.
- Treat missing classification as Unclassified; do not silently drop the project.
- Official trainee reporting periods use Director closure date (`projects.actualEndDate` in the current closure path). Label this as Closure Period, not Training Period.
- Closed projects without a usable closure date appear in missing-date diagnostics and do not enter a dated cohort automatically.
- Portfolio intake periods use proposal creation date and are labelled accordingly. Do not call this submission date.
- Faculty current-load metrics are an as-of-now snapshot. Period-based contribution views must state whether they use project intake or closure cohorts.
- A shared filter bar may reuse campus/department/program selectors, but each view must show its date basis. Changing the period must not imply that current load is a historical snapshot.
- Use a documented business timezone and half-open date ranges; agree the reporting calendar before adding academic-year presets. Default proposal: Asia/Manila and calendar-year presets.
- Attribute projects to proposal units, not a faculty user's current unit. Changes to unit assignments after activation/closure need an explicit historical attribution policy before allowing such edits.

## 6. Access and navigation

| Role | Coverage | Faculty participation | Trainee reach |
| --- | --- | --- | --- |
| Director | Institutional view | Institutional directory/summary | Official institutional totals and drill-down |
| RET Chair | Authorized department at main campus, otherwise authorized campus | Same unit scope | Official unit totals and drill-down |
| Faculty | Personal project contribution summary | Personal leadership/collaboration view | Counts from their authorized project memberships |
| Super Admin | No new operational analytics access by default | No new operational analytics access by default | No new operational analytics access by default |

- Enforce authorization in backend queries and exports. UI guards are additional navigation behavior.
- Faculty membership restrictions must be explicit; broad campus/department scope helpers alone do not establish personal access.
- RET Chair filter values must intersect with authorized scope; arbitrary campus/department IDs cannot expand access.
- Extend the Dashboard sidebar item with a collapsible Analytics submenu. Keep the Dashboard link directly accessible and expand the submenu automatically when an analytics view is active.
- Director and RET Chair: Dashboard -> Analytics opens Trainee Reach, Faculty Participation, and Coverage views, each with a bookmarkable route.
- Director filters span the institution; RET Chair views clearly display and enforce their assigned unit scope.
- Faculty: Dashboard -> Analytics opens the My Contributions page with personal leadership/collaboration history and approved reach of involved projects. Keep classification details within their project records, rather than offering institutional coverage or peer comparisons.
- Trainee entry remains part of authorized terminal submission, not a separate analytics encoding page.
- Reuse the existing faculty directory for participation drill-down instead of building a second directory.

## 7. Database and terminal-report workflow

### 7.1 Minimal schema changes

- Add nullable integer `trainee_count` to `project_reports`.
- Add a database check: null or non-negative integer; reject count values outside PostgreSQL integer range through API validation.
- Add `package_completed_at` (nullable timestamp) to record when the required terminal package is complete. Keep `submitted_at` as primary-document submission time.
- Extend report responses/frontend types with trainee count and package completion state.
- Add only indexes justified by the final queries; review query plans before adding broad analytics indexes.
- Keep legacy report values null. Never backfill trainee counts from remarks or use `0` as a substitute for unknown.
- Generate and review a migration and Drizzle snapshot. Apply against a disposable test database first; application/shared database migration execution is a separate explicit action.

### 7.2 Validation and submission

1. Show Number of trainees only for unified terminal submission, with its within-project counting definition.
2. Require a whole number >= 0 for new submissions; preserve explicit zero without treating it as an empty field.
3. Validate the field in the frontend server function and backend schema/service. Reject a trainee count on a progress report.
4. Persist the count in the report draft before uploading files.
5. Retain/resume the draft ID and query existing package status on reopening. Do not recreate the report or re-upload completed parts after a partial failure.
6. Permit the authorized draft owner to correct the count while the package is incomplete. Audit changes with old/new values.
7. Make retrying already-successful attachment stages idempotent. Keep protected filenames, hashes, scope checks, and object cleanup on failed persistence.

### 7.3 Package finalization and closure

- Implement one shared backend finalization helper called after either a primary document or required attachment is persisted.
- Lock the parent project/report consistently within a transaction; inspect the final required-evidence state.
- Require the main unified terminal document, Evaluation Forms, and a recorded count for new packages.
- Attendance Records remain optional and do not delay finalization.
- Only after the required package is complete: set `package_completed_at`, complete the closure milestone, and transition the project to Pending Closure.
- Notify the Director of a complete terminal package once. Primary-document upload alone must not signal readiness.
- Revalidate package completeness and count at Director closure approval, not only in the browser.
- Only approved Closed projects enter official trainee totals. Pending Closure counts may appear in a separately labelled review queue, never mixed into the official total.
- Do not allow ordinary post-approval editing of official counts.

### 7.4 Legacy compatibility

- Preserve supported legacy Terminal + Final Accomplishment closure behavior through an explicitly tested compatibility path.
- Existing pending/closed records with no trainee count remain visibly missing and are not assigned fabricated values.
- Use one designated terminal result per project. Legacy report pairs use Terminal as the count-bearing result; never sum both documents.
- Preserve original closure dates and historical unknown counts. Closed reports are read-only.
- Show legacy missing-count projects in completeness metrics even when their original closure was valid.

## 8. Shared analytics implementation

Create a proposed `backend/src/modules/analytics/` module with route contracts, scope policy, service queries, and serializers. Mount it through the existing API route registration. Reuse domain rules rather than copying count logic into every dashboard.

Proposed endpoints (final names to follow repository conventions):

- `GET /analytics/trainee-reach`: official headline totals, completeness, campus/department breakdowns.
- `GET /analytics/trainee-reach/projects`: paginated contributing/missing-count project drill-down.
- `GET /analytics/coverage`: portfolio metrics and classification breakdowns.
- `GET /analytics/coverage/projects`: paginated category drill-down.
- `GET /analytics/faculty-participation`: current participation/load and period-labelled contribution summaries.
- `GET /analytics/faculty-participation/faculty`: paginated faculty involvement drill-down; reuse directory queries where feasible.
- Export endpoints for the three views, using the same filters and authorized query definitions.

Extend the reports/project APIs with an authorized package-status lookup for retries. Existing create/upload/closure endpoints retain their domain responsibilities; analytics endpoints are read-only.

Query requirements:

- Build a one-row-per-project official-reach base with explicit legacy/unified report precedence.
- Include missing eligible projects through left joins so completeness is measurable.
- Scope and filter before calculating totals. Export/detail/headline queries must agree.
- Count distinct faculty/project pairs; do not sum repeated joins as separate involvements.
- Retrieve contributor details with server pagination and stable sort ordering.
- Include applied filters, date basis, generated-at time, and missing-data counts in responses/exports.
- Begin with direct database aggregates. Introduce caching/materialized summaries only after measured query performance justifies them.

## 9. Frontend views

Create a proposed `frontend/src/features/analytics/` feature with typed server functions, response validation, query factories, filter helpers, and domain pages. Add authenticated routes under a proposed `_authenticated/analytics/` directory; regenerate routes through normal tooling.

### Trainee Reach

- Headline cards: Reported Trainees, Closed Projects with Counts, Projects Missing Counts, Reporting Completeness.
- Campus summary with department drill-down and an accessible comparison chart.
- Project table: title, campus, lead department, closure date, approved trainee count, report link.
- Missing counts display Not recorded; explicit zero displays 0.
- Scope/period filters and CSV export.
- Follow Summary -> unit breakdown -> contributing project -> terminal-report evidence. Every total has an explanation and drill-down path.
- Show read-only campus/lead-department attribution in terminal submission, and show the count/evidence in Director closure review.
- Successful complete submission says Awaiting Director closure approval; it is not yet an official institutional result.

### Faculty Participation

- Extend the existing faculty directory with leadership/collaboration filters, current involvement totals, and current participation metrics.
- Show contribution drill-down and unit collaboration project counts.
- Add personal faculty contribution view using user IDs, not name matching.
- Move totals to backend aggregates rather than counting the first 100 rows in browser lists.
- Do not label project counts as capacity hours, performance, or trainee counts personally delivered by each faculty member.
- Do not present current account/membership data as a historical eligible-population snapshot.
- Prioritize leadership versus collaboration, faculty with/without current involvement, unit participation, and project drill-down.
- Personal trainee figures are labelled Reach of involved projects; do not sum those figures across faculty to obtain institutional totals.
- Current involvement and period-based contribution history are separate sections with explicit date definitions.

### Coverage Explorer

- Headline metrics separated into proposals, activated projects, and closed projects.
- Prioritize banner-program and beneficiary-sector project counts with campus/department comparisons and drill-down.
- Offer SDG and extension-service groupings as additional breakdowns using the same layout.
- Use a Group by selector instead of nested sets of navigation tabs.
- Optional planned-budget breakdown, labelled Planned Funding; it follows the core count/drill-down/export deliverables.
- Official reach shown only where the underlying projects have recorded approved counts, with completeness indicators and a closure-period basis.
- Overlapping categories visibly labelled; beneficiary-sector views remain intended coverage unless sector-level actual counts are added later.
- Unclassified/legacy records remain visible. Avoid gap or target-achievement claims until institutional targets are defined.

### Shared frontend presentation

- Use the existing PageHeader, MetricCard, PageCard, DataTablePage, and filter controls; retain the current token-based styling.
- Write user-facing descriptions around required actions and outcomes. Keep implementation terms such as backend validation out of confirmations, help text, and status messages.
- Structure each view as title/scope + export action, view navigation, filters, summary cards, detailed table, and a supporting comparison chart.
- Persist filters and drill-down state in the URL, reset pagination on filter changes, and clear incompatible department selections when campus changes.
- Export the full authorized filtered result, not only the visible page.
- Director sees institutional analytics; RET Chair sees actionable unit summaries; Faculty sees guided reporting and personal contributions.

All views need distinct loading, empty, error, and partial/missing-data states; keyboard-accessible controls; filter state in the URL; consistent number formatting; and an accessible table alternative to charts.

## 10. Phased delivery and acceptance criteria

### Phase 1: Terminal results foundation

**Dependencies:** None beyond the existing report/closure workflow.
**Files:** Existing report schema/service, database schema/migration, report form/functions/types, project closure service and review UI.

Acceptance:
- A new unified terminal report cannot complete without a valid trainee count and required PDFs.
- 0 is valid, while blank, negative, fractional, and out-of-range values fail validation.
- Failure of Evaluation Forms upload leaves the package incomplete and resumable.
- Primary PDF upload alone does not complete the closure milestone.
- Director review sees the count before approving closure.
- Concurrent retries do not create duplicate completion events or notifications.
- Legacy closure packages remain compatible, with missing counts explicit.

### Phase 2: Official Trainee Reach

**Dependencies:** Phase 1.
**Files:** New analytics backend/feature/routes, navigation, shared query/filter/export helpers.

Acceptance:
- Pending Closure projects are excluded from official totals.
- Department sums reconcile to campus totals and the institutional total under lead-unit attribution.
- A multi-department/multi-SDG project contributes its trainee count once to institutional totals.
- Missing counts lower completeness without being converted to zero.
- Analytics does not allow editing approved trainee counts.
- Export and drill-down match the active scope, filters, and headline totals.

### Phase 3: Faculty Participation

**Dependencies:** Shared scope/filter/aggregate foundation delivered in Phase 2.
**Files:** Existing director/faculty-directory queries and frontend faculty pages plus analytics participation contracts.

Acceptance:
- Backend metrics remain correct beyond 100 projects/faculty.
- Membership/user IDs establish identity; duplicate names cannot affect contribution attribution.
- Leadership and collaboration totals count distinct faculty/project pairs.
- Current involvement excludes archived records and uses one agreed active-status definition.
- Historical contribution cohorts include completed projects as appropriate without claiming historical population rates.
- Personal faculty queries cannot expose another faculty user's private contribution details.
- Unit summaries and personal contribution exports agree with the same underlying project drill-down.
- Validate with a RET Chair organizing project involvement and a Faculty member reviewing personal contributions.

### Phase 4: Coverage Explorer

**Dependencies:** Shared analytics foundation; reach panels reuse Phase 2 and participation links reuse Phase 3.
**Files:** Analytics coverage service/contracts/UI plus existing classifications and proposal junctions.

Acceptance:
- Classification counts use distinct projects and identify overlapping categories.
- Proposals and implemented/closed projects are not mixed under a delivered-service label.
- Missing/legacy classification is visible.
- Beneficiary-sector tags do not imply actual trainees per sector.
- Campus/department/program filters, exports, and drill-down remain consistent.
- Director and RET Chair can identify portfolio distribution and inspect the projects behind a category without unsupported performance/gap claims.

### Phase 5: Integration and documentation

- Reconcile navigation, legends, metric definitions, and CSV columns across modules.
- Update relevant reporting and implementation documentation; leave all DFD documents unchanged.
- Review actual query performance with representative data.
- Document migration/deployment order and legacy missing-count handling.
- Run a manual role-based walkthrough: submission -> attachment retry -> Director review -> closure -> official reach -> faculty contributions -> coverage drill-down.

## 11. Verification approach

Use focused regression checks after implementation; no test-first workflow is required.

- Pure validation/metric tests: explicit zero, null, report aliases, overlapping classifications, date boundaries.
- Route tests: role gates, count validation, resumable package workflow, and absence of post-closure correction endpoints.
- Real PostgreSQL integration checks: constraints, multi-join sums, legacy/unified precedence, transaction/concurrency behavior, and migrations.
- Frontend helper/form checks: trainee validation, retry state, URL filters, number formatting, and missing-data display.
- Task-based usability checks: Faculty resumes a failed upload; Director verifies a campus total against a project report; RET Chair finds missing counts and the next responsible actor; all exports match selected filters.
- Check interpretation as well as task completion: approval state, missing versus zero, closure period, overlapping categories, and project-associated versus personally delivered reach.
- API/frontend contract checks: nullable legacy count and package state.
- Serial backend/frontend typechecks and focused tests; build checks at a suitable phase boundary.
- Frontend Vitest currently has a Vite/Cloudflare startup failure (`depsOptimizer is required in dev mode`). Resolve or isolate the test configuration before treating frontend tests as a passing verification layer.
- Never use the application's shared/remote database for integration tests. Record actual executed checks and any blockers.

## 12. Planning assumptions to confirm during implementation

- Trainees means people trained, counted once per project; it is distinct from attendance instances and trainers/facilitators.
- Lead department/campus receive official project reach; collaborating units receive collaboration recognition rather than duplicated reach.
- Official reach uses closure date, not activity date.
- Calendar-year/Asia-Manila presets are proposed until an academic-year reporting calendar is specified.
- New unified terminal counts are required; legacy missing counts remain visible as unknown.
- A formal capacity or outcome-measurement module is a later enhancement, after the first three reporting views are useful and trusted.
