# DataTable Feature Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add sorting, faceted filters, column visibility, and row selection to the DataTable system.

**Architecture:** Extend `DataTable` with opt-in client-side features via boolean props. New sub-components (`DataTableColumnHeader`, `DataTableFacetedFilter`, `DataTableVisibility`, `createSelectColumn`) follow the existing `createActionsColumn` pattern. All features are backward-compatible — existing pages work without changes.

**Tech Stack:** `@tanstack/react-table` (already installed, v8.21.3), existing UI primitives (`Popover`, `Command`, `Badge`, `Checkbox`, `DropdownMenu`, `Button`).

---

## Key Design Decisions

- **Sorting:** Client-side only (`getSortedRowModel`). Sorts current page rows. No backend changes needed.
- **Filters:** Keep existing `DataTableFilter` (single-select) for server-side filters. Add `DataTableFacetedFilter` (multi-select) for client-side or server-side multi-value filters.
- **Visibility & Selection:** Managed internally by `DataTable` via `useReactTable` state. Opt-in via props.
- **Backward compatibility:** All new features disabled by default. Existing pages continue to work unchanged.

---

## Task 1: DataTableColumnHeader Component

**Files:**
- Create: `frontend/src/components/ui/data-table-column-header.tsx`

**Step 1: Create the component**

```tsx
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
	extends React.HTMLAttributes<HTMLDivElement> {
	column: Column<TData, TValue>;
	title: string;
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	className,
}: DataTableColumnHeaderProps<TData, TValue>) {
	if (!column.getCanSort()) {
		return <div className={cn(className)}>{title}</div>;
	}

	return (
		<div className={cn("flex items-center space-x-2", className)}>
			<Button
				variant="ghost"
				size="sm"
				className="-ml-3 h-8 data-[state=open]:bg-accent"
				onClick={() =>
					column.toggleSorting(column.getIsSorted() === "asc")
				}
			>
				<span>{title}</span>
				{column.getIsSorted() === "desc" ? (
					<ArrowDown className="ml-2 size-3.5" />
				) : column.getIsSorted() === "asc" ? (
					<ArrowUp className="ml-2 size-3.5" />
				) : (
					<ArrowUpDown className="ml-2 size-3.5" />
				)}
			</Button>
		</div>
	);
}
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/ui/data-table-column-header.tsx
git commit -m "feat(ui): add DataTableColumnHeader for sortable column headers"
```

---

## Task 2: DataTableFacetedFilter Component

**Files:**
- Create: `frontend/src/components/ui/data-table-faceted-filter.tsx`

**Step 1: Create the component**

Uses existing `Popover`, `Command`, `Badge`, `Button` primitives. Follows shadcn pattern.

```tsx
import { PlusCircle, XIcon } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import { cn } from "#/lib/utils";

interface DataTableFacetedFilterProps<TData, TValue> {
	column?: Column<TData, TValue>;
	title: string;
	options: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }[];
}

export function DataTableFacetedFilter<TData, TValue>({
	column,
	title,
	options,
}: DataTableFacetedFilterProps<TData, TValue>) {
	const selectedValues = new Set(column?.getFilterValue() as string[]);

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						size="sm"
						className="h-8 border-dashed border-border"
					/>
				}
			>
				<PlusCircle className="mr-2 size-3.5" />
				{title}
				{selectedValues?.size > 0 && (
					<>
						<div className="mx-2 h-4 w-px bg-border" />
						<Badge
							variant="secondary"
							className="rounded-sm px-1 font-normal lg:hidden"
						>
							{selectedValues.size}
						</Badge>
						<div className="hidden gap-1 lg:flex">
							{selectedValues.size > 2 ? (
								<Badge
									variant="secondary"
									className="rounded-sm px-1 font-normal"
								>
									{selectedValues.size} selected
								</Badge>
							) : (
								options
									.filter((option) => selectedValues.has(option.value))
									.map((option) => (
										<Badge
											variant="secondary"
											key={option.value}
											className="rounded-sm px-1 font-normal"
										>
											{option.label}
										</Badge>
									))
							)}
						</div>
					</>
				)}
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0" align="start">
				<Command>
					<CommandInput placeholder={title} />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = selectedValues.has(option.value);
								return (
									<CommandItem
										key={option.value}
										onSelect={() => {
											if (isSelected) {
												selectedValues.delete(option.value);
											} else {
												selectedValues.add(option.value);
											}
											const filterValues = Array.from(selectedValues);
											column?.setFilterValue(
												filterValues.length ? filterValues : undefined,
											);
										}}
									>
										<div
											className={cn(
												"mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
												isSelected
													? "bg-primary text-primary-foreground"
													: "opacity-50 [&_svg]:invisible",
											)}
										>
											{/* checkmark via SVG for compatibility */}
										</div>
										{option.icon && (
											<option.icon className="mr-2 size-4 text-muted-foreground" />
										)}
										<span>{option.label}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
						{selectedValues.size > 0 && (
							<>
								<div className="h-px bg-border" />
								<CommandGroup>
									<CommandItem
										onSelect={() => column?.setFilterValue(undefined)}
										className="justify-center text-center"
									>
										Clear filters
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/ui/data-table-faceted-filter.tsx
git commit -m "feat(ui): add DataTableFacetedFilter for multi-select popover filters"
```

