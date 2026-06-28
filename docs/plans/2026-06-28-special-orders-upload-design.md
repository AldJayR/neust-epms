# Special Orders Upload — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline special order (SO) document upload per project member on the project details page. Supports dual workflow: Director prepares SOs officially, or Project Leader prepares them informally — either can upload.

**Architecture:** Extend existing backend `special-orders.routes.ts` with a file upload endpoint, extend the project details endpoint to include SO data per member, and enhance the existing members dialog in `project-details-page.tsx` with inline upload controls.

**Tech Stack:** Hono (`@hono/zod-openapi`), Supabase Storage, TanStack Query v5, React 19, shadcn `Input` + `Button`, existing `file-upload` dropzone component.

**Constraints:** PDF only, max 50MB, SO number required and unique, upload visible to Director + Project Leader only.

---

## Key Design Decisions

- **Inline upload (no modal):** Each member row in the dialog shows a compact form with SO# input + file picker directly in the row. Confirmed with user to reduce friction.
- **Extend existing project details endpoint** (`GET /director/projects/{proposalId}`) to include `specialOrder` per member rather than a separate API call. Single request fetches everything.
- **Backend multipart upload** follows existing `storage.routes.ts` pattern: `c.req.formData()` → manual validation → Supabase Storage → DB insert → audit log.
- **Query invalidation** after upload mutation success: `queryClient.invalidateQueries({ queryKey: ['dashboard', 'proposals', proposalId] })` to refetch project details.
- **Permission check in handler:** Director role (middleware) OR Project Leader (DB lookup: user is `proposal_members.projectRole === 'Project Leader'` for the proposal the target member belongs to).

---

## Data Flow

```
Members Dialog → user enters SO# + picks PDF
  → uploadSpecialOrderFn (server function)
    → POST /api/v1/special-orders/upload (multipart: file + memberId + soNumber)
      → Validate: PDF, max 50MB, non-empty
      → Permission check: Director OR Project Leader of this proposal
      → Upload to Supabase Storage: documents/special-orders/{memberId}/{uuid}_{sanitizedFilename}
      → Insert/update special_orders record
      → Insert audit log
      → Return { specialOrderId, soNumber, storagePath }
    ← Response
  → queryClient.invalidateQueries(['dashboard', 'proposals', proposalId])
  → Dialog refreshes with updated SO status
```

---

## Backend Changes

### 1. New upload endpoint: `POST /special-orders/upload`

**File:** `backend/src/routes/special-orders.routes.ts`

Route definition (no `request.body` schema — multipart not easily representable in OpenAPI, following existing pattern):

