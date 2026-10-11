import { ListFilter } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AuditFilterOptions, AuditLogFilters } from "./functions";

interface ActivityLogFiltersProps {
	filters: AuditLogFilters;
	options?: AuditFilterOptions;
	onApply: (filters: AuditLogFilters) => void;
}

export function ActivityLogFilters({ filters, options, onApply }: ActivityLogFiltersProps) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(filters);
	const invalidDates = Boolean(draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo);
	const filterCount = Object.values(filters).filter(Boolean).length;
	function update<K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) {
		setDraft((current) => ({ ...current, [key]: value || undefined }));
	}
	function apply(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (invalidDates) return;
		onApply(draft);
		setOpen(false);
	}
	const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
	return (
		<Popover open={open} onOpenChange={(value) => {
			if (value) setDraft(filters);
			setOpen(value);
		}}>
			<PopoverTrigger render={<Button variant="outline" aria-label="Filter activity log" />}>
				<ListFilter className="size-4" />
				{filterCount > 0 && <span>{filterCount}</span>}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[340px] max-h-[80vh] overflow-y-auto">
				<form onSubmit={apply} className="space-y-4">
					<h3 className="text-sm font-semibold">Activity Filters</h3>
					<div className="grid grid-cols-2 gap-3">
						<Field>
							<FieldLabel htmlFor="audit-date-from">From (UTC)</FieldLabel>
							<Input id="audit-date-from" type="date" value={draft.dateFrom ?? ""} max={draft.dateTo} onChange={(event) => update("dateFrom", event.target.value)} />
						</Field>
						<Field>
							<FieldLabel htmlFor="audit-date-to">Through (UTC)</FieldLabel>
							<Input id="audit-date-to" type="date" value={draft.dateTo ?? ""} min={draft.dateFrom} onChange={(event) => update("dateTo", event.target.value)} />
						</Field>
					</div>
					{invalidDates && <p role="alert" className="text-sm text-destructive">The start date must not be after the end date.</p>}
					<Field>
						<FieldLabel htmlFor="audit-action-type">Action Type</FieldLabel>
						<select id="audit-action-type" className={selectClass} value={draft.actionType ?? ""} onChange={(event) => update("actionType", event.target.value as AuditLogFilters["actionType"])}>
							<option value="">All types</option>
							{["Approval", "Upload", "Login", "Status", "Account", "System"].map((type) => <option key={type} value={type}>{type}</option>)}
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor="audit-user">Performed By</FieldLabel>
						<select id="audit-user" className={selectClass} value={draft.userId ?? ""} onChange={(event) => update("userId", event.target.value)}>
							<option value="">All users</option>
							{options?.users.map((user) => <option key={user.userId} value={user.userId}>{user.name} ({user.email})</option>)}
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor="audit-module">Module</FieldLabel>
						<select id="audit-module" className={selectClass} value={draft.module ?? ""} onChange={(event) => update("module", event.target.value)}>
							<option value="">All modules</option>
							{options?.modules.map((module) => <option key={module} value={module}>{module.replaceAll("_", " ")}</option>)}
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor="audit-action">Action Contains</FieldLabel>
						<Input id="audit-action" value={draft.action ?? ""} maxLength={255} onChange={(event) => update("action", event.target.value)} />
					</Field>
					<div className="flex justify-between gap-2">
						<Button type="button" variant="outline" onClick={() => {
							setDraft({}); onApply({}); setOpen(false);
						}}>Clear</Button>
						<Button type="submit" disabled={invalidDates}>Apply Filters</Button>
					</div>
				</form>
			</PopoverContent>
		</Popover>
	);
}
