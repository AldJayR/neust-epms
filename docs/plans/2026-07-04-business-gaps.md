# Business Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close remaining functional gaps in NEUST-EPMS — login/logout audit, notifications, overdue monitoring, MOA alerts, report acknowledgments, and settings page.

**Architecture:** In-app notifications via a new `createNotification()` helper that writes to the existing `notifications` table + sends email via Resend for critical events. Frontend bell icon becomes a live dropdown. New daily cron for overdue reports. Existing MOA cron updated to notify Director. Login/logout events captured via new backend auth endpoints.

**Tech Stack:** Hono backend, Drizzle ORM, Supabase Auth/Storage, Resend (email), React/TanStack Router frontend

---

## Priority Order

| Phase | Task | Effort |
|---|---|---|
| **Phase 0** | Login/Logout Audit Logging (Process 2.3) | ~2h |
| **Phase 1** | Notifications System (cross-cutting) | ~5-6h |
| **Phase 2** | Overdue Report Monitoring Cron (Process 7.7) | ~3h |
| **Phase 3** | MOA Expiry → Director Notification (Process 7.5) | ~1h |
| **Phase 4** | Report Acknowledgment (Process 8.2) | ~30m |
| **Phase 5** | Settings Page | ~3h |
| **Total** | | **~15-16h** |

---

## Phase 0: Login/Logout Audit Logging (Process 2.3)

### Goal
Every login and logout event is recorded in `audit_logs`. Failed logins are also logged with reason. The existing audit stats SQL query for failed logins starts returning real data.

### Files
- Modify: `backend/src/routes/auth.routes.ts` — add POST `/auth/login` and POST `/auth/logout`
- Modify: `frontend/src/lib/auth.functions.ts` — replace direct `supabase.auth.signInWithPassword()` with server function

### Implementation

**Step 1: Add `POST /auth/login` endpoint**

```typescript
// backend/src/routes/auth.routes.ts — add at end of authRoutes

// --- Login endpoint (server-side, enables audit logging) ---
app.openapi(loginEndpoint, async (c) => {
  const { email, password } = await c.req.json();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Log failed login
    await db.insert(auditLogs).values({
      userId: null,
      action: 'Failed Login',
      details: { email, reason: error.message },
      sourceIp: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
    });
    return c.json({ error: error.message }, 401);
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, data.user.id) });
  if (!user?.isActive) {
    await supabase.auth.signOut();
    await db.insert(auditLogs).values({
      userId: data.user.id,
      action: 'Failed Login',
      details: { reason: 'Account not activated' },
      sourceIp: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
    });
    return c.json({ error: 'Account not activated' }, 403);
  }

  // Audit log on successful login
  await db.insert(auditLogs).values({
    userId: data.user.id,
    action: 'Login',
    details: null,
    sourceIp: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
  });

  return c.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email },
  });
});
```

**Step 2: Add `POST /auth/logout` endpoint**

```typescript
app.openapi(logoutEndpoint, async (c) => {
  const session = c.get('session');
  const userId = session?.user?.id;
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: 'Logout',
      details: null,
      sourceIp: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
    });
  }

  if (session?.access_token) {
    await supabase.auth.admin.signOut(session.access_token);
  }

  return c.json({ ok: true });
});
```

**Step 3: Update frontend `loginFn` and `logoutFn`**

```typescript
// frontend/src/lib/auth.functions.ts

// Replace the existing loginFn with:
export async function loginFn({ email, password }: { email: string; password: string }) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Login failed');
  }
  return response.json();
}

// Replace the existing logoutFn with:
export async function logoutFn() {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Logout failed');
  return response.json();
}
```

### Test
- Register a new account, activate via admin, login — verify audit log entry appears
- Try login with wrong password — verify failed login audit entry with reason
- Logout — verify logout audit entry
- Check `GET /admin/audit-stats` — failed login count should now be non-zero if failures occurred

---

## Phase 1: Notifications System

### Goal
Backend serves notifications to frontend. A reusable `createNotification()` helper writes to `notifications` table and optionally sends email via Resend. Frontend bell icon becomes a live dropdown with unread badge.

### Files
- Create: `backend/src/routes/notifications.routes.ts` — GET `/notifications`, GET `/notifications/unread-count`, PATCH `/notifications/:id/read`
- Create: `backend/src/lib/notification.helpers.ts` — `createNotification()` helper
- Modify: `backend/src/index.ts` — register notification routes
- Modify: `frontend/src/components/custom/app-header.tsx` — live bell icon with dropdown
- Create: `frontend/src/lib/notifications.functions.ts` — server functions for notifications