| Aspect | Detail |
|--------|--------|
| Method | `POST` |
| Path | `/special-orders/upload` |
| Auth | `authMiddleware` + role check |
| Request | multipart/form-data: `file` (PDF), `memberId` (UUID), `soNumber` (string) |
| Response 201 | `{ specialOrderId, memberId, soNumber, storagePath, status }` |
| Errors | 400 (invalid file), 404 (member not found), 409 (duplicate SO#), 413 (too large), 422 (wrong type), 500 |

Upload flow:
1. `c.req.formData()` → extract `file`, `memberId`, `soNumber`
2. Validate: `file instanceof File`, `file.size > 0`, `file.size <= 50MB`, `file.type === 'application/pdf'`
3. Verify member exists in `proposal_members`
4. Permission check: user.roleName === DIRECTOR OR user is Project Leader of the member's proposal
5. Generate storage path: `special-orders/${memberId}/${Date.now()}_${uuid}_${sanitizedFilename}`
6. Upload to Supabase `documents` bucket
7. Check if a special_orders record already exists for this member:
   - If yes: update `storagePath`, `soNumber`, `status`
   - If no: insert new record
8. Compensating transactions: if DB fails, delete uploaded file
9. Insert audit log
10. Return created/updated record

### 2. New signed URL endpoint: `GET /special-orders/{id}/url`

**File:** `backend/src/routes/special-orders.routes.ts`

| Aspect | Detail |
|--------|--------|
| Method | `GET` |
| Path | `/special-orders/{id}/url` |
| Auth | `authMiddleware` |
| Response 200 | `{ url: string }` (signed URL, 1hr expiry) |

Flow:
1. Look up special_order by ID, verify not archived
2. If `storagePath` is null, return 404
3. `supabase.storage.from("documents").createSignedUrl(storagePath, 3600)`
4. Return signed URL
5. Audit log the access

### 3. Extend project details endpoint

**File:** `backend/src/routes/director.routes.ts`

In the `GET /director/projects/{proposalId}` handler, add a query to join special_orders data:

```typescript
// In the Promise.all array, add:
db
  .select({
    memberId: specialOrders.memberId,
    specialOrderId: specialOrders.specialOrderId,
    soNumber: specialOrders.soNumber,
    storagePath: specialOrders.storagePath,
    dateIssued: specialOrders.dateIssued,
    status: specialOrders.status,
  })
  .from(specialOrders)
  .where(isNull(specialOrders.archivedAt))
```

Build a `Map<memberId, SpecialOrderRecord>` and merge into each member object in the response:

```typescript
const members = memberRows.map((m) => ({
  userId: m.userId,
  name: `${m.firstName} ${m.lastName}`,
  role: m.role,
  specialOrder: specialOrderMap.get(m.memberId) ?? null,
}));
```

Update the `ProjectDetailsMemberSchema` to include optional `specialOrder` field.

---

## Frontend Types

### Extend `ProjectMember` interface

**File:** `frontend/src/lib/dashboard.functions.ts`

```typescript
export interface ProjectMemberSpecialOrder {
  specialOrderId: string;
  soNumber: string;
  storagePath: string | null;
  dateIssued: string | null;
  status: string;
}

export interface ProjectMember {
  userId: string;
  name: string;
  role: string;
  avatarUrl?: string;
  specialOrder?: ProjectMemberSpecialOrder | null;
}
```

### New server function

```typescript
const uploadSpecialOrderFn = createServerFn({ method: "POST" })
  .validator(z.void())  // FormData, no JSON validation
  .handler(async ({ data }) => {
    // This won't work with FormData via TanStack Start server functions
    // Instead, use fetch() directly with the token
  });
```

**Important:** TanStack Start's `createServerFn` doesn't natively support FormData in its validator. The upload will use a direct `fetch()` call from the component with the auth token, bypassing the server function wrapping. This is the same approach used in the codebase for the existing proposal document upload.

---

## Frontend Changes

### 1. Enhance Members Dialog

**File:** `frontend/src/features/director/project-details-page.tsx`

Current state: `ProjectOverviewCard` renders a `Dialog` with `members.map()` showing avatar + name + role (read-only).

New state: Each member row conditionally renders upload controls based on:
- Does the member already have a special order? → show SO#, status, "View" button
- Is the current user authorized (Director OR Project Leader)? → show upload controls
- Neither → show read-only status text

**Row layout (no SO, authorized):**
```tsx
<div className="flex items-center gap-2">
  <Input
    type="text"
    placeholder="SO number"
    className="h-8 w-[140px] text-xs"
    value={soNumber}
    onChange={(e) => setSoNumber(e.target.value)}
  />
  <Input
    type="file"
    accept=".pdf"
    className="h-8 w-[140px] text-xs file:h-6 file:text-xs"
    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
  />
  <Button
    size="sm"
    className="h-8 text-xs"
    disabled={!soNumber || !file || isUploading}
    onClick={() => handleUpload(member)}
  >
    {isUploading ? "Uploading..." : "Upload"}
  </Button>
</div>
```

**Row layout (SO exists):**
```tsx
<div className="flex items-center gap-2">
  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
    {member.specialOrder.soNumber}
  </Badge>
  <Button
    size="sm"
    variant="outline"
    className="h-8 text-xs"
    onClick={() => viewSpecialOrder(member.specialOrder!.specialOrderId)}
  >
    <Eye className="mr-1 size-3" />
    View
  </Button>
</div>
```

**Row layout (no SO, unauthorized):**
```tsx
<span className="text-xs text-muted-foreground">No special order uploaded</span>
```

### 2. Upload Mutation

Inside the member dialog component, use `useMutation`:

```typescript
const queryClient = useQueryClient();

const uploadMutation = useMutation({
  mutationFn: async ({ memberId, soNumber, file }: { memberId: string; soNumber: string; file: File }) => {
    const token = await getValidAccessToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("memberId", memberId);
    formData.append("soNumber", soNumber);

    const response = await fetch(`${API_BASE}/special-orders/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message ?? "Upload failed");
    }

    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard", "proposals", proposalId] });
  },
});
```

### 3. View Special Order (Signed URL)

```typescript
const viewSpecialOrder = async (specialOrderId: string) => {
  const token = await getValidAccessToken();
  const response = await fetch(`${API_BASE}/special-orders/${specialOrderId}/url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  window.open(data.url, "_blank", "noopener,noreferrer");
};
```

---

## UX States

| State | Appearance |
|-------|-----------|
| **No SO, authorized user** | SO# input + "Choose File" + "Upload" button |
| **Uploading** | "Uploading..." disabled button, spinner |
| **Upload error** | Toast/alert with error message (duplicate SO#, file too large, etc.) |
| **Upload success** | Row auto-refreshes to "Uploaded" state |
| **SO exists** | Green badge with SO# + "View" button to open PDF |
| **No SO, unauthorized user** | Gray "No special order" text (read-only) |
| **View loading** | Opens PDF in new tab (may take a moment for signed URL generation) |

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/routes/special-orders.routes.ts` | Add `POST /special-orders/upload` and `GET /special-orders/{id}/url` endpoints |
| `backend/src/routes/director.routes.ts` | Join `special_orders` in project details query, include in response |
| `frontend/src/lib/dashboard.functions.ts` | Extend `ProjectMember` with optional `specialOrder`; add upload server function |
| `frontend/src/features/director/project-details-page.tsx` | Enhance members dialog with inline upload controls, status badges, view button |

---

## Verification Checklist

1. `cd backend && npx tsc --noEmit --pretty` — no type errors
2. `cd frontend && npx tsc --noEmit --pretty` — no type errors
3. Manual: Open project details page → click "Project Team" → verify existing members show "No special order"
4. Manual: As Director, upload a PDF + SO# for a member → verify row updates to show SO# + "View"
5. Manual: Click "View" → verify signed URL opens PDF in new tab
6. Manual: As Project Leader, verify you can upload for any member of your project
7. Manual: As unauthorized Faculty (non-leader), verify members dialog shows read-only status
8. Manual: Upload duplicate SO# → verify error message
9. Manual: Upload non-PDF file → verify error message
10. Manual: Upload >50MB file → verify error message
