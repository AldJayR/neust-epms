# Adopt SearchInput Across All List Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace duplicated search bar patterns in 8 files with the new `SearchInput` component from `@/components/ui/search-input`.

**Architecture:** Replace inline search bars with the reusable `SearchInput` component. For form-submit pages, remove form wrapper and handleSearchSubmit. For debounce pages, remove debounceRef and debouncedSearch. For immediate pages, use setSearch directly. For bulk-approve-dialog, use dispatch with SET_SEARCH.

**Tech Stack:** React, TypeScript, SearchInput component with built-in debounce (300ms default)

---

### Task 1: Update users-page.tsx

**Files:**
- Modify: `frontend/src/features/admin/users-page.tsx:97-163`

**Step 1: Remove handleSearchSubmit function**
Remove lines 97-100:
```tsx
const handleSearchSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  onSearch(searchInput || undefined);
};
```

**Step 2: Replace form wrapper with SearchInput**
Replace lines 151-163 with:
```tsx
<SearchInput
  value={searchInput}
  onChange={(val) => onSearch(val || undefined)}
  placeholder="Search users"
  ariaLabel="Search users"
  className="max-w-[352px]"
/>
```

**Step 3: Remove Search and Input imports if no longer used**
Check if Search and Input are used elsewhere in the file. If not, remove them from imports.

**Step 4: Add SearchInput import**
Add to imports:
```tsx
import { SearchInput } from "@/components/ui/search-input";
```

**Step 5: Commit**
```bash
git add frontend/src/features/admin/users-page.tsx
git commit -m "refactor: adopt SearchInput in users-page"
```

---

### Task 2: Update activity-log-page.tsx

**Files:**
- Modify: `frontend/src/features/admin/activity-log-page.tsx:96-152`

**Step 1: Remove handleSearchSubmit function**
Remove lines 96-99.

**Step 2: Replace form wrapper with SearchInput**
Replace lines 140-152 with:
```tsx
<SearchInput
  value={searchInput}
  onChange={(val) => onSearch(val || undefined)}
  placeholder="Search by users or email"
  ariaLabel="Search activity log"
  className="max-w-[352px]"
/>
```

**Step 3: Remove unused imports**
Remove Search and Input if not used elsewhere.

**Step 4: Add SearchInput import**

**Step 5: Commit**
```bash
git add frontend/src/features/admin/activity-log-page.tsx
git commit -m "refactor: adopt SearchInput in activity-log-page"
```

---

### Task 3: Update moa-repository-page.tsx

**Files:**
- Modify: `frontend/src/features/director/moa-repository-page.tsx:107-165`

**Step 1: Remove debounceRef and debouncedSearch**
Remove lines 107-112:
```tsx
const [localSearch, setLocalSearch] = useState(search ?? "");
const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
const debouncedSearch = (value: string) => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => onSearchChange(value), 300);
};
```

**Step 2: Replace input with SearchInput**
Replace lines 152-165 with:
```tsx
<SearchInput
  value={search}
  onChange={onSearchChange}
  placeholder="Search MOAs"
  ariaLabel="Search MOAs"
  className="max-w-[352px]"
/>
```

**Step 3: Remove unused imports**
Remove Search, Input, and useRef if not used elsewhere.

**Step 4: Add SearchInput import**

**Step 5: Commit**
```bash
git add frontend/src/features/director/moa-repository-page.tsx
git commit -m "refactor: adopt SearchInput in moa-repository-page"
```

---

### Task 4: Update faculty-directory-page.tsx

**Files:**
- Modify: `frontend/src/features/director/faculty-directory-page.tsx:64-138`

**Step 1: Remove debounceRef and debouncedSearch**
Remove lines 64-69.

**Step 2: Replace input with SearchInput**
Replace lines 125-138 with:
```tsx
<SearchInput
  value={search}
  onChange={onSearchChange}
  placeholder="Search by project title or faculty name..."
  ariaLabel="Search faculty directory"
  className="max-w-[352px]"
/>
```

**Step 3: Remove unused imports**

**Step 4: Add SearchInput import**

**Step 5: Commit**
```bash
git add frontend/src/features/director/faculty-directory-page.tsx
git commit -m "refactor: adopt SearchInput in faculty-directory-page"
```

---

### Task 5: Update project-hub-page.tsx

**Files:**
- Modify: `frontend/src/features/director/project-hub-page.tsx:116-154`

**Step 1: Remove debounceRef and debouncedSearch**
Remove lines 116-121.

**Step 2: Replace input with SearchInput**
Replace lines 141-154 with:
```tsx
<SearchInput
  value={search}
  onChange={onSearchChange}
  placeholder="Search by project title or faculty name..."
  ariaLabel="Search projects"
  className="max-w-[352px]"
/>
```

**Step 3: Remove unused imports**

**Step 4: Add SearchInput import**

**Step 5: Commit**
```bash
git add frontend/src/features/director/project-hub-page.tsx
git commit -m "refactor: adopt SearchInput in project-hub-page"
```

---

### Task 6: Update reports-page.tsx

**Files:**
- Modify: `frontend/src/features/director/reports-page.tsx:44,88-98`

**Step 1: Replace input with SearchInput**
Replace lines 88-98 with:
```tsx
<SearchInput
  value={search}
  onChange={(val) => setSearch(val)}
  placeholder="Search reports"
  ariaLabel="Search reports"
  className="max-w-[352px]"
/>
```

**Step 2: Remove unused imports**

**Step 3: Add SearchInput import**

**Step 4: Commit**
```bash
git add frontend/src/features/director/reports-page.tsx
git commit -m "refactor: adopt SearchInput in reports-page"
```

---

### Task 7: Update ret-dashboard-page.tsx

**Files:**
- Modify: `frontend/src/features/ret/ret-dashboard-page.tsx:65,76-79,135-148`

**Step 1: Remove handleSearchSubmit function**
Remove lines 76-79.

**Step 2: Replace form wrapper with SearchInput**
Replace lines 135-148 with:
```tsx
<SearchInput
  value={searchInput}
  onChange={(val) => onSearch(val || undefined)}
  placeholder="Search by project proposals"
  ariaLabel="Search by project proposals"
  className="max-w-[352px]"
/>
```

**Step 3: Remove unused imports**

**Step 4: Add SearchInput import**

**Step 5: Commit**
```bash
git add frontend/src/features/ret/ret-dashboard-page.tsx
git commit -m "refactor: adopt SearchInput in ret-dashboard-page"
```

---

### Task 8: Update bulk-approve-dialog.tsx

**Files:**
- Modify: `frontend/src/features/admin/bulk-approve-dialog.tsx:244-255`

**Step 1: Replace input with SearchInput**
Replace lines 244-255 with:
```tsx
<SearchInput
  value={search}
  onChange={(val) => dispatch({ type: "SET_SEARCH", payload: val })}
  placeholder="Search users"
  ariaLabel="Search pending users"
/>
```

**Step 2: Remove unused imports**

**Step 3: Add SearchInput import**

**Step 4: Commit**
```bash
git add frontend/src/features/admin/bulk-approve-dialog.tsx
git commit -m "refactor: adopt SearchInput in bulk-approve-dialog"
```

---

### Task 9: Final commit with all changes

**Step 1: Run final commit**
```bash
git add -A
git commit -m "refactor: adopt SearchInput across all list pages"
```

**Step 2: Verify no lint/typecheck errors**
Run:
```bash
npm run lint
npm run typecheck
```
Expected: No errors.

**Step 3: Test each page manually**
Verify search functionality works as expected on all pages.

---

**Plan complete and saved to `docs/plans/2026-06-16-adopt-searchinput.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**