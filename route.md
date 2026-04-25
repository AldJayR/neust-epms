# NEUST-EPMS Frontend Routing Structure

This document outlines the file-based routing structure for the NEUST Extension Services Project Management System, utilizing TanStack Router.

---

## Route Map

| Path | File | Purpose |
| :--- | :--- | :--- |
| `/` | `_authenticated/index.tsx` | Redirects to `/dashboard` (Auth Protected) |
| `/login` | `login.tsx` | User Authentication Page |
| `/register` | `register.tsx` | Public Self-Registration |
| `/register/account` | `register.account.tsx` | Onboarding Step 2 |
| **Auth Group** | `_authenticated.tsx` | **Auth Guard** (Pathless Layout) |
| `/dashboard` | `_authenticated/dashboard.tsx` | Main Project/Proposal Dashboard |
| `/proposals` | `_authenticated/proposals/index.tsx` | List of Proposals |
| `/proposals/new` | `_authenticated/proposals/new.tsx` | Create New Proposal |
| `/proposals/$id` | `_authenticated/proposals/$proposalId/index.tsx` | Proposal Details & PDF Viewer |
| `/proposals/$id/edit` | `_authenticated/proposals/$proposalId/edit.tsx` | Edit Proposal (Drafts) |
| `/proposals/$id/review` | `_authenticated/proposals/$proposalId/review.tsx` | Endorsement/Approval View |
| `/projects` | `_authenticated/projects/index.tsx` | List of Active Projects |
| `/projects/$id` | `_authenticated/projects/$projectId/index.tsx` | Project Details |
| `/projects/$id/reports` | `_authenticated/projects/$projectId/reports.tsx` | Progress Report Management |
| `/moas` | `_authenticated/moas/index.tsx` | MOA Tracking & Management |
| **Admin Group** | `_authenticated/_admin.tsx` | **RBAC Guard** (Super Admin/Director) |
| `/users` | `_authenticated/_admin/users/index.tsx` | User Provisioning & Management |
| `/audit` | `_authenticated/_admin/audit.tsx` | System Audit Logs |
| `/settings` | `_authenticated/_admin/settings.tsx` | System Configuration |

---

## Technical Patterns

### 1. Authentication Boundary (`_authenticated.tsx`)
Uses a pathless layout with a `beforeLoad` hook to check for `auth.isAuthenticated`. If false, it redirects to `/login` while preserving the intended destination in the search params.

### 2. Role-Based Access Control (`_admin.tsx`)
A nested pathless layout inside the authenticated group. It restricts access to routes like `/users` and `/audit` based on the user's role (Super Admin or Director).

### 3. Hierarchical Grouping
- **Proposals**: Organized in a `$proposalId/` directory to manage complex states (review, edit, members).
- **Projects**: Grouped under `$projectId/` to separate project management from the initial proposal phase.
- **Directories**: Sub-folders (e.g., `proposals/`, `projects/`) are used for feature-based organization while keeping the URL clean.

---

## Next Steps
- Implement the `dashboard.tsx` component.
- Build the `proposals/index.tsx` listing page.
- Integrate the PDF viewer in the proposal detail routes.
