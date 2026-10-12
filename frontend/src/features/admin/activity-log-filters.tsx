import { ListFilter } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
						<Select
							value={draft.actionType || "__all__"}
							onValueChange={(value) =>
								update(
									"actionType",
									(value === "__all__" ? "" : value) as AuditLogFilters["actionType"],
								)
							}
						>
							<SelectTrigger id="audit-action-type" className="w-full">
								<SelectValue placeholder="All types">
									{(value) =>
										value && value !== "__all__" ? value : "All types"
									}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">All types</SelectItem>
								{["Approval", "Upload", "Login", "Status", "Account", "System"].map((type) => (
									<SelectItem key={type} value={type}>{type}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor="audit-user">Performed By</FieldLabel>
						<Select
							value={draft.userId || "__all__"}
							onValueChange={(value) =>
								update("userId", value === "__all__" ? "" : (value ?? ""))
							}
						>
							<SelectTrigger id="audit-user" className="w-full">
								<SelectValue placeholder="All users">
									{(value) => {
										if (!value || value === "__all__") return "All users";
										const user = options?.users.find(
											(user) => user.userId === value,
										);
										return user
											? `${user.name} (${user.email})`
											: "Selected user";
									}}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">All users</SelectItem>
								{options?.users.map((user) => (
									<SelectItem key={user.userId} value={user.userId}>
										{user.name} ({user.email})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor="audit-module">Module</FieldLabel>
						<Select
							value={draft.module || "__all__"}
							onValueChange={(value) =>
								update("module", value === "__all__" ? "" : (value ?? ""))
							}
						>
							<SelectTrigger id="audit-module" className="w-full">
								<SelectValue placeholder="All modules">
									{(value) =>
										value && value !== "__all__"
											? value.replaceAll("_", " ")
											: "All modules"
									}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">All modules</SelectItem>
								{options?.modules.map((module) => (
									<SelectItem key={module} value={module}>
										{module.replaceAll("_", " ")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