### Implementation

**Step 1: Create `createNotification()` helper**

```typescript
// backend/src/lib/notification.helpers.ts

import { db } from '../db';
import { notifications } from '../db/schema';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface CreateNotificationOpts {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailHtml?: string;
}

export async function createNotification(opts: CreateNotificationOpts) {
  const { recipientId, type, title, message, sendEmail = false, emailSubject, emailHtml } = opts;

  // Insert in-app notification
  await db.insert(notifications).values({
    recipientId,
    type,
    title,
    message,
    isRead: false,
  });

  // Optionally send email
  if (sendEmail && process.env.RESEND_API_KEY) {
    const user = await db.query.users.findFirst({ where: eq(users.id, recipientId) });
    if (user?.email) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'NEUST EPMS <noreply@example.com>',
          to: user.email,
          subject: emailSubject || title,
          html: emailHtml || `<p>${message}</p>`,
        });
      } catch (e) {
        console.error('Failed to send notification email:', e);
      }
    }
  }
}
```

**Step 2: Create notification routes**

```typescript
// backend/src/routes/notifications.routes.ts

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { notifications } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { createAuthMiddleware } from '../middleware/auth';

const app = new Hono().use('*', createAuthMiddleware());

// GET /notifications — current user's notifications, newest first
app.get('/', async (c) => {
  const user = c.get('user');
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  return c.json(rows);
});

// GET /notifications/unread-count
app.get('/unread-count', async (c) => {
  const user = c.get('user');
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, user.id), eq(notifications.isRead, false)));
  return c.json({ count: result?.count ?? 0 });
});

// PATCH /notifications/:id/read
app.patch('/:id/read', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, user.id)));
  return c.json({ ok: true });
});

export default app;
```

**Step 3: Register routes in index.ts**

```typescript
// backend/src/index.ts — add alongside other route registrations
import notificationsRoutes from './routes/notifications.routes';
app.route('/notifications', notificationsRoutes);
```

**Step 4: Frontend notifications functions**

```typescript
// frontend/src/lib/notifications.functions.ts

import { queryOptions } from '@tanstack/react-query';
import { fetchClient } from './utils';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const getNotificationsOptions = () =>
  queryOptions({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await fetchClient.from(`${API}/notifications`);
      return data as Notification[];
    },
    refetchInterval: 30_000, // poll every 30s
  });

export const getUnreadCountOptions = () =>
  queryOptions({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await fetchClient.from(`${API}/notifications/unread-count`);
      return data as { count: number };
    },
    refetchInterval: 30_000,
  });

export async function markNotificationRead(id: string) {
  const { data } = await fetchClient.from(`${API}/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return data;
}

export interface Notification {
  notificationId: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}
```

**Step 5: Replace dead bell icon with live dropdown**

```tsx
// frontend/src/components/custom/app-header.tsx — replace the Bell button section

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotificationsOptions, getUnreadCountOptions, markNotificationRead } from '../../lib/notifications.functions';
import { useState, useRef, useEffect } from 'react';

// Inside the component:
const queryClient = useQueryClient();
const [open, setOpen] = useState(false);
const dropdownRef = useRef<HTMLDivElement>(null);

const { data: unreadData } = useQuery(getUnreadCountOptions());
const { data: notificationsData } = useQuery({
  ...getNotificationsOptions(),
  enabled: open, // only fetch when dropdown is open
});

const markReadMutation = useMutation({
  mutationFn: markNotificationRead,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  },
});

// Close dropdown on outside click
useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
  }
  if (open) document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, [open]);

