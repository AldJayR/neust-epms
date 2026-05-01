# Dashboard Implementation Plan

This document outlines the architecture and execution strategy for implementing the role-based dashboard and authenticated navigation for the NEUST EPMS.

## 1. Architectural Strategy

We will use a **Shared Shell + Role Switcher** pattern to minimize code duplication while maintaining strict security and role isolation.

### Core Principles
- **Route Protection:** Use `beforeLoad` in `_authenticated.tsx` and role-specific pathless layouts for access control.
- **Dynamic Navigation:** A single `AppSidebar` component that filters links based on the authenticated user's `roleName`.
- **Unified Dashboard:** A single `/dashboard` route that acts as a component switcher for role-specific views.
- **State Persistence:** Ensure dashboard states (like expanded sidebar) are preserved across navigation.

---

## 2. Routing Structure

```text
src/routes/
├── _authenticated.tsx              # Main Shell (SidebarProvider + AppSidebar)
├── _authenticated/
│   ├── dashboard.tsx               # Switcher: Renders RoleDashboard based on user.roleName
│   ├── _admin.tsx                  # Pathless layout for Super Admin only
│   │   └── users/
│   │       └── index.tsx           # /users - User management & provisioning
│   ├── _director.tsx               # Pathless layout for Director/Admin
│   │   ├── projects/               # /projects - Full project oversight
│   │   └── moas/                   # /moas - MOA management
│   ├── _ret.tsx                    # Pathless layout for RET Chair
│   │   └── proposals/              # /proposals - Queue & Review
│   └── profile.tsx                 # Shared /profile for all roles
```

---

## 3. Information Architecture Mapping

| Role | Primary Dashboard Focus | Exclusive Nav Items |
| :--- | :--- | :--- |
| **Super Admin** | System health & User metrics | User Management, Activity Feed |
| **Director / Admin** | Compliance & Project Oversight | MOA Records, Faculty Overview, Reports |
| **RET Chair** | Proposal Queue & Monitoring | Proposal Queue, Project Monitoring |
| **Faculty** | My Projects & Submissions | My Proposals, My Projects, Reports |

---

## 4. Implementation Phases

### Phase 1: The Authenticated Shell (The Frame)
- Create `src/components/app-sidebar.tsx` using Shadcn primitives.
- Map the IA roles to navigation objects.
- Update `src/routes/_authenticated.tsx` to wrap the `Outlet` in `SidebarProvider` and `AppSidebar`.

### Phase 2: The Dashboard Switcher (The Traffic Cop)
- Define 4 placeholder components in `src/routes/_authenticated/dashboard.tsx`.
- Implement a `switch(user.roleName)` block to render the correct view.
- Setup basic "Under Construction" states for each role.

### Phase 3: Administrative Foundation (The Gatekeeper)
- **Urgency:** High (needed to provision new faculty accounts).
- Implement `_authenticated/_admin.tsx` layout with role validation.
- Create the User Management table and the "Activate/Provision" action calling `POST /auth/users`.

### Phase 4: Core Module Development
- **MOA Module:** CRUD for Memorandum of Agreements.
- **Proposal Module:** Form for Faculty, Queue for RET Chair.
- **Reporting Module:** Submission flow for Faculty, Review flow for Director.

---

## 5. Security Checklist
- [ ] Verify `beforeLoad` redirects unauthenticated users.
- [ ] Verify role-specific layouts redirect unauthorized roles to `/dashboard`.
- [ ] Ensure sensitive data fetching (Loaders) only executes if the role matches.
- [ ] Sanitize API responses to only include data pertinent to the requesting role.
