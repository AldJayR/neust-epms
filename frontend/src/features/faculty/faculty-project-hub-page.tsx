import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import {
	startTransition,
	useDeferredValue,
	useReducer,
	useState,
} from "react";
import { BrandButton } from "@/components/custom/brand-button";
import { DataTableFilter } from "@/components/custom/data-table-filter";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageHeader } from "@/components/custom/page-header";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/lib/auth";
import {
	facultyProjectsQueryOptions,
	facultyProposalsQueryOptions,
} from "@/features/faculty";
import { CreateProposalModal } from "@/features/proposals";
import { toStableDate } from "@/lib/utils";

interface FacultyProjectHubPageProps {
	user: AuthUser;
}

interface ProjectHubViewState {
	activeTab: "my" | "college";
	searchQuery: string;
	currentPage: number;
}

type ProjectHubViewAction =
	| { type: "search"; value: string }
	| { type: "tab"; value: "my" | "college" }
	| { type: "page"; value: number };

function projectHubViewReducer(
	state: ProjectHubViewState,
	action: ProjectHubViewAction,
): ProjectHubViewState {
	switch (action.type) {
		case "search":
			return { ...state, searchQuery: action.value, currentPage: 1 };
		case "tab":
			return { ...state, activeTab: action.value, currentPage: 1 };
		case "page":
			return { ...state, currentPage: action.value };
	}
}