// In the JSX, replace the Bell button:
<div className="relative" ref={dropdownRef}>
  <button
    onClick={() => setOpen(!open)}
    className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100"
  >
    <Bell className="h-5 w-5" />
    {unreadData && unreadData.count > 0 && (
      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
        {unreadData.count > 99 ? '99+' : unreadData.count}
      </span>
    )}
  </button>
  {open && (
    <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-white shadow-lg">
      <div className="border-b px-4 py-2 font-semibold text-sm">Notifications</div>
      <div className="max-h-80 overflow-y-auto">
        {notificationsData && notificationsData.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500">No notifications</div>
        )}
        {notificationsData?.map((n) => (
          <div
            key={n.notificationId}
            className={`cursor-pointer border-b px-4 py-3 text-sm hover:bg-gray-50 ${
              !n.isRead ? 'bg-blue-50' : ''
            }`}
            onClick={() => {
              markReadMutation.mutate(n.notificationId);
            }}
          >
            <div className="font-medium">{n.title}</div>
            <div className="text-gray-600">{n.message}</div>
            <div className="mt-1 text-xs text-gray-400">
              {new Date(n.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
```

### Test
- Call `createNotification()` from any route handler — verify it appears in the dropdown
- Send email-enabled notification — verify Resend email arrives
- Click a notification — verify it's marked as read, badge count decrements
- Open dropdown, close it, reopen — verify state persists
- Test unread badge edge cases: 0, 1, 99, 100+

---

## Phase 2: Overdue Report Monitoring Cron (Process 7.7)

### Goal
Daily cron detects overdue reports on active projects and notifies Faculty (project leader) and RET Chair via in-app notification + email.

### Files
- Create: `backend/src/cron/report-overdue.ts`
- Modify: `backend/src/index.ts` — register the cron

### Implementation

**Step 1: Create the cron**

```typescript
// backend/src/cron/report-overdue.ts

import cron from 'node-cron';
import { db } from '../db';
import { projectReportingDates, projects, projectMembers, users } from '../db/schema';
import { and, eq, lt, isNull, or } from 'drizzle-orm';
import { createNotification } from '../lib/notification.helpers';

export function startReportOverdueCron() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[cron] Running report-overdue check...');

    // Find reporting dates that are past due and not completed
    const overdueDates = await db
      .select({
        reportingDateId: projectReportingDates.id,
        projectId: projectReportingDates.projectId,
        reportingDate: projectReportingDates.reportingDate,
      })
      .from(projectReportingDates)
      .where(
        and(
          lt(projectReportingDates.reportingDate, new Date()),
          eq(projectReportingDates.isCompleted, false),
          isNull(projectReportingDates.archivedAt)
        )
      );

    for (const row of overdueDates) {
      // Get project
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, row.projectId),
      });
      if (!project) continue;

      // Get project leader (Faculty)
      const leader = await db.query.projectMembers.findFirst({
        where: and(
          eq(projectMembers.projectId, row.projectId),
          eq(projectMembers.roleInProject, 'Leader')
        ),
      });

      // Get RET Chair for this project's campus
      const retChair = await db.query.users.findFirst({
        where: and(
          eq(users.roleName, 'RET Chair'),
          eq(users.campusName, project.campusName)
        ),
      });

      const dateStr = new Date(row.reportingDate).toLocaleDateString();

      // Notify Faculty (leader)
      if (leader) {
        await createNotification({
          recipientId: leader.userId,
          type: 'report_overdue',
          title: 'Report Overdue',
          message: `Your report for "${project.title}" was due on ${dateStr}. Please submit immediately.`,
          sendEmail: true,
          emailSubject: `Overdue Report: ${project.title}`,
          emailHtml: `<p>Your report for "<strong>${project.title}</strong>" was due on <strong>${dateStr}</strong>. Please submit immediately.</p>`,
        });
      }

      // Notify RET Chair
      if (retChair) {
        await createNotification({
          recipientId: retChair.id,
          type: 'report_overdue',
          title: 'Report Overdue',
          message: `A report for "${project.title}" (${project.campusName}) was due on ${dateStr} and has not been submitted.`,
          sendEmail: true,
          emailSubject: `Overdue Report: ${project.title}`,
          emailHtml: `<p>A report for "<strong>${project.title}</strong>" (${project.campusName}) was due on <strong>${dateStr}</strong> and has not been submitted.</p>`,
        });
      }
    }

    console.log(`[cron] Report overdue check complete. ${overdueDates.length} overdue dates found.`);
  });
}
```

**Step 2: Register in index.ts**

```typescript
// backend/src/index.ts
import { startReportOverdueCron } from './cron/report-overdue';

// alongside other cron registrations
startReportOverdueCron();
```

### Test
- Create a project with a reporting date in the past, mark `isCompleted = false`
- Run the cron manually or wait for daily execution
- Verify Faculty leader and RET Chair both receive notification + email
- Verify duplicate notifications are not sent on consecutive days for the same overdue date

---

## Phase 3: MOA Expiry → Director Notification (Process 7.5)

### Goal
Update existing MOA expiration cron to also create in-app notifications for Director(s) and send email.

### Files
- Modify: `backend/src/cron/moa-expiration.ts` — add `createNotification()` call

### Implementation

**Step 1: Update the cron to notify Director**

In the existing `startMoaExpirationCron()` function, after the Resend email is sent, add:

```typescript
// Find Director user(s)
const directors = await db.query.users.findMany({
  where: eq(users.roleName, 'Director'),
});

