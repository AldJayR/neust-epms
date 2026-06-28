import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Crown, FileSearch, Loader2, Play, Plus, RefreshCcw, Users } from "lucide-react";
import * as React from "react";
import { BrandButton } from "@/components/custom/brand-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuthUser } from "@/lib/auth";
import {
	facultyProposalsQueryOptions,
	facultyProjectsQueryOptions,
} from "@/lib/faculty.functions";
import { CreateProposalModal } from "../proposals/components/create-proposal-modal";

interface FacultyDashboardPageProps {
	user: AuthUser;
}

function DashboardBadge({ icon: Icon, text }: { icon: any; text: string }) {
	return (
		<div className="bg-background border border-[#e5e5e5] h-[22px] inline-flex gap-1 items-center justify-center px-1.5 py-0.5 rounded-[8px] shrink-0 text-muted-foreground text-xs font-medium">
			<Icon className="size-3.5 text-muted-foreground" />
			<span>{text}</span>
		</div>
	);
}

export function FacultyDashboardPage({ user }: { user: AuthUser }) {
	const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

	// Fetch proposals for this faculty member (scoped by department/campus in backend)
	const { data: proposalsData, isLoading: isProposalsLoading } = useQuery(
		facultyProposalsQueryOptions({
			page: 1,
			limit: 100,
		}),
	);

	// Fetch projects for this faculty member (scoped by department/campus in backend)
	const { data: projectsData, isLoading: isProjectsLoading } = useQuery(
		facultyProjectsQueryOptions({
			page: 1,
			limit: 100,
		}),
	);

	const isLoading = isProposalsLoading || isProjectsLoading;

	// Process and merge items
	const projectsList = projectsData?.items ?? [];
	const proposalsList = proposalsData?.items ?? [];

	// Filter out proposals that have already been approved (since they will exist as projects)
	const activeProposals = proposalsList.filter(
		(p) => p.status !== "Approved",
	);

	const userFullName = `${user.firstName} ${user.lastName}`;

	const combinedItems = [
		...projectsList.map((p) => {
			const isLeader =
				(p.leaderFirstName &&
					p.leaderLastName &&
					`${p.leaderFirstName} ${p.leaderLastName}` === userFullName) ||
				false;
			return {
				id: p.projectId,
				proposalId: p.proposalId,
				title: p.title || "Untitled Project",
				startDate: p.targetStartDate,
				endDate: p.targetEndDate,
				status: p.projectStatus, // Ongoing, Completed, Approved
				isLeader,
				isProject: true,
				isMember: p.isMember,
			};
		}),
		...activeProposals.map((p) => {
			const isLeader =
				(p.leaderFirstName &&
					p.leaderLastName &&
					`${p.leaderFirstName} ${p.leaderLastName}` === userFullName) ||
				false;
			return {
				id: p.proposalId,
				proposalId: p.proposalId,
				title: p.title || "Untitled Proposal",
				startDate: p.targetStartDate,
				endDate: p.targetEndDate,
				status: p.status, // Pending Review, Draft, Returned, Rejected
				isLeader,
				isProject: false,
				isMember: p.isMember,
			};
		}),
	];

	// Filter down to only projects/proposals where user is member or leader
	const userItems = combinedItems.filter(
		(item) => item.isMember || item.isLeader,
	);

	// Calculate metrics
	const myTotalSubmissions = userItems.length;
	const ongoingProjects = userItems.filter(
		(item) => item.status === "Ongoing",
	).length;
	const proposalsSubmitted = userItems.filter(
		(item) => item.status === "Pending Review",
	).length;

	// Format dates (e.g. "Jan 2026 - Mar 2026")
	const formatDateRange = (start?: string | null, end?: string | null) => {
		if (!start && !end) return "No duration set";
		try {
			const startStr = start ? format(new Date(start), "MMM yyyy") : "";
			const endStr = end ? format(new Date(end), "MMM yyyy") : "";
			if (startStr && endStr) return `${startStr} - ${endStr}`;
			return startStr || endStr;
		} catch {
			return "Invalid Date";
		}
	};

	// Determine time of day dynamically
	const getTimeOfDay = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Morning";
		if (hour < 18) return "Afternoon";
		return "Evening";
	};

	// Custom status badge mapper
	const renderStatusBadge = (status: string) => {
		if (status === "Ongoing") {
			return <DashboardBadge icon={RefreshCcw} text="Ongoing" />;
		}
		if (status === "Pending Review") {
			return <DashboardBadge icon={FileSearch} text="Pending Review" />;
		}
		// Fallbacks
		if (status === "Draft") {
			return <DashboardBadge icon={Loader2} text="Draft" />;
		}
		return <DashboardBadge icon={Play} text={status} />;
	};

	return (
		<div className="flex flex-col gap-8">
			{/* Header Section */}
			<div className="flex items-start justify-between w-full">
				<div className="flex flex-col gap-2">
					<h1 className="text-[24px] font-semibold text-[#11215a] leading-[35px]">
						Good {getTimeOfDay()}, {user.firstName}
					</h1>
					<p className="text-[14px] text-[#666] leading-[16px]">
						Faculty Member
					</p>
				</div>
				<BrandButton
					onClick={() => setIsCreateModalOpen(true)}
					className="h-9 gap-1.5 px-[10px] py-2 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] rounded-[10px]"
				>
					<Plus className="size-4" />
					<span className="font-medium">Start New Project Proposal</span>
				</BrandButton>
			</div>

			{/* Metric Cards Section */}
			<div className="grid gap-6 md:grid-cols-3 w-full">
				<div className="bg-white border border-[#ebebeb] rounded-[12px] p-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[16px]">
					<p className="text-[14px] text-[#666] leading-[16px] font-medium">
						My Total Submission
					</p>
					<p className="text-[36px] font-semibold text-[#11215a] leading-[36px]">
						{isLoading ? "..." : myTotalSubmissions}
					</p>
				</div>
				<div className="bg-white border border-[#ebebeb] rounded-[12px] p-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[16px]">
					<p className="text-[14px] text-[#666] leading-[16px] font-medium">
						Ongoing Projects
					</p>
					<p className="text-[36px] font-semibold text-[#11215a] leading-[36px]">
						{isLoading ? "..." : ongoingProjects}
					</p>
				</div>
				<div className="bg-white border border-[#ebebeb] rounded-[12px] p-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[16px]">
					<p className="text-[14px] text-[#666] leading-[16px] font-medium">
						Proposals Submitted
					</p>
					<p className="text-[36px] font-semibold text-[#11215a] leading-[36px]">
						{isLoading ? "..." : proposalsSubmitted}
					</p>
				</div>
			</div>

			{/* Project List Cards */}
			<div className="flex flex-col gap-[16px] w-full">
				{isLoading ? (
					// Skeletons
					[1, 2, 3, 4].map((i) => (
						<div
							key={i}
							className="bg-white border border-[#ebebeb] rounded-[12px] p-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex flex-col gap-4 h-[112px]"
						>
							<div className="flex justify-between items-start">
								<div className="flex flex-col gap-2 w-1/3">
									<Skeleton className="h-5 w-3/4 rounded" />
									<Skeleton className="h-3 w-1/2 rounded" />
								</div>
								<Skeleton className="h-[22px] w-24 rounded-lg" />
							</div>
							<div className="flex justify-between items-center mt-auto">
								<Skeleton className="h-[22px] w-28 rounded-lg" />
								<Skeleton className="h-4 w-20 rounded" />
							</div>
						</div>
					))
				) : userItems.length === 0 ? (
					<div className="bg-white border border-[#ebebeb] rounded-[12px] p-8 text-center text-muted-foreground shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
						No project proposals or ongoing projects found for you.
					</div>
				) : (
					userItems.map((item) => (
						<div
							key={item.id}
							className="bg-white border border-[#ebebeb] rounded-[12px] p-[15px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[10px] w-full"
						>
							{/* Top Row: Title + Status */}
							<div className="flex items-start justify-between w-full">
								<div>
									<h3 className="text-[16px] font-semibold text-black leading-[24px]">
										{item.title}
									</h3>
									<p className="text-[12px] text-[#737373] leading-[16px] mt-0.5">
										{formatDateRange(item.startDate, item.endDate)}
									</p>
								</div>
								{renderStatusBadge(item.status)}
							</div>

							{/* Bottom Row: Role + Details Link */}
							<div className="flex items-center justify-between w-full mt-1">
								{item.isLeader ? (
									<DashboardBadge icon={Crown} text="Project Leader" />
								) : (
									<DashboardBadge icon={Users} text="Project Member" />
								)}
								<Link
									to="/projects/$projectId"
									params={{ projectId: item.proposalId }}
									className="text-[12px] font-semibold text-[#113264] hover:underline"
								>
									View Project &rarr;
								</Link>
							</div>
						</div>
					))
				)}
			</div>

			{/* Proposal Submission Modal */}
			<CreateProposalModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				user={user}
			/>
		</div>
	);
}
