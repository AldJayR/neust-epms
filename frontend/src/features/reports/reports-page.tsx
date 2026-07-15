import { Download, FilePlus, ListFilter } from "lucide-react";
import { useState } from "react";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageHeader } from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportsFilterTabs } from "./components/reports-filter-tabs";
import { ReportSubmissionPickerDialog } from "./components/report-submission-picker-dialog";
import { useReportsView } from "./hooks/use-reports-view";

export function ReportsPage() {
	const view = useReportsView();
	const [isSubmissionPickerOpen, setIsSubmissionPickerOpen] = useState(false);

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title={<h1 className="text-2xl font-semibold text-heading">Reports</h1>}
					actions={
						<div className="flex items-center gap-3">
							{(view.isFaculty || view.isRET) && (
								<Button onClick={() => setIsSubmissionPickerOpen(true)}>
									<FilePlus className="size-4" />
									Submit Report
								</Button>
							)}
							<Button
							variant="outline"
							className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-lg gap-2"
						>
							<Download className="size-4" />
							Export Reports
						</Button>
					</div>
				}
			/>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<MetricCard label="Total Reports" value={view.totalReports} />
				<MetricCard label="Progress Reports" value={view.progressCount} />
				<MetricCard label="Terminal Reports" value={view.terminalCount} />
			</div>

			<DataTablePage
				columns={view.columns}
				data={view.paginatedReports}
				total={view.filteredReports.length}
				isLoading={view.isLoading}
				page={view.page}
				pageSize={view.limit}
				onPageChange={view.setPage}
				search={view.search}
				sorting={view.sorting}
				onSortingChange={view.setSorting}
				enableSorting
				onSearch={view.handleSearch}
				searchPlaceholder="Search reports"
				filters={
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="outline"
									className="h-9 w-9 p-0 border-border rounded-[8px] shadow-sm animate-fade-in"
									aria-label="Filter reports"
								>
									<ListFilter className="size-4" />
								</Button>
							}
						/>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuRadioGroup
								value={view.typeFilter}
								onValueChange={(value) =>
									view.setTypeFilter(value as "All" | "Progress" | "Terminal")
								}
							>
								<DropdownMenuRadioItem value="All">
									All Types
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="Progress">
									Progress Reports
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="Terminal">
									Terminal Reports
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				}
				cardHeader={
					view.isFaculty || view.isRET ? (
						<ReportsFilterTabs
							value={view.activeTab}
							onValueChange={view.handleTabChange}
						/>
					) : undefined
				}
				activeFilters={{ search: view.search }}
				emptyMessage="No reports found."
				ariaLabel="Reports"
			/>
			<ReportSubmissionPickerDialog
				open={isSubmissionPickerOpen}
				onOpenChange={setIsSubmissionPickerOpen}
				projects={view.projects}
			/>

		</div>
	);
}
