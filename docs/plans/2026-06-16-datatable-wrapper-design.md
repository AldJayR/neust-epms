# DataTable Wrapper Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a reusable DataTable wrapper component that handles loading, empty, and error states consistently across all list pages.

**Architecture:** Generic TypeScript component using render props pattern. Wraps shadcn Table components with consistent state handling. Supports background refetch by showing data + loading spinner.

**Tech Stack:** React, TypeScript, shadcn/ui Table components, lucide-react Loader2

---

## Task 1: Create DataTable Component

**Files:**
- Create: `frontend/src/components/ui/data-table.tsx`

**Step 1: Create the component file**

Create `frontend/src/components/ui/data-table.tsx` with the following content:

```tsx
import { Loader2 } from "lucide-react";
import type * as React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableColumn<T> {
  key: string;
  label: string;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  emptyMessage?: string;
  errorMessage?: string;
  colSpan: number;
  showHeader?: boolean;
  className?: string;
  ariaLabel?: string;
}

function DataTable<T>({
  columns,
  data,
  renderRow,
  isLoading = false,
  isEmpty = false,
  error = null,
  emptyMessage = "No records found",
  errorMessage = "Something went wrong",
  colSpan,
  showHeader = true,
  className,
  ariaLabel,
}: DataTableProps<T>) {
  const showLoading = isLoading && data.length === 0;
  const showEmpty = !isLoading && !error && (isEmpty || data.length === 0);
  const showData = data.length > 0;
  const showBackgroundLoading = isLoading && data.length > 0;

  return (
    <Table aria-label={ariaLabel} className={className}>
      {showHeader && (
        <TableHeader>
          <TableRow className="border-b-[#e5e5e5] hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      )}
      <TableBody>
        {showLoading && (
          <TableRow>
            <TableCell colSpan={colSpan} className="h-24 text-center">
              <Loader2
                className="mx-auto size-6 animate-spin text-[#11215a]"
                role="status"
                aria-label={ariaLabel || "Loading"}
              />
            </TableCell>
          </TableRow>
        )}
        {showEmpty && (
          <TableRow>
            <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
        {error && (
          <TableRow>
            <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
              {errorMessage}
            </TableCell>
          </TableRow>
        )}
        {showData && data.map((item, index) => renderRow(item, index))}
        {showBackgroundLoading && (
          <TableRow>
            <TableCell colSpan={colSpan} className="h-24 text-center">
              <Loader2
                className="mx-auto size-6 animate-spin text-[#11215a]"
                role="status"
                aria-label={ariaLabel || "Loading"}
              />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export { DataTable, type DataTableColumn, type DataTableProps };
```

**Step 2: Verify file was created**

Run: `ls frontend/src/components/ui/data-table.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add frontend/src/components/ui/data-table.tsx
git commit -m "feat: add reusable DataTable wrapper with loading/empty/error states"
```

---

## Implementation Notes

### Interface Definition

The component uses TypeScript generics to work with any data type:

```tsx
interface DataTableColumn<T> {
  key: string;      // Unique identifier for the column
  label: string;    // Display label in header
  className?: string; // Optional CSS classes for the header cell
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];  // Column definitions for header
  data: T[];                      // Array of data items
  renderRow: (item: T, index: number) => React.ReactNode; // Render function for each row
  isLoading?: boolean;            // Loading state
  isEmpty?: boolean;              // Force empty state
  error?: string | null;          // Error message
  emptyMessage?: string;          // Custom empty state message
  errorMessage?: string;          // Custom error message
  colSpan: number;                // Column span for state rows
  showHeader?: boolean;           // Show/hide header (default: true)
  className?: string;             // Additional classes for Table
  ariaLabel?: string;             // Accessibility label
}
```

### State Handling Logic

Priority order:
1. **Initial loading**: `isLoading=true` AND `data.length=0` → Show spinner
2. **Error state**: `error` is truthy → Show error message
3. **Empty state**: `data.length=0` (or `isEmpty=true`) → Show empty message
4. **Data state**: `data.length>0` → Map through data with `renderRow`
5. **Background refetch**: `isLoading=true` AND `data.length>0` → Show data + loading row

### Key Design Decisions

1. **Generic component**: Uses TypeScript generics to work with any data type
2. **Render prop pattern**: `renderRow` gives full control over row rendering
3. **Background refetch support**: Shows data + loading spinner when refetching
4. **Consistent styling**: Uses the same styling patterns as existing pages
5. **Accessible**: Includes `aria-label` and `role="status"` for loading state
6. **Flexible header**: `showHeader` prop allows hiding header when needed

### Usage Example

```tsx
<DataTable
  columns={[
    { key: "partnerOrganization", label: "Partner Organization", className: "w-[320px]" },
    { key: "dateSigned", label: "Date Signed", className: "text-center" },
    { key: "daysToExpiry", label: "Days to Expiry", className: "text-center" },
    { key: "status", label: "Status", className: "text-center" },
    { key: "actions", label: "", className: "w-[50px]" },
  ]}
  data={items}
  renderRow={(moa) => (
    <TableRow key={moa.id} className="border-b border-[#ebebeb] py-2 hover:bg-[#fcfcfc]">
      <TableCell className="px-4 py-3 text-[14px] font-semibold text-[#0a0a0a]">
        {moa.partnerOrganization}
      </TableCell>
      {/* ... other cells */}
    </TableRow>
  )}
  isLoading={isLoading}
  error={error}
  emptyMessage="No MOAs found."
  colSpan={5}
  ariaLabel="Memoranda of Agreements"
/>
```
