# Dashboard project-period year filter

Director, RET Chair, and Faculty dashboards default to the current calendar year
in **Asia/Manila**. The selection is stored in the dashboard URL, for example
`/dashboard?year=2026`. Selecting a different year resets pagination to page 1.

## Date basis

The filter uses the proposal's scheduled `targetStartDate` and `targetEndDate`,
including the same period for its linked project. Creation, approval, and actual
closure dates do not determine membership in this view.

A complete period belongs to a year when its start is before January 1 of the
next year and its end is on or after January 1 of the selected year. Year
boundaries are calculated in Manila; scheduled end dates are inclusive.

For example, a November 2025–March 2026 project appears in both 2025 and 2026.
The displayed statuses are **current statuses**, not reconstructed historical
year-end statuses.

## Dashboard behavior

- Director statistics and the January–December chart use the selected period.
  The chart counts projects in each overlapping month. A project can appear in
  several monthly values but is counted once in the annual total.
- RET Chair statistics and the proposal table use the same period predicate.
- Faculty statistics are calculated from the complete authorized dataset on the
  backend. Cards are server-paginated, so totals are not limited to 100 records.
- The selector offers the supported timeline between the earliest and latest
  accessible complete periods, plus the current and selected years. Some years
  in that timeline may have no records. Supported query years are 2000–2200.
- Role, organizational, membership, and archive filtering apply before returning
  records, totals, or year options.

## Drafts without dates

Proposals missing either period date are excluded from year-specific statistics.
Proposal authors receive a short link to the existing **Project Hub** instead of
a separate dashboard list. Faculty can find drafts there, and RET Chairs can
find their own drafts through the same projects page. Completing the dates makes
the proposal eligible for the corresponding dashboard years.

Action Center obligations, recent activity, and expiring-MOA notices remain live
operational information. Selecting an older year does not hide current duties.

## API compatibility

The proposal and project list APIs accept an optional `year` query parameter.
Existing consumers that omit it retain their unfiltered behavior. Director and
RET statistics also retain lifetime summaries when `year` is omitted; the
dashboard pages explicitly send their selected year.

`GET /api/v1/dashboard/faculty` defaults to the current Manila year and accepts
`year`, `page`, and `limit`.

Deploy the backend endpoints together with the frontend feature. The frontend
validates period metadata so an older API response is not presented as a
year-filtered result.