---

## Task 3: DataTableVisibility Component

**Files:**
- Create: `frontend/src/components/ui/data-table-visibility.tsx`

**Step 1: Create the component**

```tsx
import { EyeOff, Settings2 } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

interface DataTableVisibilityProps<TData> {
	table: Table<TData>;
}

export function DataTableVisibility<TData>({
	table,
}: DataTableVisibilityProps<TData>) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						size="sm"
						className="ml-auto hidden h-8 lg:flex"
					/>
				}
			>
				<Settings2 className="mr-2 size-3.5" />
				Columns
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[150px]">
				<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{table
					.getAllColumns()
					.filter((column) => column.getCanHide())
					.map((column) => (
						<DropdownMenuCheckboxItem
							key={column.id}
							className="capitalize"
							checked={column.getIsVisible()}
							onCheckedChange={(value) =>
								column.toggleVisibility(!!value)
							}
						>
							{column.id}
						</DropdownMenuCheckboxItem>
					))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/ui/data-table-visibility.tsx
git commit -m "feat(ui): add DataTableVisibility column toggle dropdown"
```

---

## Task 4: createSelectColumn Helper

**Files:**
- Create: `frontend/src/components/custom/data-table-select-column.tsx`

**Step 1: Create the helper**

Follows existing `createActionsColumn` pattern from `data-table-columns.tsx`.

```tsx
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";

export function createSelectColumn<TData>(): DataTableColumnDef<TData> {
	return {
		id: "select",
		header: ({ table }) => (
			<div className="flex justify-center">
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) =>
						table.toggleAllPageRowsSelected(!!value)
					}
					aria-label="Select all"
				/>
			</div>
		),
		headerClassName: "w-[50px] px-4 text-center",
		cellClassName: "px-4 text-center",
		cell: ({ row }) => (
			<div className="flex justify-center">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label={`Select row`}
				/>
			</div>
		),
		enableSorting: false,
		enableHiding: false,
	};
}
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/custom/data-table-select-column.tsx
git commit -m "feat(ui): add createSelectColumn helper for row selection checkboxes"
```

---

## Task 5: Enhance DataTable with Feature States

**Files:**
- Modify: `frontend/src/components/ui/data-table.tsx`

**Step 1: Add optional state props to DataTable**

Extend `DataTableProps` with:
```ts
interface DataTableProps<TData, TValue> {
	// ... existing props ...

	// Sorting (client-side)
	sorting?: SortingState;
	onSortingChange?: (sorting: SortingState) => void;

	// Column visibility (client-side)
	columnVisibility?: VisibilityState;
	onColumnVisibilityChange?: (visibility: VisibilityState) => void;

	// Row selection (client-side)
	rowSelection?: RowSelectionState;
	onRowSelectionChange?: (selection: RowSelectionState) => void;

	// Feature flags
	enableSorting?: boolean;
	enableSelection?: boolean;
	enableVisibility?: boolean;
}
```

**Step 2: Wire up useReactTable with new states**

When feature flags are enabled and state is provided, add the corresponding models and state to `useReactTable`:

```ts
const table = useReactTable({
	data,
	columns,
	getCoreRowModel: getCoreRowModel(),

	// Sorting
	...(enableSorting && {
		onSortingChange: (updater) => {
			const newSorting =
				typeof updater === "function"
					? updater(sorting ?? [])
					: updater;
			onSortingChange?.(newSorting);
		},
		getSortedRowModel: getSortedRowModel(),
		state: { sorting: sorting ?? [] },
	}),

	// Visibility
	...(enableVisibility && {
		onColumnVisibilityChange: (updater) => {
			const newVisibility =
				typeof updater === "function"
					? updater(columnVisibility ?? {})
					: updater;
			onColumnVisibilityChange?.(newVisibility);
		},
		state: { columnVisibility: columnVisibility ?? {} },
	}),

	// Selection
	...(enableSelection && {
		onRowSelectionChange: (updater) => {
			const newSelection =
				typeof updater === "function"
					? updater(rowSelection ?? {})
					: updater;
			onRowSelectionChange?.(newSelection);
		},
		enableRowSelection: true,
		state: { rowSelection: rowSelection ?? {} },
	}),
});
```

**Step 3: Expose table instance**

Add `table` to the return or provide it via a render prop. For backward compatibility, add an optional `onTableReady` callback prop:

```ts
// In DataTableProps:
onTableReady?: (table: Table<TData>) => void;

// In useEffect after table creation:
useEffect(() => {
	onTableReady?.(table);
}, [table, onTableReady]);
```

**Step 4: Handle selected count in footer (when selection enabled)**

Add to the render, after `</Table>`:
```tsx
{enableSelection && (
	<div className="flex-1 text-sm text-muted-foreground px-2 py-2">
		{table.getFilteredSelectedRowModel().rows.length} of{" "}
		{table.getFilteredRowModel().rows.length} row(s) selected.
	</div>
)}
```

**Step 5: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty`
Expected: No errors (backward compatible — existing callers pass no new props)

**Step 6: Commit**

```bash
git add frontend/src/components/ui/data-table.tsx
git commit -m "feat(ui): enhance DataTable with optional sorting, visibility, and selection states"
```

---

## Task 6: Migrate Project Hub Page (Sorting + Visibility)

**Files:**
- Modify: `frontend/src/features/director/project-hub-page.tsx`

**Step 1: Add sorting and visibility state**

```ts
const [sorting, setSorting] = React.useState<SortingState>([]);
const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
```

**Step 2: Update column definitions to use DataTableColumnHeader**

Replace string headers with:
```ts
{
	id: "title",
	header: ({ column }) => (
		<DataTableColumnHeader column={column} title="Project Title" />
	),
	// ...
}
```

Add `enableSorting: false` to the `actions` column (via `createActionsColumn` update or inline).

**Step 3: Pass props to DataTablePage**

```tsx
<DataTablePage
	// ... existing props
	sorting={sorting}
	onSortingChange={setSorting}
	columnVisibility={columnVisibility}
	onColumnVisibilityChange={setColumnVisibility}
	enableSorting
	enableVisibility
/>
```

**Step 4: Update DataTablePage to accept and pass through new props**

Add to `DataTablePageProps` and pass through to `DataTable`.

**Step 5: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty`

**Step 6: Commit**

```bash
git add frontend/src/features/director/project-hub-page.tsx frontend/src/components/custom/data-table-page.tsx
git commit -m "feat(project-hub): add column sorting and visibility toggle"
```

---

## Task 7: Migrate Users Page (Selection)

**Files:**
- Modify: `frontend/src/features/admin/users-page.tsx`

**Step 1: Add selection state**

```ts
const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
```

**Step 2: Add select column to columns array**

```ts
import { createSelectColumn } from "@/components/custom/data-table-select-column";

const columns: DataTableColumnDef<UserResponse>[] = [
	createSelectColumn(),
	// ... existing columns
];
```

**Step 3: Pass selection props to DataTablePage**

```tsx
<DataTablePage
	// ... existing props
	rowSelection={rowSelection}
	onRowSelectionChange={setRowSelection}
	enableSelection
/>
```

