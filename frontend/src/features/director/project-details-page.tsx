import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ChevronRight, Download, Eye, FileText, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { projectDetailsQueryOptions } from "@/lib/dashboard.functions";
import { ProjectStatusBadge } from "./components/project-status-badge";

interface ProjectDetailsPageProps {
	proposalId: string;
}

function ProjectDetailsSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							render={
								<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />
							}
						>
							Dashboard
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Project Details</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-3">
						<Skeleton className="h-7 w-80" />
						<Skeleton className="h-5 w-20 rounded-[6px]" />
						<Skeleton className="h-4 w-16" />
					</div>
				</div>
				<Skeleton className="h-9 w-48 rounded-[10px]" />
			</div>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				{/* Main Column */}
				<div className="lg:col-span-8 flex flex-col gap-6">
					{/* Project Overview */}
					<div className="rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden">
						<div className="bg-[#fcfcfc] border-b border-[#ebebeb] px-6 py-3">
							<Skeleton className="h-4 w-32" />
						</div>
						<div className="divide-y divide-[#ebebeb]">
							<div className="flex items-center justify-between px-6 py-3">
								<Skeleton className="h-4 w-28" />
								<div className="flex items-center gap-3">
									<Skeleton className="size-8 rounded-full" />
									<Skeleton className="h-4 w-32" />
								</div>
							</div>
							<div className="flex items-center justify-between px-6 py-3">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-40" />
							</div>
							<div className="flex items-center justify-between px-6 py-3">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-36" />
							</div>
							<div className="flex items-center justify-between px-6 py-3">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-20" />
							</div>
							<div className="flex items-center justify-between px-6 py-3">
								<Skeleton className="h-4 w-24" />
								<div className="flex flex-col items-end gap-1">
									<Skeleton className="h-5 w-28" />
									<Skeleton className="h-3 w-48" />
								</div>
							</div>
							<div className="flex items-center justify-between px-6 py-3">
								<Skeleton className="h-4 w-28" />
								<div className="flex items-center gap-4">
									<div className="flex -space-x-2">
										<Skeleton className="size-8 rounded-full" />
										<Skeleton className="size-8 rounded-full" />
										<Skeleton className="size-8 rounded-full" />
									</div>
									<Skeleton className="size-4" />
								</div>
							</div>
						</div>
					</div>

					{/* Document History */}
					<div className="rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
						<div className="px-6 py-3 border-b border-[#ebebeb]">
							<Skeleton className="h-4 w-32" />
						</div>
						<div className="px-6 py-4">
							<div className="relative space-y-6 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-[#ebebeb]">
								{[1, 2].map((i) => (
									<div key={i} className="relative flex items-start gap-4 pl-8">
										<Skeleton className="absolute left-0 mt-1 size-[22px] rounded-full" />
										<div className="flex flex-1 flex-col gap-1">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<Skeleton className="h-4 w-20" />
													<Skeleton className="h-5 w-16 rounded-[6px]" />
												</div>
												<Skeleton className="h-3 w-28" />
											</div>
											<Skeleton className="h-3 w-36" />
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Sidebar */}
				<div className="lg:col-span-4 flex flex-col gap-6">
					{/* Attachments */}
					<div className="rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden">
						<div className="bg-[#fcfcfc] border-b border-[#ebebeb] px-6 py-3">
							<Skeleton className="h-4 w-24" />
						</div>
						<div className="p-4 flex flex-col gap-3">
							{[1].map((i) => (
								<div
									key={i}
									className="flex flex-col gap-3 rounded-[10px] border border-[#e5e5e5] bg-[#fcfcfc] p-3"
								>
									<div className="flex items-center gap-3">
										<Skeleton className="size-10 rounded-[8px]" />
										<div className="flex flex-1 flex-col gap-1">
											<Skeleton className="h-4 w-40" />
											<Skeleton className="h-3 w-20" />
										</div>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<Skeleton className="h-8 rounded-[8px]" />
										<Skeleton className="h-8 rounded-[8px]" />
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

interface ProjectOverviewCardProps {
	metadata: {
		leader: {
			name: string;
			avatarUrl?: string;
		};
		department: string;
		duration: string;
		moaLinked: string;
		sdgs?: string;
		budget: {
			total: number;
			neust: number;
			partner: number;
		};
	};
	members: {
		userId: string;
		name: string;
		avatarUrl?: string;
		role: string;
	}[];
}

function ProjectOverviewCard({ metadata, members }: ProjectOverviewCardProps) {
	return (
		<div className="rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden">
			<div className="bg-[#fcfcfc] border-b border-[#ebebeb] px-6 py-3">
				<h2 className="text-[14px] font-semibold text-[#11215a]">
					Project Overview
				</h2>
			</div>
			<div className="divide-y divide-[#ebebeb]">
				<div className="flex items-center justify-between px-6 py-3">
					<span className="text-[14px] text-[#666]">Project Leader</span>
					<div className="flex items-center gap-3">
						<Avatar className="size-8 border border-[#ebebeb]">
							<AvatarImage
								src={metadata.leader.avatarUrl}
								alt={metadata.leader.name}
							/>
							<AvatarFallback className="bg-brand-primary/10 text-brand-primary text-[10px]">
								{metadata.leader.name
									.split(" ")
									.map((n) => n[0])
									.join("")}
							</AvatarFallback>
						</Avatar>
						<span className="text-[14px] font-medium text-[#0a0a0a]">
							{metadata.leader.name}
						</span>
					</div>
				</div>
				<div className="flex items-center justify-between px-6 py-3">
					<span className="text-[14px] text-[#666]">Department / Unit</span>
					<span className="text-[14px] font-medium text-[#0a0a0a]">
						{metadata.department}
					</span>
				</div>
				<div className="flex items-center justify-between px-6 py-3">
					<span className="text-[14px] text-[#666]">Duration</span>
					<span className="text-[14px] font-medium text-[#0a0a0a]">
						{metadata.duration}
					</span>
				</div>
				<div className="flex items-center justify-between px-6 py-3">
					<span className="text-[14px] text-[#666]">SDGs</span>
					<span className="text-[14px] font-medium text-[#0a0a0a]">
						{metadata.sdgs ?? "None"}
					</span>
				</div>
				<div className="flex items-center justify-between px-6 py-3">
					<span className="text-[14px] text-[#666]">Total Budget</span>
					<div className="flex flex-col items-end">
						<span className="text-[14px] font-semibold text-[#11215a]">
							₱{metadata.budget.total.toLocaleString()}
						</span>
						<span className="text-[12px] text-[#666]">
							NEUST: ₱{metadata.budget.neust.toLocaleString()} | Partner: ₱
							{metadata.budget.partner.toLocaleString()}
						</span>
					</div>
				</div>

				{/* Team Members */}
				<Dialog>
					<DialogTrigger
						render={
							<button
								type="button"
								aria-label="View project team members"
								className="flex w-full items-center justify-between px-6 py-3 transition-colors hover:bg-[#fcfcfc]"
							/>
						}
					>
						<span className="text-[14px] text-[#666]">Project Team</span>
						<div className="flex items-center gap-4">
							<div className="flex -space-x-2">
								{members.slice(0, 4).map((member) => (
									<Avatar
										key={member.userId}
										className="size-8 border-2 border-white ring-1 ring-[#ebebeb]"
									>
										<AvatarImage src={member.avatarUrl} alt={member.name} />
										<AvatarFallback className="bg-gray-100 text-gray-600 text-[10px]">
											{member.name
												.split(" ")
												.map((n) => n[0])
												.join("")}
										</AvatarFallback>
									</Avatar>
								))}
								{members.length > 4 && (
									<div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-gray-50 text-[10px] font-bold text-[#666] ring-1 ring-[#ebebeb]">
										+{members.length - 4}
									</div>
								)}
							</div>
							<ChevronRight className="size-4 text-[#999]" />
						</div>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[425px] rounded-[12px] p-6">
						<DialogHeader className="pb-4">
							<DialogTitle className="text-[16px] font-semibold text-[#11215a]">
								Project Members
							</DialogTitle>
						</DialogHeader>
						<ul className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2">
							{members.map((member) => (
								<li
									key={member.userId}
									className="flex items-center gap-3 p-2 rounded-[8px] transition-colors hover:bg-[#fcfcfc]"
								>
									<Avatar className="size-9 border border-[#ebebeb]">
										<AvatarImage src={member.avatarUrl} alt={member.name} />
										<AvatarFallback className="bg-gray-100 text-gray-600">
											<User className="size-4" />
										</AvatarFallback>
									</Avatar>
									<div className="flex flex-col">
										<span className="text-[14px] font-medium text-[#0a0a0a]">
											{member.name}
										</span>
										<span className="text-[12px] text-[#666]">
											{member.role}
										</span>
									</div>
								</li>
							))}
						</ul>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}

interface DocumentHistoryCardProps {
	history: {
		id: string | number;
		version: string;
		status: string;
		date: string;
		actorName: string;
		comment?: string;
	}[];
}

function DocumentHistoryCard({ history }: DocumentHistoryCardProps) {
	return (
		<div className="rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<div className="px-6 py-3 border-b border-[#ebebeb]">
				<h2 className="text-[14px] font-semibold text-[#11215a]">
					Document History
				</h2>
			</div>
			<div className="px-6 py-4">
				<ul className="relative space-y-6 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-[#ebebeb]">
					{history.map((item, idx) => (
						<li key={item.id} className="relative flex items-start gap-4 pl-8">
							<div
								className={`absolute left-0 mt-1 size-[22px] rounded-full border-[3px] border-white shadow-sm ring-1 ring-[#ebebeb] ${idx === 0 ? "bg-brand-primary" : "bg-white"}`}
							/>
							<div className="flex flex-1 flex-col gap-1">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="text-[14px] font-medium text-[#0a0a0a]">
											Version {item.version}
										</span>
										<Badge
											className={`${
												item.status === "Current"
													? "bg-blue-50 text-blue-600 border-blue-100"
													: item.status === "Returned"
														? "bg-red-50 text-red-600 border-red-100"
														: "bg-gray-50 text-gray-600 border-gray-100"
											} rounded-[6px] px-2 py-0 h-5 text-[10px] font-semibold uppercase`}
										>
											{item.status}
										</Badge>
									</div>
									<span className="text-[12px] text-[#666]">
										{format(new Date(item.date), "MMM dd, yyyy · hh:mm a")}
									</span>
								</div>
								<p className="text-[13px] text-[#666]">
									{item.status === "Returned"
										? "Returned by Technical Panel"
										: `Uploaded by ${item.actorName}`}
								</p>
								{item.comment && (
									<div className="rounded-[8px] border border-dashed border-[#e5e5e5] bg-[#fcfcfc] p-3 text-[12px] italic text-[#737373]">
										"{item.comment}"
									</div>
								)}
								{item.status !== "Current" && (
									<Button
										variant="outline"
										size="sm"
										className="w-fit gap-1.5 rounded-[8px] border-[#e5e5e5] h-7 text-[12px] font-medium text-[#737373] hover:bg-[#fcfcfc]"
									>
										<FileText className="size-3" />
										View Version
									</Button>
								)}
							</div>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

interface AttachmentsCardProps {
	attachments: {
		id: string | number;
		name: string;
		type: string;
		url: string;
		version: string;
	}[];
}

function AttachmentsCard({ attachments }: AttachmentsCardProps) {
	return (
		<div className="rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden">
			<div className="bg-[#fcfcfc] border-b border-[#ebebeb] px-6 py-3">
				<h2 className="text-[14px] font-semibold text-[#11215a]">
					Attachments
				</h2>
			</div>
			<ul className="p-4 flex flex-col gap-3">
				{attachments.map((attachment) => (
					<li
						key={attachment.id}
						className="flex flex-col gap-3 rounded-[10px] border border-[#e5e5e5] bg-[#fcfcfc] p-3 transition-colors hover:border-brand-primary/30"
					>
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-[8px] bg-red-50 text-red-500">
								<FileText className="size-5" />
							</div>
							<div className="flex flex-1 flex-col overflow-hidden">
								<span className="truncate text-[14px] font-medium text-[#0a0a0a]">
									{attachment.name}
								</span>
								<span className="text-[12px] text-[#666]">
									{attachment.type} · v{attachment.version}
								</span>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Button
								nativeButton={false}
								variant="outline"
								className="h-8 rounded-[8px] border-[#e5e5e5] text-[12px] font-medium text-[#666] hover:bg-white"
								render={
									<a
										href={attachment.url}
										target="_blank"
										rel="noopener noreferrer"
									>
										View Attachment
									</a>
								}
							>
								<Eye className="mr-1.5 size-3.5" />
								View
							</Button>
							<Button
								nativeButton={false}
								variant="outline"
								className="h-8 rounded-[8px] border-[#e5e5e5] text-[12px] font-medium text-[#666] hover:bg-white"
								render={
									<a href={attachment.url} download>
										Download Attachment
									</a>
								}
							>
								<Download className="mr-1.5 size-3.5" />
								Download
							</Button>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

export function ProjectDetailsPage({ proposalId }: ProjectDetailsPageProps) {
	const { data, isLoading } = useQuery(projectDetailsQueryOptions(proposalId));

	if (isLoading) {
		return <ProjectDetailsSkeleton />;
	}

	if (!data) {
		return (
			<div className="flex h-[400px] items-center justify-center text-muted-foreground">
				Project not found.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							render={
								<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />
							}
						>
							Dashboard
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Project Details</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-2">
					<h1 className="flex flex-wrap items-center gap-3 text-[22px] font-semibold text-[#11215a]">
						<span>{data.title}</span>
						<ProjectStatusBadge status={data.status} />
						<span className="text-[12px] font-normal text-[#666]">
							Version {data.version}
						</span>
					</h1>
				</div>
				<Button
					nativeButton={false}
					className="flex w-fit items-center gap-2 rounded-[10px] bg-brand-primary px-5 h-9 !text-white hover:!text-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-brand-primary-hover"
					render={<Link to="/proposals/$proposalId" params={{ proposalId }} />}
				>
					<Eye className="size-4" />
					<span className="text-sm font-medium">Read Proposal Document</span>
				</Button>
			</div>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				{/* Main Column */}
				<div className="lg:col-span-8 flex flex-col gap-6">
					<ProjectOverviewCard
						metadata={data.metadata}
						members={data.members}
					/>
					<DocumentHistoryCard history={data.history} />
				</div>

				{/* Sidebar */}
				<div className="lg:col-span-4 flex flex-col gap-6">
					<AttachmentsCard attachments={data.attachments} />
				</div>
			</div>
		</div>
	);
}
