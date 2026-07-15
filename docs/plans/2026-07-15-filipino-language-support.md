# Filipino Language Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a user-selectable English/Filipino interface that persists per browser, localizes browser UI and client-generated faculty-directory exports, and keeps existing backend contracts and server-provided messages unchanged.

**Architecture:** Add a small `i18next` and `react-i18next` integration with bundled English and Filipino resource modules. Render English during SSR and the first client render; after mount, load the browser preference from `localStorage` and switch language to avoid a hydration mismatch. Centralize all locale-sensitive display formatting in a frontend locale module, while retaining API values, enum values, IDs, ISO dates, routes, and server errors as stable, untranslated data.

**Tech Stack:** React 19, TanStack Start/Router, TypeScript, i18next, react-i18next, `Intl`, date-fns 4, react-day-picker, React PDF Renderer, Vitest, Testing Library.

---

## Scope And Decisions

- Support exactly `en` and `fil`; English is the fallback and SSR default.
- Add a language control to the existing General tab of `frontend/src/components/settings-dialog.tsx`.
- Store the selected language in browser `localStorage`, independently of the authenticated profile, using a dedicated key such as `epms.locale`.
- Translate all frontend-owned text: route content, navigation, dialogs, controls, empty/loading/error states, client validation, status descriptions, client toasts, accessibility labels, and client-generated PDF/CSV output.
- Do not translate API response messages, backend validation messages, database values, user-entered text, uploaded documents, route paths, or API request/response fields in this release.
- Do not add a backend user-language column or alter authentication/session contracts.
- Keep institution/legal acronyms and identifiers such as `NEUST`, `RET`, `MOA`, `PDF`, `OTP`, project IDs, and report types recognizable unless approved Filipino terminology is supplied.

## Translation Coverage Order

The use cases in `docs/usecases.md` and the DFD in `docs/dfd.md` establish the priority order below. A workflow is not complete until its happy path, validation, empty state, failure feedback, and status/alert copy are translated.

1. UC-2: Login, registration, OTP verification, password reset, and access failures.
2. UC-1: User administration, account approval/rejection, provisioning, duplicate handling, and faculty roster.
3. UC-3: Role-specific dashboards, metrics, and action-center alerts.
4. UC-4 and UC-6: Proposal authoring, submission, resubmission, comments, evaluation, endorsement, approval, return, and rejection.
5. UC-5 and UC-7: MOA repository/detail flows, project activation, special orders, project updates, MOA-expiry alerts, and overdue-report alerts.
6. UC-8: Progress and closure report submission, validation, acknowledgments, reporting schedules, and project closure status.
7. UC-9: Activity-log filters, results, detail dialog, and empty/error states.
8. Faculty directory exports: browser toasts, CSV headers, PDF headings, generated date, and download filename display text.

## Task 1: Install And Configure The Translation Runtime

**Files:**
- Modify: `frontend/package.json`
- Modify: frontend lockfile selected by the repository package manager
- Create: `frontend/src/i18n/config.ts`
- Create: `frontend/src/i18n/locales/en.ts`
- Create: `frontend/src/i18n/locales/fil.ts`
- Create: `frontend/src/i18n/locale-provider.tsx`
- Create: `frontend/src/i18n/use-app-locale.ts`
- Create: `frontend/src/i18n/locale-provider.test.tsx`

**Step 1: Add only the runtime dependencies.**

Install `i18next` and `react-i18next`. Do not install browser language detection: the product explicitly uses a controlled per-device preference and must SSR in English.

**Step 2: Define the locale contract.**

Create a stable locale type and storage key:

```ts
export const APP_LOCALES = ["en", "fil"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_STORAGE_KEY = "epms.locale";
```

Initialize i18next synchronously with in-memory resources, `fallbackLng: "en"`, `supportedLngs: APP_LOCALES`, and `escapeValue: false`. Do not read `window`, `navigator`, or `localStorage` from the i18n module.

**Step 3: Add complete initial resource shape.**

Organize resources by feature namespace rather than one unbounded catalog:

```ts
export const en = {
  common: { actions: {}, states: {}, navigation: {}, validation: {} },
  auth: {},
  admin: {},
  dashboard: {},
  proposals: {},
  projects: {},
  moa: {},
  reports: {},
  faculty: {},
  archives: {},
  exports: {},
} as const;
```

The Filipino resource must contain the identical key structure. Use interpolation keys for runtime values, for example `"reconnecting": "Muling kokonekta sa loob ng {{seconds}} segundo..."`; do not concatenate translated fragments in components.

**Step 4: Implement hydration-safe preference loading.**

The provider must start in English on both server and client. In a client effect only, validate the stored value, call `i18n.changeLanguage(storedLocale)`, and subscribe to subsequent language changes. On each change, update `document.documentElement.lang` to `en` or `fil` and persist the selection. Invalid/missing storage values must resolve to English.

**Step 5: Write the provider test first.**

Test all of the following before implementation:

- no stored value renders English;
- stored `fil` switches the rendered translation after mount;
- changing the locale writes `epms.locale` and updates `document.documentElement.lang`;
- an unsupported stored value falls back to English.

Run: `pnpm --dir frontend test src/i18n/locale-provider.test.tsx`

Expected: all locale-provider tests pass.

**Step 6: Commit.**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/i18n
git commit -m "feat: add frontend language infrastructure"
```

Adjust the lockfile path to the lockfile actually changed by the package manager.

## Task 2: Add Shared Locale Formatting And Root Integration

**Files:**
- Modify: `frontend/src/routes/__root.tsx`
- Create: `frontend/src/i18n/formatters.ts`
- Create: `frontend/src/i18n/formatters.test.ts`
- Modify: `frontend/src/components/ui/calendar.tsx`
- Modify: every call site that passes a Calendar component, identified during implementation

**Step 1: Create formatter helpers before changing presentation.**

Expose helpers that take `AppLocale` explicitly. Use `Intl` rather than scattered literals:

```ts
export function formatDate(value: Date | string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "fil" ? "fil-PH" : "en-PH", {
    dateStyle: "medium",
  }).format(toStableDate(value));
}
```

Add matching `formatDateTime`, `formatMonthYear`, `formatNumber`, and `formatCurrencyPhp` helpers. Use the existing `toStableDate` utility so date-only values retain the application's current timezone-safe behavior. Keep `yyyy-MM-dd` only for machine-readable download suffixes and API payloads.

**Step 2: Test output behavior.**

Test both locales with fixed dates and values. Assert that the currency helper emits Philippine pesos, date helpers vary by locale, and invalid values follow the current component-level fallback behavior rather than throwing.

Run: `pnpm --dir frontend test src/i18n/formatters.test.ts`

Expected: formatter tests pass for English and Filipino.

**Step 3: Integrate at the root.**

Wrap `ThemeProvider`, tooltip content, and application children with `LocaleProvider` in `frontend/src/routes/__root.tsx`. Translate the root error page, not-found page, connection-lost/restored notifications, retry/home actions, and document title. Preserve English initial rendering and do not read browser storage in `head()`.

**Step 4: Resolve calendar localization deliberately.**

`react-day-picker` receives a date-fns-style locale object, while the current dependency set does not provide a ready-made Filipino date-fns locale. Build a small adapter only if it can correctly localize Filipino month and weekday names, or retain English calendar internals only with explicit product approval. Do not claim Filipino support while calendar headers and weekday labels remain English.

The adapter must be applied through the shared Calendar component so every proposal, MOA, report, and project date picker receives the active locale.

**Step 5: Commit.**

```bash
git add frontend/src/routes/__root.tsx frontend/src/i18n frontend/src/components/ui/calendar.tsx
git commit -m "feat: localize shared formatting and application shell"
```

## Task 3: Add The Per-Device Language Selector And Translate Shared UI

**Files:**
- Modify: `frontend/src/components/settings-dialog.tsx`
- Modify: `frontend/src/components/layout/app-sidebar.tsx`
- Modify: `frontend/src/components/role-sidebar.tsx`
- Modify: `frontend/src/components/custom/global-search.tsx`
- Modify: `frontend/src/components/custom/notification-dropdown.tsx`
- Modify: `frontend/src/lib/status-descriptions.ts`
- Modify: `frontend/src/lib/utils.ts`
- Create: `frontend/src/lib/status-descriptions.test.ts`

**Step 1: Put language beside appearance.**

In the existing General tab, add an accessible control offering `English` and `Filipino`. It must use the locale-provider setter, show the active language, and state that it applies on this device. Do not send this preference through `updateProfileFn`.

**Step 2: Translate shell copy and labels.**

Replace hard-coded navigation group/item titles, sidebar fallbacks, settings/profile/password labels, theme labels, logout feedback, global search copy, notification copy, `alt` text, and ARIA labels with `t()` calls.

**Step 3: Preserve raw status values.**

Refactor `getStatusDescription` to accept a translation function or return translation keys with interpolation data. The persisted values such as `Draft`, `Pending Review`, `Approved`, `Overdue`, `Expired`, and `Final Accomplishment` must not change. Translate only `label`, `explanation`, and `nextStep` at render time.

**Step 4: Translate shared display maps.**

Move academic rank and role display labels behind translation keys while preserving their stable values such as `instructor-1` and server role identifiers.

**Step 5: Write focused tests.**

Cover the language switcher accessibility name and status-label rendering in each locale. Verify an unknown status preserves its raw status value rather than rendering an incorrect translated status.

Run: `pnpm --dir frontend test src/lib/status-descriptions.test.ts`

Expected: status and selector tests pass.

**Step 6: Commit.**

```bash
git add frontend/src/components frontend/src/lib/status-descriptions.ts frontend/src/lib/utils.ts frontend/src/i18n
git commit -m "feat: add localized shared interface controls"
```

## Task 4: Localize Authentication And User Administration

**Files:**
- Modify: `frontend/src/routes/login.tsx`
- Modify: `frontend/src/routes/register.tsx`
- Modify: `frontend/src/routes/register.account.tsx`
- Modify: `frontend/src/routes/forgot-password.index.tsx`
- Modify: `frontend/src/routes/forgot-password.otp.tsx`
- Modify: `frontend/src/routes/forgot-password.reset.tsx`
- Modify: `frontend/src/features/admin/users-page.tsx`
- Modify: `frontend/src/features/admin/add-user-dialog.tsx`
- Modify: `frontend/src/features/admin/edit-user-dialog.tsx`
- Modify: `frontend/src/features/admin/view-user-dialog.tsx`
- Modify: `frontend/src/features/admin/bulk-approve-dialog.tsx`
- Modify: `frontend/src/features/admin/activity-log-page.tsx`
- Modify: `frontend/src/features/admin/activity-log-entry-dialog.tsx`
- Modify: `frontend/src/features/admin/settings-page.tsx`

**Step 1: Translate all frontend-owned access messages.**

Localize headings, labels, hints, buttons, password-strength feedback, OTP resend state, account-pending explanations, client validation, and fallback errors. Continue displaying `result.message` and caught API errors unchanged, per scope.

**Step 2: Translate administrative workflows.**

Localize pending-user review, role selection, approval/rejection/merge dialogs, account-provisioning flows, user filtering, pagination copy, activity metrics, log filters, detail labels, archival settings, and success/failure toasts.

**Step 3: Replace explicit audit-log locale constants.**

Remove the `en-US` `Intl.DateTimeFormat` instances in the activity log page and entry dialog. Use the shared formatters with the current application locale.

**Step 4: Validate UC-1 and UC-2 manually in both languages.**

Exercise login failure, registration pending notice, OTP resend, password mismatch, single and bulk approval, rejection reason, duplicate-account merge, activity-log search/filter, and no-results states.

**Step 5: Commit.**

```bash
git add frontend/src/routes frontend/src/features/admin frontend/src/i18n
git commit -m "feat: localize access and administration workflows"
```

## Task 5: Localize Dashboards, Proposal Submission, And Review

**Files:**
- Modify: `frontend/src/features/dashboard/**`
- Modify: `frontend/src/features/action-center/**`
- Modify: `frontend/src/features/ret/ret-dashboard-page.tsx`
- Modify: `frontend/src/features/proposals/proposal-review-page.tsx`
- Modify: `frontend/src/features/proposals/proposal-lifecycle-stepper.tsx`
- Modify: `frontend/src/features/proposals/hooks/use-proposal-wizard.ts`
- Modify: `frontend/src/features/proposals/components/proposal-form.ts`
- Modify: `frontend/src/features/proposals/components/proposal-wizard-*.tsx`
- Modify: `frontend/src/features/proposals/components/proposal-step-*.tsx`
- Modify: `frontend/src/features/proposals/components/proposal-review-*.tsx`
- Modify: `frontend/src/features/proposals/components/comments-tab.tsx`
- Modify: `frontend/src/features/proposals/components/pdf-viewer/**`

**Step 1: Translate metrics, actions, alerts, and role-dependent dashboard states.**

Cover Director, RET Chair, and Faculty views, including empty data and project/report deadline alerts described in UC-3 and UC-7.

**Step 2: Make form validation locale-aware.**

Replace module-level English Zod messages with schema factories that receive `t`, for example `createProposalSchema(t)`. Preserve validation rules and field names; only translate user-facing messages.

**Step 3: Translate the full proposal lifecycle.**

Localize initial submission, required documents, duplicate-member feedback, revision/resubmission, reviewer comments, endorsement, approval, returned-for-revision, rejection, loading skeleton labels, and document-pane controls. Do not translate document contents, stored comments, proposal titles, categories, or status payload values.

**Step 4: Centralize visible dates and amounts.**

Replace direct `date-fns` display calls and `toLocaleDateString("en-US")`/`toLocaleString("en-PH")` calls with shared formatter helpers. Preserve `toISOString()` for submission payloads.

**Step 5: Manually validate UC-3, UC-4, and UC-6.**

Check the Faculty and RET Chair submission path, the reviewer decision path, the Director approval path, return/rejection messages, and status explanations in both locales.

**Step 6: Commit.**

```bash
git add frontend/src/features/dashboard frontend/src/features/action-center frontend/src/features/ret frontend/src/features/proposals frontend/src/i18n
git commit -m "feat: localize dashboards and proposal workflows"
```

## Task 6: Localize MOA, Projects, Reports, Faculty, And Archives

**Files:**
- Modify: `frontend/src/features/moa/**`
- Modify: `frontend/src/features/projects/**`
- Modify: `frontend/src/features/reports/**`
- Modify: `frontend/src/features/faculty/**`
- Modify: `frontend/src/features/ret/project-monitoring-page.tsx`
- Modify: `frontend/src/features/ret/faculty-directory-page.tsx`
- Modify: `frontend/src/features/archives/**`

**Step 1: Translate UC-5 MOA workflows.**

Localize repository/detail tables, create/edit forms, validity-date validation, linked-project views, empty states, modal actions, and expiry feedback.

**Step 2: Translate UC-7 project workflows.**

Localize project hub/details, readiness, special-order upload, activation wizard, MOA selection, reporting schedules, implementation updates, completion state, expired-MOA alerts, and overdue-report alerts.

**Step 3: Translate UC-8 report workflows.**

Localize report filters/tabs, report columns, submit-modal labels, progress/closure requirements, period validation, acknowledgments, and failure/success toasts. Keep the server's report type values and payload contract unchanged.

**Step 4: Translate faculty/RET and archive views.**

Localize directory labels, monitoring tables, metric cards, archive tabs, restore actions, filters, empty states, and all browser-owned date displays.

**Step 5: Complete the date-format replacement.**

Search `frontend/src` for all display uses of `format(` from date-fns, `toLocaleDateString`, `toLocaleString`, and `new Intl.DateTimeFormat`. Replace only presentation uses with shared helpers. Retain date-fns for parsing, date calculations, calendar state, and API serialization where appropriate.

Run: `rg -n 'toLocaleDateString\(|toLocaleString\("en-|Intl\.DateTimeFormat\("en-|format\([^\n]*(MMM|PPP|MM/dd)' frontend/src`

Expected: no remaining hard-coded English display formatter in product components, except documented machine-only export suffixes or the calendar adapter implementation.

**Step 6: Commit.**

```bash
git add frontend/src/features/moa frontend/src/features/projects frontend/src/features/reports frontend/src/features/faculty frontend/src/features/ret frontend/src/features/archives frontend/src/i18n
git commit -m "feat: localize project management workflows"
```

## Task 7: Localize Faculty Directory Exports

**Files:**
- Modify: `frontend/src/features/faculty/faculty-directory-export.tsx`
- Modify: `frontend/src/features/faculty/components/faculty-directory-pdf.tsx`
- Modify: `frontend/src/features/faculty/components/ret-directory-columns.tsx`
- Modify: `frontend/src/features/faculty/components/director-directory-columns.tsx`
- Add or modify: `frontend/src/features/faculty/faculty-directory-export.test.tsx`

**Step 1: Pass localized export content into export builders.**

The export hook must obtain `t` and the active locale. Pass translated labels and locale-formatted generated dates to the PDF builder rather than embedding English PDF text in the renderer.

**Step 2: Localize CSV and PDF labels.**

Translate CSV headers, PDF title/headings/table labels, generated-on label, no-data and success/failure toasts, and user-visible download names. Keep CSV encoding as UTF-8 and retain `escapeFormulae: true`.

**Step 3: Test both output modes.**

Mock browser download and PDF renderer boundaries. Assert Filipino CSV headers and PDF props are emitted after language selection, and English output remains the fallback.

Run: `pnpm --dir frontend test src/features/faculty/faculty-directory-export.test.tsx`

Expected: export localization tests pass without changing exported row values.

**Step 4: Commit.**

```bash
git add frontend/src/features/faculty frontend/src/i18n
git commit -m "feat: localize faculty directory exports"
```

## Task 8: Translation QA, Accessibility, And Release Verification

**Files:**
- Modify: translation resource files only for copy-review corrections
- Create: `frontend/src/i18n/translation-coverage.test.ts`

**Step 1: Add catalog parity coverage.**

Write a test that recursively compares English and Filipino resource keys. It must fail if a Filipino key is missing or if an unknown extra key is added. Keep locale-specific copy values unconstrained.

**Step 2: Perform native Filipino copy review.**

Have a Filipino-speaking NEUST stakeholder validate terminology, formality, legal/institutional names, and clarity for each workflow. Avoid literal translation where it reduces comprehension; preserve accepted institutional terms.

**Step 3: Check accessibility and responsive behavior.**

At desktop and mobile widths, verify translated labels do not overflow navigation, dialogs, tables, buttons, calendar captions, or PDF layouts. Verify the selector has an accessible label, `<html lang>` changes, and focus does not reset on language change.

**Step 4: Run automated verification.**

Run:

```bash
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend build
```

Expected: all tests, lint checks, and the production build pass.

**Step 5: Final manual workflow matrix.**

Run UC-1 through UC-9 in English and Filipino. For every row, verify navigation, page title, primary action, validation/failure state, success state, status/alert text, and displayed dates/numbers. Record API-originated messages as intentionally untranslated.

**Step 6: Commit.**

```bash
git add frontend/src/i18n frontend/src
git commit -m "test: verify Filipino language coverage"
```

## Risks And Guardrails

- Do not infer or translate API error strings. Localizing them requires a separately scoped backend error-code contract.
- Do not translate persisted status/report type values. Translate their display mapping at the rendering boundary.
- Do not initialize the application locale from browser state during SSR or initial client render; that would risk English-server/Filipino-client hydration mismatches.
- Do not use a browser language detector; the selected device preference must win over browser defaults.
- Do not leave a visibly English `react-day-picker` calendar in a released Filipino mode. Resolve it with a verified adapter or explicitly defer calendar localization before release approval.
- Do not use translated labels as React keys, route parameters, storage values, analytics values, or API input.
