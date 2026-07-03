import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "#/lib/utils";
import {
	activateProjectFn,
	getActiveMoasFn,
} from "@/lib/dashboard.functions";

interface ActivateProjectWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string;
}

type ReportingFrequency = "Monthly" | "Quarterly" | "Semestral" | "Custom";

interface DueDateEntry {
	id: string;
	reportType: string;
	dueDate: Date | undefined;
}

let nextId = 0;
function generateId() {
	return `due-${++nextId}-${Date.now()}`;
}

export function ActivateProjectWizard({
	open,
	onOpenChange,
	projectId,
}: ActivateProjectWizardProps) {
	const [step, setStep] = React.useState(1);
	const [selectedMoaId, setSelectedMoaId] = React.useState<string>("");
	const [frequency, setFrequency] = React.useState<ReportingFrequency | "">("");
	const [dueDates, setDueDates] = React.useState<DueDateEntry[]>([]);

	const queryClient = useQueryClient();

	const { data: moas = [], isLoading: moasLoading } = useQuery({
		queryKey: ["director", "moas", "active"],
		queryFn: () => getActiveMoasFn(),
	});

	const selectedMoa = moas.find((m) => m.moaId === selectedMoaId);

	const activateMutation = useMutation({
		mutationFn: activateProjectFn,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["dashboard", "proposals", projectId],
			});
			toast.success("Project activated successfully!");
			onOpenChange(false);
			resetWizard();
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	function resetWizard() {
		setStep(1);
		setSelectedMoaId("");
		setFrequency("");
		setDueDates([]);
	}

	function handleNext() {
		if (step === 1 && !selectedMoaId) {
			toast.error("Please select an MOA");
			return;
		}
		if (step < 2) {
			setStep(step + 1);
		}
	}

	function handleBack() {
		if (step > 1) {
			setStep(step - 1);
		}
	}

	function handleAddDueDate(reportType: string) {
		setDueDates([
			...dueDates,
			{ id: generateId(), reportType, dueDate: undefined },
		]);
	}

	function handleRemoveDueDate(id: string) {
		setDueDates(dueDates.filter((d) => d.id !== id));
	}

	function handleUpdateDueDate(id: string, date: Date | undefined) {
		setDueDates(dueDates.map((d) => (d.id === id ? { ...d, dueDate: date } : d)));
	}

	function handleSubmit() {
		if (!selectedMoaId || !frequency) return;

		const validDueDates = dueDates.filter((d) => d.dueDate);
		if (validDueDates.length === 0) {
			toast.error("Please add at least one due date");
			return;
		}

		activateMutation.mutate({
			data: {
				projectId,
				moaId: selectedMoaId,
				reportingFrequency: frequency,
				dueDates: validDueDates.map((d) => ({
					reportType: d.reportType,
					dueDate: d.dueDate!.toISOString(),
				})),
			},
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				onOpenChange(v);
				if (!v) resetWizard();
			}}
		>
			<DialogContent className="sm:max-w-[520px] p-0 overflow-hidden gap-0">
				<DialogHeader className="py-4 px-6 border-b border-border">
					<DialogTitle className="text-xl font-semibold text-heading">
						Activate Project
					</DialogTitle>
					<DialogDescription className="text-sm text-muted-foreground">
						Step {step} of 2:{" "}
						{step === 1 ? "Link MOA" : "Reporting Schedule & Due Dates"}
					</DialogDescription>
				</DialogHeader>

				<div className="p-6 overflow-y-auto max-h-[60vh]">
					{step === 1 && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Select MOA</Label>
								{moasLoading ? (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2 className="size-4 animate-spin" />
										Loading MOAs...
									</div>
								) : (
									<Combobox
										value={selectedMoaId}
										onValueChange={(v) => setSelectedMoaId(v as string)}
									>
										<ComboboxInput
											placeholder="Search MOA by partner name..."
											className="w-full"
										/>
										<ComboboxContent>
											<ComboboxList>
												<ComboboxEmpty>No MOAs found</ComboboxEmpty>
												{moas.map((moa) => (
													<ComboboxItem key={moa.moaId} value={moa.moaId}>
														<div className="flex flex-col">
															<span>{moa.partnerName}</span>
															<span className="text-xs text-muted-foreground">
																{format(new Date(moa.validFrom), "MMM d, yyyy")} -{" "}
																{format(new Date(moa.validUntil), "MMM d, yyyy")}
															</span>
														</div>
													</ComboboxItem>
												))}
											</ComboboxList>
										</ComboboxContent>
									</Combobox>
								)}
							</div>

							{selectedMoa && (
								<div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
									<p className="font-medium">{selectedMoa.partnerName}</p>
									<p className="text-muted-foreground">
										Valid: {format(new Date(selectedMoa.validFrom), "MMM d, yyyy")} -{" "}
										{format(new Date(selectedMoa.validUntil), "MMM d, yyyy")}
									</p>
								</div>
							)}
						</div>
					)}

					{step === 2 && (
						<div className="space-y-6">
							{/* Reporting Frequency */}
							<div className="space-y-3">
								<Label>Reporting Frequency</Label>
								<div className="grid grid-cols-4 gap-2">
									{(["Monthly", "Quarterly", "Semestral", "Custom"] as const).map((freq) => (
										<Button
											key={freq}
											variant={frequency === freq ? "default" : "outline"}
											className={cn(
												"h-auto py-3 flex flex-col gap-1",
												frequency === freq && "bg-brand-primary text-white",
											)}
											onClick={() => setFrequency(freq)}
										>
											<span className="text-sm font-medium">{freq}</span>
											<span className="text-[11px] text-muted-foreground">
												{freq === "Monthly" && "12/yr"}
												{freq === "Quarterly" && "4/yr"}
												{freq === "Semestral" && "2/yr"}
												{freq === "Custom" && "Manual"}
											</span>
										</Button>
									))}
								</div>
							</div>

							{/* Due Dates */}
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<Label>Report Due Dates</Label>
									<Popover>
										<PopoverTrigger
											render={
												<Button variant="outline" size="sm" className="gap-1.5" />
											}
										>
											<Plus className="size-3.5" />
											Add Report
										</PopoverTrigger>
										<PopoverContent align="end" className="w-48 p-1">
											<Button
												variant="ghost"
												className="w-full justify-start gap-2"
												onClick={() => handleAddDueDate("Progress Report")}
											>
												Progress Report
											</Button>
											<Button
												variant="ghost"
												className="w-full justify-start gap-2"
												onClick={() => handleAddDueDate("Project Closure")}
											>
												Project Closure
											</Button>
										</PopoverContent>
									</Popover>
								</div>

								{dueDates.length === 0 && (
									<p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
										No reports added yet. Click "Add Report" to begin.
									</p>
								)}

								<div className="space-y-2">
									{dueDates.map((entry) => (
										<div
											key={entry.id}
											className="flex items-center gap-2 rounded-lg border border-border p-3"
										>
											<span className="flex-1 text-sm font-medium">
												{entry.reportType}
											</span>
											<Popover>
												<PopoverTrigger
													render={
														<Button
															variant="outline"
															size="sm"
															className={cn(
																"w-[170px] justify-start text-left font-normal",
																!entry.dueDate && "text-muted-foreground",
															)}
														/>
													}
												>
													<CalendarIcon className="mr-2 size-3.5" />
													{entry.dueDate
														? format(entry.dueDate, "MMM d, yyyy")
														: "Pick date"}
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="end">
													<Calendar
														mode="single"
														selected={entry.dueDate}
														onSelect={(date) => handleUpdateDueDate(entry.id, date)}
														disabled={(date) => date < new Date()}
													/>
												</PopoverContent>
											</Popover>
											<Button
												variant="ghost"
												size="icon"
												className="size-8 text-muted-foreground hover:text-destructive"
												onClick={() => handleRemoveDueDate(entry.id)}
											>
												<Trash2 className="size-3.5" />
											</Button>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				<DialogFooter className="p-6 border-t border-border bg-card">
					<div className="flex items-center justify-between w-full">
						{step > 1 ? (
							<Button type="button" variant="outline" onClick={handleBack}>
								<ChevronLeft className="size-4" />
								Back
							</Button>
						) : (
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
						)}

						{step < 2 ? (
							<Button
								type="button"
								onClick={handleNext}
								className="bg-brand-primary hover:bg-brand-primary-hover"
							>
								Next
								<ChevronRight className="size-4" />
							</Button>
						) : (
							<Button
								type="button"
								onClick={handleSubmit}
								className="bg-brand-primary hover:bg-brand-primary-hover text-white"
								disabled={activateMutation.isPending}
							>
								{activateMutation.isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Activating...
									</>
								) : (
									<>
										<Check className="size-4" />
										Activate Project
									</>
								)}
							</Button>
						)}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