export function FacultyProjectHubPage({ user }: FacultyProjectHubPageProps) {
	const [viewState, dispatchView] = useReducer(projectHubViewReducer, {
		activeTab: "my",
		searchQuery: "",
		currentPage: 1,
	});
	const { activeTab, searchQuery, currentPage } = viewState;
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [selectedStatus, setSelectedStatus] = useState<string>("all");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [sorting, setSorting] = useState<SortingState>([]);
	const itemsPerPage = 5;
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const { data: projectsData, isLoading: isProjectsLoading } = useQuery(
		facultyProjectsQueryOptions(),
	);
	const { data: proposalsData, isLoading: isProposalsLoading } = useQuery(
		facultyProposalsQueryOptions(),
	);

	const projectsList = projectsData?.items ?? [];
	const proposalsList = proposalsData?.items ?? [];

	const activeProposals = proposalsList.filter(
		(p) => !projectsList.some((proj) => proj.proposalId === p.proposalId),
	);

	const userFullName = `${user.firstName} ${user.lastName}`;

	const allItems = (() => {
		const formattedProjects = projectsList.map((p) => {
			const isLeader =
				(p.leaderFirstName &&
					p.leaderLastName &&
					`${p.leaderFirstName} ${p.leaderLastName}` === userFullName) ||
				false;
			return {
				id: p.proposalId,
				proposalId: p.proposalId,
				title: p.title || "Untitled Project",
				category: p.extensionCategory || "Extension Program",
				date: p.createdAt,
				status: p.projectStatus,
				isLeader,
				isProject: true,
				isMember: p.isMember,
			};
		});

		const formattedProposals = activeProposals.map((p) => {
			const isLeader =
				(p.leaderFirstName &&
					p.leaderLastName &&
					`${p.leaderFirstName} ${p.leaderLastName}` === userFullName) ||
				false;
			return {
				id: p.proposalId,
				proposalId: p.proposalId,
				title: p.title || "Untitled Proposal",
				category: p.extensionCategory || "Extension Program",
				date: p.createdAt,
				status: p.status,
				isLeader,
				isProject: false,
				isMember: p.isMember,
			};
		});

		return [...formattedProjects, ...formattedProposals].sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);
	})();

	const { projectsAsLeader, projectsAsMember, attentionRequired } = (() => {
		let leaderCount = 0;
		let memberCount = 0;
		let attentionCount = 0;

		for (const item of allItems) {
			if (item.isProject) {
				if (item.isLeader) {
					leaderCount++;
				} else {
					memberCount++;
				}
			}
			if (item.status === "Returned") {
				attentionCount++;
			}
		}

		return {
			projectsAsLeader: leaderCount,
			projectsAsMember: memberCount,
			attentionRequired: attentionCount,
		};
	})();

	const tabFilteredItems =
		activeTab === "my"
			? allItems.filter((item) => item.isLeader || item.isMember)
			: allItems;

	const filteredItems = tabFilteredItems.filter((item) => {
		const matchesSearch = item.title
			.toLowerCase()
			.includes(deferredSearchQuery.toLowerCase());
		const matchesCategory =
			selectedCategory === "all" || item.category === selectedCategory;
		const matchesStatus =
			selectedStatus === "all" || item.status === selectedStatus;

		return matchesSearch && matchesCategory && matchesStatus;
	});

	const totalItems = filteredItems.length;
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedItems = filteredItems.slice(
		startIndex,
		startIndex + itemsPerPage,
	);

	const handleSearchChange = (val: string) => {
		startTransition(() => dispatchView({ type: "search", value: val }));
	};

	const handleTabChange = (tab: "my" | "college") => {
		startTransition(() => dispatchView({ type: "tab", value: tab }));
	};

	const categories = (() => {
		const set = new Set<string>();
		for (const item of allItems) {
			if (item.category) set.add(item.category);
		}
		return Array.from(set);
	})();

	const statuses = (() => {
		const set = new Set<string>();
		for (const item of allItems) {
			if (item.status) set.add(item.status);
		}
		return Array.from(set);
	})();

	const isLoading = isProjectsLoading || isProposalsLoading;

	const columns: DataTableColumnDef<(typeof allItems)[number]>[] = [
		{
			id: "title",
			accessorKey: "title",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Project Title" />
			),
			headerClassName: "w-[40%] font-medium text-muted-foreground",
			cellClassName: "font-bold text-foreground",
			cell: ({ row }) => {
				const item = row.original;
				return (
					<Link
						to="/projects/$projectId"
						params={{ projectId: item.id }}
						className="!text-foreground truncate max-w-[350px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs inline-block text-left"
						title={item.title}
						onClick={(e) => e.stopPropagation()}
					>
						{item.title}
					</Link>
				);
			},
		},
		{
			id: "category",
			accessorKey: "category",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Category" />
			),
			headerClassName: "w-[20%] font-medium text-muted-foreground",
			cellClassName: "text-foreground text-left",
			cell: ({ row }) => (
				<span className="inline-flex bg-background border border-border rounded-lg px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
					{row.original.category}
				</span>
			),
		},
		{
			id: "date",
			accessorKey: "date",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Submission Date" />
			),
			headerClassName: "w-[20%] font-medium text-muted-foreground",
			cellClassName: "text-foreground text-left",
			cell: ({ row }) => format(toStableDate(row.original.date), "MMM dd, yyyy"),
		},
		{
			id: "status",
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			headerClassName: "w-[15%] font-medium text-muted-foreground",
			cellClassName: "text-left",
			cell: ({ row }) => <StatusBadge status={row.original.status} />,
		},
	];

	return (
		<div className="flex flex-col gap-8 w-full">
			<PageHeader
				title={
					<h1 className="text-2xl font-semibold text-heading">Project Hub</h1>
				}
				actions={
					<BrandButton onClick={() => setIsCreateModalOpen(true)}>
						<Plus className="size-4" />
						<span>Start New Project Proposal</span>
					</BrandButton>
				}
			/>

			<div className="grid gap-6 md:grid-cols-3 w-full">
				<MetricCard
					label="Projects as Leader"
					value={isLoading ? undefined : projectsAsLeader}
					isLoading={isLoading}
				/>
				<MetricCard
					label="Projects as Member"
					value={isLoading ? undefined : projectsAsMember}
					isLoading={isLoading}
				/>
				<MetricCard
					label="Attention Required"
					value={isLoading ? undefined : attentionRequired}
					isLoading={isLoading}
				/>
			</div>

			<DataTablePage
				columns={columns}
				data={paginatedItems}
				total={totalItems}
				isLoading={isLoading}
				page={currentPage}
				pageSize={itemsPerPage}
				onPageChange={(page) => dispatchView({ type: "page", value: page })}
				search={searchQuery}
				onSearch={handleSearchChange}
				searchPlaceholder="Search projects"
				sorting={sorting}
				onSortingChange={setSorting}
				enableSorting
				filters={
					<>
						<DataTableFilter
							value={selectedCategory}
							onValueChange={setSelectedCategory}
							placeholder="All Categories"
							options={[
								{ value: "all", label: "All Categories" },
								...categories.map((c) => ({ value: c, label: c })),
							]}
						/>
						<DataTableFilter
							value={selectedStatus}
							onValueChange={setSelectedStatus}
							placeholder="All Statuses"
							options={[
								{ value: "all", label: "All Statuses" },
								...statuses.map((s) => ({ value: s, label: s })),
							]}
						/>
					</>
				}
				activeFilters={{
					search: searchQuery,
					category: selectedCategory === "all" ? undefined : selectedCategory,
					status: selectedStatus === "all" ? undefined : selectedStatus,
				}}
				emptyMessage="No projects found matching the criteria."
				ariaLabel="Projects"
				cardHeader={
					<div className="border-b border-border bg-background p-2">
						<Tabs
							value={activeTab}
							onValueChange={(val) => handleTabChange(val as "my" | "college")}
							className="w-fit"
						>
							<TabsList className="bg-muted">
								<TabsTrigger
									value="my"
									className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
								>
									My Projects
								</TabsTrigger>
								<TabsTrigger
									value="college"
									className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
								>
									College-wide Projects
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				}
			/>

			<CreateProposalModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				user={user}
			/>
		</div>
	);
}
