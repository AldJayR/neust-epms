import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
	Plus,
	Search,
	SlidersHorizontal,
	CheckCircle2,
	AlertCircle,
	FileText,
	Clock,
	MoreVertical,
	ChevronLeft,
	ChevronRight,
	Loader2,
} from "lucide-react";
import { formatAcademicRank } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth";
import {
	facultyProjectsQueryOptions,
	facultyProposalsQueryOptions,
} from "@/lib/faculty.functions";
import { CreateProposalModal } from "../proposals/components/create-proposal-modal";
import { Button } from "@/components/ui/button";

interface FacultyProjectHubPageProps {
	user: AuthUser;
}

export function FacultyProjectHubPage({ user }: FacultyProjectHubPageProps) {
	const [activeTab, setActiveTab] = useState<"my" | "college">("my");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [selectedStatus, setSelectedStatus] = useState<string>("all");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 5;

	// Load data
	const { data: projectsData, isLoading: isProjectsLoading } = useQuery(
		facultyProjectsQueryOptions(),
	);
	const { data: proposalsData, isLoading: isProposalsLoading } = useQuery(
		facultyProposalsQueryOptions(),
	);

	const projectsList = projectsData?.items ?? [];
	const proposalsList = proposalsData?.items ?? [];

	// Filter out proposals that have already been approved (since they will exist as projects)
	const activeProposals = proposalsList.filter((p) => p.status !== "Approved");

	const userFullName = `${user.firstName} ${user.lastName}`;

	// Normalize items
	const allItems = useMemo(() => {
		const formattedProjects = projectsList.map((p) => {
			const isLeader =
				(p.leaderFirstName &&
					p.leaderLastName &&
					`${p.leaderFirstName} ${p.leaderLastName}` === userFullName) ||
				false;
			return {
				id: p.projectId,
				proposalId: p.proposalId,
				title: p.title || "Untitled Project",
				category: p.extensionCategory || "Extension Program",
				date: p.createdAt,
				status: p.projectStatus, // Ongoing, Completed, Closed, etc.
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
				status: p.status, // Draft, Pending Review, Returned, Rejected
				isLeader,
				isProject: false,
				isMember: p.isMember,
			};
		});

		return [...formattedProjects, ...formattedProposals].sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);
	}, [projectsList, activeProposals, userFullName]);

	// Calculate counts for cards
	const { projectsAsLeader, projectsAsMember, attentionRequired } =
		useMemo(() => {
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
		}, [allItems]);

	// Filter based on active tab ("my" vs "college")
	const tabFilteredItems = useMemo(() => {
		if (activeTab === "my") {
			// In "My Projects" tab: filter items where current user is Leader or Member.
			return allItems.filter((item) => item.isLeader || item.isMember); 
		}
		return allItems;
	}, [allItems, activeTab]);

	// Apply Search & Filter dropdowns
	const filteredItems = useMemo(() => {
		return tabFilteredItems.filter((item) => {
			const matchesSearch = item.title
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			const matchesCategory =
				selectedCategory === "all" || item.category === selectedCategory;
			const matchesStatus =
				selectedStatus === "all" || item.status === selectedStatus;

			return matchesSearch && matchesCategory && matchesStatus;
		});
	}, [tabFilteredItems, searchQuery, selectedCategory, selectedStatus]);

	// Paginate items
	const totalItems = filteredItems.length;
	const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
	const paginatedItems = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredItems.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredItems, currentPage]);

	// Reset page when search or tab changes
	const handleSearchChange = (val: string) => {
		setSearchQuery(val);
		setCurrentPage(1);
	};

	const handleTabChange = (tab: "my" | "college") => {
		setActiveTab(tab);
		setCurrentPage(1);
	};

	// Unique categories and statuses for filters
	const categories = useMemo(() => {
		const set = new Set<string>();
		for (const item of allItems) {
			if (item.category) set.add(item.category);
		}
		return Array.from(set);
	}, [allItems]);

	const statuses = useMemo(() => {
		const set = new Set<string>();
		for (const item of allItems) {
			if (item.status) set.add(item.status);
		}
		return Array.from(set);
	}, [allItems]);

	// Render status badges in the table
	const renderStatusBadge = (status: string) => {
		switch (status) {
			case "Ongoing":
				return (
					<span className="inline-flex items-center gap-1.5 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] rounded-lg px-2.5 py-0.5 text-xs font-medium">
						<Clock className="size-3" />
						Ongoing
					</span>
				);
			case "Completed":
				return (
					<span className="inline-flex items-center gap-1.5 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] rounded-lg px-2.5 py-0.5 text-xs font-medium">
						<CheckCircle2 className="size-3" />
						Verified
					</span>
				);
			case "Pending Review":
				return (
					<span className="inline-flex items-center gap-1.5 bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] rounded-lg px-2.5 py-0.5 text-xs font-medium">
						<FileText className="size-3" />
						For Review
					</span>
				);
			case "Returned":
				return (
					<span className="inline-flex items-center gap-1.5 bg-[#fff7ed] text-[#9a3412] border border-[#fed7aa] rounded-lg px-2.5 py-0.5 text-xs font-medium">
						<AlertCircle className="size-3" />
						Needs Revision
					</span>
				);
			case "Draft":
				return (
					<span className="inline-flex items-center gap-1.5 bg-[#f5f5f5] text-[#737373] border border-[#e5e5e5] rounded-lg px-2.5 py-0.5 text-xs font-medium">
						<Clock className="size-3" />
						Draft
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-1.5 bg-white text-[#737373] border border-[#e5e5e5] rounded-lg px-2.5 py-0.5 text-xs font-medium">
						{status}
					</span>
				);
		}
	};

	const isLoading = isProjectsLoading || isProposalsLoading;

	return (
		<div className="flex flex-col gap-8 w-full">
			{/* Header Section */}
			<div className="flex items-center justify-between w-full">
				<h1 className="text-[24px] font-semibold text-[#11215a] leading-[35px]">
					Project Hub
				</h1>
				<button
					type="button"
					onClick={() => setIsCreateModalOpen(true)}
					className="bg-[#1e3b8a] hover:bg-[#1d3570] text-[#fafafa] flex gap-1.5 h-[36px] items-center justify-center px-[10px] py-[8px] rounded-[10px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3b8a]"
				>
					<Plus className="size-4" />
					<span className="font-medium text-sm">Start New Project Proposal</span>
				</button>
			</div>

			{/* Metric Cards Section */}
			<div className="grid gap-6 md:grid-cols-3 w-full">
				<div className="bg-white border border-[#ebebeb] rounded-[12px] p-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[16px]">
					<p className="text-[14px] text-[#666] leading-[16px] font-medium">
						Projects as Leader
					</p>
					<p className="text-[36px] font-semibold text-[#11215a] leading-[36px]">
						{String(projectsAsLeader).padStart(2, "0")}
					</p>
				</div>
				<div className="bg-white border border-[#ebebeb] rounded-[12px] p-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[16px]">
					<p className="text-[14px] text-[#666] leading-[16px] font-medium">
						Projects as Member
					</p>
					<p className="text-[36px] font-semibold text-[#11215a] leading-[36px]">
						{projectsAsMember}
					</p>
				</div>
				<div className="bg-white border border-[#ebebeb] rounded-[12px] p-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[16px]">
					<p className="text-[14px] text-[#666] leading-[16px] font-medium">
						Attention Required
					</p>
					<p className="text-[36px] font-semibold text-[#11215a] leading-[36px]">
						{attentionRequired}
					</p>
				</div>
			</div>

			{/* Filter & Search Controls */}
			<div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full">
				{/* Search Box */}
				<div className="relative w-full md:w-[352px]">
					<Search className="absolute left-[12px] top-1/2 -translate-y-1/2 size-4 text-[#737373]" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => handleSearchChange(e.target.value)}
						placeholder="Search projects"
						className="w-full h-[36px] pl-[36px] pr-[12px] py-[4px] border border-[#e5e5e5] rounded-[8px] text-[14px] placeholder-[#737373] text-[#0a0a0a] focus:outline-none focus:border-[#1e3b8a] transition-colors"
					/>
				</div>

				{/* Select Dropdowns */}
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 bg-white border border-[#e5e5e5] rounded-[8px] h-[36px] px-3">
						<SlidersHorizontal className="size-4 text-[#737373]" />
						<select
							value={selectedCategory}
							onChange={(e) => setSelectedCategory(e.target.value)}
							className="bg-transparent text-[14px] text-[#0a0a0a] focus:outline-none cursor-pointer"
						>
							<option value="all">All Categories</option>
							{categories.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-2 bg-white border border-[#e5e5e5] rounded-[8px] h-[36px] px-3">
						<select
							value={selectedStatus}
							onChange={(e) => setSelectedStatus(e.target.value)}
							className="bg-transparent text-[14px] text-[#0a0a0a] focus:outline-none cursor-pointer"
						>
							<option value="all">All Statuses</option>
							{statuses.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="bg-[#f9f9f9] border border-[#ebebeb] rounded-[12px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-clip w-full flex flex-col">
				{/* Tab Header */}
				<div className="bg-white p-2 border-b border-[#ebebeb] flex items-center">
					<div className="bg-[#fafafa] p-1 flex gap-2 rounded-[10px] border border-[#f0f0f0]">
						<button
							type="button"
							onClick={() => handleTabChange("my")}
							className={`text-[14px] font-medium px-3 py-1 transition-all rounded-[8px] ${
								activeTab === "my"
									? "bg-white border border-[#e5e5e5] shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)] text-[#0a0a0a]"
									: "text-[#737373] hover:text-[#0a0a0a]"
							}`}
						>
							My Projects
						</button>
						<button
							type="button"
							onClick={() => handleTabChange("college")}
							className={`text-[14px] font-medium px-3 py-1 transition-all rounded-[8px] ${
								activeTab === "college"
									? "bg-white border border-[#e5e5e5] shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)] text-[#0a0a0a]"
									: "text-[#737373] hover:text-[#0a0a0a]"
							}`}
						>
							College-wide Projects
						</button>
					</div>
				</div>

				{/* Table */}
				<div className="bg-white overflow-x-auto">
					<table className="w-full text-left border-collapse min-w-[700px]">
						<thead>
							<tr className="border-b border-[#ebebeb] bg-white h-[40px]">
								<th className="px-4 py-2 font-medium text-[#666] text-[14px] w-[45%]">
									Project Title
								</th>
								<th className="px-4 py-2 font-medium text-[#666] text-[14px] w-[25%]">
									Category
								</th>
								<th className="px-4 py-2 font-medium text-[#666] text-[14px] text-center w-[20%]">
									Submission Date
								</th>
								<th className="px-4 py-2 font-medium text-[#666] text-[14px] text-center w-[15%]">
									Status
								</th>
								<th className="px-4 py-2 w-[5%]"></th>
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<tr>
									<td colSpan={5} className="py-12 text-center">
										<div className="flex flex-col items-center justify-center gap-2">
											<Loader2 className="size-6 animate-spin text-[#1e3b8a]" />
											<span className="text-sm text-[#666]">Loading projects...</span>
										</div>
									</td>
								</tr>
							) : paginatedItems.length === 0 ? (
								<tr>
									<td colSpan={5} className="py-12 text-center text-sm text-[#737373]">
										No projects found matching the criteria.
									</td>
								</tr>
							) : (
								paginatedItems.map((item) => (
									<tr
										key={item.id}
										className="border-b border-[#ebebeb] hover:bg-[#fafafa] transition-colors h-[53px] group"
									>
										<td className="px-4 py-2">
											<Link
												to="/projects/$projectId"
												params={{ projectId: item.id }}
												className="font-semibold text-[14px] text-[#0a0a0a] hover:underline focus:outline-none truncate block max-w-[350px]"
												title={item.title}
											>
												{item.title}
											</Link>
										</td>
										<td className="px-4 py-2">
											<span className="inline-flex bg-white border border-[#e5e5e5] rounded-[8px] px-2.5 py-0.5 text-xs font-medium text-[#737373]">
												{item.category}
											</span>
										</td>
										<td className="px-4 py-2 text-center text-[14px] text-[#0a0a0a]">
											{format(new Date(item.date), "MMM dd, yyyy")}
										</td>
										<td className="px-4 py-2 flex items-center justify-center h-[53px]">
											{renderStatusBadge(item.status)}
										</td>
										<td className="px-4 py-2 text-center">
											<button
												type="button"
												className="p-1.5 hover:bg-[#f0f0f0] rounded-[6px] transition-colors focus:outline-none"
											>
												<MoreVertical className="size-4 text-[#737373]" />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination Footer */}
				{!isLoading && totalItems > 0 && (
					<div className="bg-white border-t border-[#ebebeb] px-4 py-3 flex items-center justify-between">
						<p className="text-sm text-[#666]">
							Showing {paginatedItems.length} of {totalItems} results
						</p>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage === 1}
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								className="h-[32px] px-3 gap-1 rounded-[8px] border-[#e5e5e5] text-xs font-medium hover:bg-neutral-50"
							>
								<ChevronLeft className="size-3.5" />
								Previous
							</Button>
							<div className="flex items-center gap-1">
								{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
									<button
										key={p}
										type="button"
										onClick={() => setCurrentPage(p)}
										className={`size-8 rounded-[8px] text-xs font-medium border transition-colors ${
											currentPage === p
												? "bg-white border-[#e5e5e5] text-[#0a0a0a] shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)]"
												: "border-transparent text-[#737373] hover:text-[#0a0a0a]"
										}`}
									>
										{p}
									</button>
								))}
							</div>
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage === totalPages}
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								className="h-[32px] px-3 gap-1 rounded-[8px] border-[#e5e5e5] text-xs font-medium hover:bg-neutral-50"
							>
								Next
								<ChevronRight className="size-3.5" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Create Proposal Modal */}
			<CreateProposalModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
			/>
		</div>
	);
}