for (const director of directors) {
  await createNotification({
    recipientId: director.id,
    type: 'moa_expiry',
    title: 'MOA Expiration Alert',
    message: `MOA for "${moa.partnershipName}" (${moa.moaNumber}) expires on ${expiryDate.toLocaleDateString()}. Please renew.`,
    sendEmail: true,
    emailSubject: `MOA Expiring: ${moa.partnershipName}`,
    emailHtml: `<p>MOA for "<strong>${moa.partnershipName}</strong>" (${moa.moaNumber}) expires on <strong>${expiryDate.toLocaleDateString()}</strong>. Please renew.</p>`,
  });
}
```

### Test
- Verify Director receives in-app notification when MOA is within 30 days of expiry
- Verify email is also sent
- Verify non-Director users do NOT receive this notification

---

## Phase 4: Report Acknowledgment (Process 8.2)

### Goal
When a Faculty or RET Chair submits a progress report, terminal report, or FAR, the Director gets an in-app notification + email.

### Files
- Modify: `backend/src/routes/reports.routes.ts` — add `createNotification()` after successful insert

### Implementation

**Step 1: Add notification in POST /reports handler**

After the successful report insert and audit log:

```typescript
// Find Director
const directors = await db.query.users.findMany({
  where: eq(users.roleName, 'Director'),
});

const reportType = reportTypeParam || 'progress';
const readableType = reportType === 'progress' ? 'Progress Report'
  : reportType === 'terminal' ? 'Terminal Report'
  : 'Final Accomplishment Report';

for (const director of directors) {
  await createNotification({
    recipientId: director.id,
    type: 'report_submitted',
    title: 'New Report Submitted',
    message: `A ${readableType} has been submitted for "${projectTitle}".`,
    sendEmail: true,
    emailSubject: `New Report: ${projectTitle}`,
    emailHtml: `<p>A <strong>${readableType}</strong> has been submitted for "<strong>${projectTitle}</strong>".</p>`,
  });
}
```

### Test
- Submit a progress report for any project
- Verify Director receives in-app notification + email
- Verify the notification title and message are correct
- Verify non-Director users do NOT receive this notification

---

## Phase 5: Settings Page

### Goal
Super Admin can view and edit system settings: `project_retention_years`, notification preferences.

### Files
- Modify: `frontend/src/routes/_authenticated/admin/settings/index.tsx` — build actual UI
- Modify: `backend/src/routes/settings.routes.ts` — add/update GET/PATCH endpoints

### Implementation

**Step 1: Backend — GET /settings and PATCH /settings**

```typescript
// backend/src/routes/settings.routes.ts

// GET /settings — returns current settings
app.get('/', async (c) => {
  const rows = await db.query.retentionSettings.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.settingKey] = row.settingValue;
  return c.json(settings);
});

// PATCH /settings — update settings
app.patch('/', async (c) => {
  const body = await c.req.json();
  for (const [key, value] of Object.entries(body)) {
    await db
      .insert(retentionSettings)
      .values({ settingKey: key, settingValue: String(value) })
      .onConflictDoUpdate({ target: retentionSettings.settingKey, set: { settingValue: String(value) } });
  }
  return c.json({ ok: true });
});
```

**Step 2: Frontend Settings Page**

```tsx
// frontend/src/routes/_authenticated/admin/settings/index.tsx

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [retentionYears, setRetentionYears] = useState('10');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch(`${API}/settings`);
      return res.json();
    },
  });

  useEffect(() => {
    if (settings?.project_retention_years) setRetentionYears(settings.project_retention_years);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const res = await fetch(`${API}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-bold">System Settings</h1>

      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Data Retention</h2>
        <label className="mt-2 block text-sm text-gray-600">
          Project retention period (years after closure)
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={retentionYears}
          onChange={(e) => setRetentionYears(e.target.value)}
          className="mt-1 w-32 rounded border px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-400">
          Closed projects are archived after this period. Used by the archival cron.
        </p>
        <button
          onClick={() => saveMutation.mutate({ project_retention_years: retentionYears })}
          disabled={saveMutation.isPending}
          className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </section>
    </div>
  );
}
```

### Test
- Login as Super Admin → Settings → verify form loads with current values
- Change retention years → Save → refresh page → verify value persists
- Login as non-Super Admin → verify redirect away from Settings page
- Verify audit log entry for settings change