**Step 4: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty`

**Step 5: Commit**

```bash
git add frontend/src/features/admin/users-page.tsx
git commit -m "feat(users): add row selection with checkboxes"
```

---

## Task 8: Update createActionsColumn to Accept enableSorting

**Files:**
- Modify: `frontend/src/components/custom/data-table-columns.tsx`

**Step 1: Add enableSorting: false by default**

```ts
return {
	id: "actions",
	header: "",
	headerClassName: "w-[50px]",
	cellClassName: "px-4 py-3 text-right",
	enableSorting: false,  // <-- add this
	cell: options?.cell ?? ...
};
```

**Step 2: Commit**

```bash
git add frontend/src/components/custom/data-table-columns.tsx
git commit -m "fix(ui): disable sorting on actions column by default"
```

---

## Task 9: Migrate Remaining Pages (Optional Features)

Apply sorting/visibility to remaining pages that benefit from it:

**Files to modify:**
- `frontend/src/features/director/faculty-directory-page.tsx` — sorting
- `frontend/src/features/ret/project-monitoring-page.tsx` — sorting + visibility
- `frontend/src/features/ret/ret-dashboard-page.tsx` — sorting + visibility
- `frontend/src/features/director/moa-repository-page.tsx` — sorting
- `frontend/src/features/admin/activity-log-page.tsx` — sorting

**For each page:**
1. Add `useState<SortingState>` and `useState<VisibilityState>`
2. Update column headers to use `DataTableColumnHeader`
3. Pass `sorting`, `onSortingChange`, `columnVisibility`, `onColumnVisibilityChange`, `enableSorting`, `enableVisibility` to `DataTablePage`

**Commit per page or batch:**

```bash
git add frontend/src/features/...
git commit -m "feat(ui): add sorting and visibility to remaining data tables"
```

---

## Task 10: Update DataTablePage Props

**Files:**
- Modify: `frontend/src/components/custom/data-table-page.tsx`

**Step 1: Add all new props to DataTablePageProps**

```ts
interface DataTablePageProps<TData> {
	// ... existing props ...

	// Sorting
	sorting?: SortingState;
	onSortingChange?: (sorting: SortingState) => void;
	enableSorting?: boolean;

	// Column visibility
	columnVisibility?: VisibilityState;
	onColumnVisibilityChange?: (visibility: VisibilityState) => void;
	enableVisibility?: boolean;

	// Row selection
	rowSelection?: RowSelectionState;
	onRowSelectionChange?: (selection: RowSelectionState) => void;
	enableSelection?: boolean;

	// Table instance callback
	onTableReady?: (table: Table<TData>) => void;
}
```

**Step 2: Pass through to DataTable**

```tsx
<DataTable
	columns={columns}
	data={data}
	isLoading={isLoading}
	emptyMessage={emptyMessage}
	ariaLabel={ariaLabel}
	onRowClick={onRowClick}
	activeFilters={activeFilters}
	sorting={sorting}
	onSortingChange={onSortingChange}
	enableSorting={enableSorting}
	columnVisibility={columnVisibility}
	onColumnVisibilityChange={onColumnVisibilityChange}
	enableVisibility={enableVisibility}
	rowSelection={rowSelection}
	onRowSelectionChange={onRowSelectionChange}
	enableSelection={enableSelection}
	onTableReady={onTableReady}
/>
```

**Step 3: Render DataTableVisibility when onTableReady is available**

Add a visibility toggle button next to the filters:

```tsx
{enableVisibility && table && (
	<DataTableVisibility table={table} />
)}
```

This requires storing the table instance in state:
```ts
const [table, setTable] = React.useState<Table<TData> | null>(null);
```

**Step 4: Commit**

```bash
git add frontend/src/components/custom/data-table-page.tsx
git commit -m "feat(data-table-page): pass through sorting, visibility, selection props to DataTable"
```

---

## Verification Checklist

After all tasks:

1. `cd frontend && npx tsc --noEmit --pretty` — no type errors
2. `cd frontend && npx @biomejs/biome lint src` — no new lint issues
3. Manual test: Project Hub page shows sortable column headers, clicking toggles sort
4. Manual test: Users page shows checkboxes, selecting rows shows count
5. Manual test: Column visibility dropdown appears and toggles columns
6. Manual test: Existing pages without new props still render correctly (backward compatible)
7. `git status` — no untracked files left
