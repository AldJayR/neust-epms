# Dashboard Role Switcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement role-based dashboard routing so that `/dashboard` intelligently routes Super Admin to `/admin/users`, and future roles to their respective landing pages.

**Architecture:** The dashboard acts as a "traffic cop" that reads the authenticated user's `roleName` from the router context and navigates programmatically to the correct role-specific dashboard. No role-specific UI components yet—just intelligent routing.

**Tech Stack:** TanStack Router (file-based routing, `useRouteContext()`), React Router hooks for navigation, existing `AuthUser` interface with `roleName` field.

---

## Current State

- ✅ Super Admin admin views exist at `/_authenticated/admin/*` (users, settings, activity-log)
- ✅ User data includes `roleName` (AuthUser interface in `lib/auth.ts`)
- ✅ Admin layout has sidebar with navigation to `/admin/users`, etc.
- ❌ Dashboard (`/_authenticated/dashboard.tsx`) is a placeholder
- ❌ No role-aware routing on `/dashboard`

---

## Design Decisions

1. **Navigation approach:** Use `useNavigate()` in `beforeLoad` to redirect immediately on route load
2. **No redirect loops:** Each role-specific page must NOT redirect back to `/dashboard`
3. **Role values:** Hardcode role checks for: `'Super Admin'`, `'Director'`, `'RET Chair'`, `'Faculty'` (case-sensitive, match backend)
4. **Fallback behavior:** Unknown roles stay on dashboard with error message

---

## Task 1: Create Dashboard Switcher Logic

**Files:**
- Modify: `frontend/src/routes/_authenticated/dashboard.tsx`

**Step 1: Understand current state**

Current file is a placeholder. Read it:
```bash
cat frontend/src/routes/_authenticated/dashboard.tsx
```

**Step 2: Implement role-based redirect in beforeLoad**

Replace entire file with:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: ({ context }) => {
    const user = context.auth.user

    if (!user) {
      // Should not happen (protected by _authenticated guard), but safety check
      throw redirect({ to: '/login' })
    }

    // Route based on role
    switch (user.roleName) {
      case 'Super Admin':
        throw redirect({ to: '/admin/users' })
      case 'Director':
        // TODO: Phase 4 - Director dashboard
        break
      case 'RET Chair':
        // TODO: Phase 4 - RET Chair dashboard
        break
      case 'Faculty':
        // TODO: Phase 4 - Faculty dashboard
        break
      default:
        // Unknown role - stay on dashboard, let component show error
        break
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = Route.useRouteContext<{ user: any }>()

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-card-foreground">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          {user?.roleName ? (
            <>
              Role-specific dashboard for <strong>{user.roleName}</strong> not yet implemented.
            </>
          ) : (
            'Unable to determine your role.'
          )}
        </p>
      </div>
    </main>
  )
}
```

**Step 3: Commit the change**

```bash
cd frontend
git add src/routes/_authenticated/dashboard.tsx
git commit -m "feat: implement role-based dashboard routing for Super Admin"
```

---

## Task 2: Add Type Safety for Route Context

**Files:**
- Modify: `frontend/src/routes/_authenticated.tsx`

**Step 1: Read current _authenticated route**

```bash
cat frontend/src/routes/_authenticated.tsx
```

**Step 2: Update to explicitly return user in context**

Current file already does this, but let's verify the return type is clear:

```tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import type { AuthUser } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    // Explicitly type the returned context
    return {
      user: context.auth.user!,  // Non-null assertion OK here (guarded by isAuthenticated check)
    }
  },
  component: () => <Outlet />,
})
```

**Step 3: Commit**

```bash
cd frontend
git add src/routes/_authenticated.tsx
git commit -m "chore: add explicit type for authenticated route context"
```

---

## Task 3: Manual Testing

**Step 1: Start frontend dev server**

```bash
cd frontend
pnpm dev
```

Server runs on `http://localhost:3000`

**Step 2: Test Super Admin flow**

1. Navigate to http://localhost:3000/login
2. Log in with Super Admin credentials
3. Browser should automatically redirect to http://localhost:3000/admin/users
4. Verify admin sidebar is visible with User Management nav item highlighted

**Step 3: Test unknown role (if possible)**

If backend allows, create a test user with a role like `'Quality Assurance'` (not in the switch cases):
1. Log in with that user
2. Dashboard should show: "Role-specific dashboard for Quality Assurance not yet implemented."
3. No redirect loop, page is stable

**Step 4: Document findings**

Note:
- [ ] Super Admin redirects to `/admin/users` ✅
- [ ] Unknown roles show placeholder message ✅
- [ ] No redirect loops ✅
- [ ] Sidebar functions correctly on admin pages ✅

---

## Task 4: Future Role Handlers (Placeholders)

**Files:**
- Create: `frontend/src/routes/_authenticated/_director.tsx`
- Create: `frontend/src/routes/_authenticated/_director/dashboard.tsx`
- Create: `frontend/src/routes/_authenticated/_ret.tsx`
- Create: `frontend/src/routes/_authenticated/_ret/dashboard.tsx`
- Create: `frontend/src/routes/_authenticated/_faculty.tsx`
- Create: `frontend/src/routes/_authenticated/_faculty/dashboard.tsx`

These are for **Phase 4 (not this task)**. Document that they need to be created as pathless layout routes with role checks similar to `_admin.tsx`.

---

## Verification Checklist

- [ ] Dashboard.tsx modified with beforeLoad redirect logic
- [ ] Super Admin login redirects to `/admin/users`
- [ ] Unknown roles show error message, no redirect loops
- [ ] No test failures introduced
- [ ] Code committed with clear message

---

## Known Limitations (Phase 4+)

1. **Director, RET Chair, Faculty routes not implemented** - currently no landing pages
2. **No shared sidebar for non-admin roles** - `AdminSidebar` is admin-specific
3. **No role-specific navigation** - routes.md shows proposed structure but not built

---

## Related Files Reference

- `frontend/dashboard-plan.md` - Original architectural plan (Phases 1-4)
- `frontend/route.md` - Full routing specification for all roles
- `frontend/src/components/admin-sidebar.tsx` - Admin navigation (role-specific example)
- `frontend/src/routes/_authenticated/admin.tsx` - Admin RBAC guard pattern
- `frontend/src/lib/auth.ts` - AuthUser interface with roleName
