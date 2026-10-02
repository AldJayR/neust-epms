# Extension Analytics and Terminal Reporting

## Navigation and access

Open **Dashboard -> Analytics** in the sidebar.

- **Director:** Trainee Reach, Faculty Participation, and Coverage across the institution.
- **RET Chair:** the same views, restricted to the assigned department at a main campus or the assigned campus elsewhere.
- **Faculty:** My Contributions, restricted to projects where they have recorded membership.
- **Super Admin:** administrative navigation; no operational analytics access.

Filters and drill-down selections are saved in the URL. Exports include the complete filtered result, not just the current table page.

## Terminal-report workflow

1. An authorized project member opens the terminal reporting milestone.
2. They enter the number of trainees, add optional remarks, and select the terminal report and Evaluation Forms PDFs. Attendance Records are optional.
3. The count and remarks are saved before the documents are uploaded. Successful uploads remain available if a later upload fails.
4. Reopening the form retrieves saved progress. Resume Submission uploads only the remaining required files.
5. The reporting milestone is completed only when the unified terminal document, Evaluation Forms, and trainee count are present. The project becomes Pending Closure, and the Director receives a review notification.
6. The Director reviews the count and evidence in Project Results and approves closure.
7. The project becomes Closed, and its recorded count enters official trainee reporting.

Optional attendance upload does not determine completion of the required submission. If it fails after the required documents are complete, the form explains that the terminal report is submitted and allows another attempt at the attendance upload. Attachments cannot be changed after closure.

For a completed terminal milestone, **View submission** lets an authorized submitter add the optional attendance file while the project is still awaiting closure. Project Results provides direct links to the terminal report, evaluation forms, and attendance records that are on file.

### Trainee counting

- Enter a whole number from 0 through 2,147,483,647.
- Count each person once within the project, including people who attended multiple sessions.
- `0` means no trainees were served; it is not a substitute for an unknown count.
- A person can participate in multiple projects. Institutional totals are project-reported trainees, not deduplicated university-wide individuals.
- Progress reports do not capture trainee counts.

### Historical reports and corrections

Legacy Terminal + Final Accomplishment submissions remain supported. Their documents must belong to the same reporting milestone.

Migration 0009 leaves historical trainee counts unknown. Existing complete unified submissions are recognized from their required evidence. Incomplete, active unified submissions previously marked complete are restored to a resumable state.

For a Closed project, the Director can choose **Update trainee count** from analytics, enter the count and a reason, and save the correction. The original count and reason remain in the activity history. The closure date is preserved. Only the designated terminal result is used: unified terminal report first, otherwise the legacy Terminal report.

## Reporting views

### Trainee Reach

- Includes only Director-approved Closed projects.
- The year filter uses closure date in Philippine time, with inclusive start and exclusive end boundaries.
- Attributes each project once to its lead department and originating campus.
- Shows recorded trainees, projects with counts, missing counts, and reporting completeness.
- Campus and department breakdowns link to contributing projects and their report documents.
- Missing historical counts display Not recorded; recorded zero displays 0.
- Closed projects without a closure date are identified separately and excluded from dated totals.

### Faculty Participation and My Contributions

- Current involvement includes Approved, Ongoing, Overdue, and Pending Closure projects.
- Unit participation rates use active Faculty and RET Chair accounts in the selected scope as the denominator. They do not represent every person employed by the university.
- Leadership and collaboration use membership roles and user IDs, never names.
- Current involvement is independent of the project-history year filter.
- Project history is grouped by proposal creation year. It is not a historical population or workload snapshot.
- Personal reach describes the reach of involved projects, not trainees personally trained by each faculty member.

### Coverage

- Uses proposal creation year, labelled separately from closure-based trainee reporting.
- Offers banner-program, beneficiary-sector, SDG, and extension-service breakdowns.
- Counts distinct projects/proposals; keeps proposed activity separate from projects that started implementation.
- Multi-tagged projects can appear in multiple categories. Do not sum category rows to derive an institutional total.
- Beneficiary-sector classifications describe intended coverage, not actual trainees split by sector.
- Missing or unlinked historical classifications remain visible as Unclassified.

All operational views exclude archived records. A percentage without an eligible denominator displays Not applicable.

## Implementation and rollout

- Backend: `backend/src/modules/analytics/`, with parameterized queries and server-side role scope.
- Frontend: `frontend/src/features/analytics/`, using existing metric, table, and sidebar components.
- Terminal submission: `frontend/src/features/reports/components/submit-report-modal.tsx`.
- Package finalization: `backend/src/modules/reports/terminal-package.ts`.
- Migration: `backend/drizzle/0009_dazzling_nightcrawler.sql` adds `trainee_count`, `package_completed_at`, and a non-negative-count constraint.

Deploy the database migration before starting the updated API, then deploy the updated frontend. CSV exports use a consistent database snapshot, quote text safely, neutralize spreadsheet formulas, and require narrower filters above 10,000 records.

DFD documents are intentionally unchanged. Test execution is deferred at the user's request; record typechecks, build results, and read-only database verification separately from test-suite results.
