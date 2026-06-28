import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useState } from "react";
import { ChevronRight, Download, Eye, FileText, User } from "lucide-react";
import { BrandButton } from "@/components/custom/brand-button";
import { DetailsRow } from "@/components/custom/details-row";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
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
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
	API_BASE,
	type ProjectMember,
	getAccessTokenForUpload,
	getSpecialOrderSignedUrlFn,
	projectDetailsQueryOptions,
} from "@/lib/dashboard.functions";
import { ProjectDetailsSkeleton } from "./project-details-skeleton";

interface ProjectDetailsPageProps {
	proposalId: string;
	currentUserId: string;
	currentUserRole: string;
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
	members: ProjectMember[];
	currentUserId: string;
	currentUserRole: string;
	proposalId: string;
}

function ProjectOverviewCard({
	metadata,
	members,
	currentUserId,
	currentUserRole,
	proposalId,
}: ProjectOverviewCardProps) {
	const queryClient = useQueryClient();
	const [uploadingMemberId, setUploadingMemberId] = useState<string | null>(null);
	const [soNumbers, setSoNumbers] = useState<Record<string, string>>({});
	const [files, setFiles] = useState<Record<string, File | null>>({});
	const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

	function canUpload(member: ProjectMember): boolean {
		if (currentUserRole === "Director") return true;
		if (member.userId === currentUserId && member.role === "Project Leader")
			return true;
		return false;
	}

	const handleUpload = async (member: ProjectMember) => {
		const soNumber = soNumbers[member.userId];
		const file = files[member.userId];
		if (!soNumber || !file) return;

		setUploadingMemberId(member.userId);
		setUploadErrors((prev) => ({ ...prev, [member.userId]: "" }));

		try {
			const token = await getAccessTokenForUpload();
			const formData = new FormData();
			formData.append("file", file);
			formData.append("memberId", member.memberId);
			formData.append("soNumber", soNumber);

			const response = await fetch(`${API_BASE}/special-orders/upload`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.error?.message ?? "Upload failed");
			}

			queryClient.invalidateQueries({
				queryKey: ["dashboard", "proposals", proposalId],
			});

			setSoNumbers((prev) => ({ ...prev, [member.userId]: "" }));
			setFiles((prev) => ({ ...prev, [member.userId]: null }));
		} catch (err) {
			setUploadErrors((prev) => ({
				...prev,
				[member.userId]: err instanceof Error ? err.message : "Upload failed",
			}));
		} finally {
			setUploadingMemberId(null);
		}
	};

	const handleViewSO = async (specialOrderId: string) => {
		try {
			const result = await getSpecialOrderSignedUrlFn({
				data: specialOrderId,
			});
			window.open(result.url, "_blank", "noopener,noreferrer");
		} catch (err) {
			console.error("Failed to get signed URL:", err);
		}
	};
	return (
		<PageCard>
			<div className="bg-card border-b border-border px-6 py-3">
				<h2 className="text-sm font-semibold text-heading">Project Overview</h2>
			</div>
			<div className="divide-y divide-border">
				<DetailsRow label="Project Leader">
					<div className="flex items-center gap-3">
						<Avatar className="size-8 border border-border">
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
						<span className="text-sm font-medium text-foreground">
							{metadata.leader.name}
						</span>
					</div>
				</DetailsRow>
				<DetailsRow label="Department / Unit">{metadata.department}</DetailsRow>
				<DetailsRow label="Duration">{metadata.duration}</DetailsRow>
				<DetailsRow label="SDGs">{metadata.sdgs ?? "None"}</DetailsRow>
				<DetailsRow label="Total Budget">
					<div className="flex flex-col items-end">
						<span className="text-sm font-semibold text-heading">
							₱{metadata.budget.total.toLocaleString()}
						</span>
						<span className="text-xs text-muted-foreground">
							NEUST: ₱{metadata.budget.neust.toLocaleString()} | Partner: ₱
							{metadata.budget.partner.toLocaleString()}
						</span>
					</div>
				</DetailsRow>

				{/* Team Members */}
				<Dialog>
					<DialogTrigger
						render={
							<button
								type="button"
								aria-label="View project team members"
								className="flex w-full items-center justify-between px-6 py-3 transition-colors hover:bg-card"
							/>
						}
					>
						<span className="text-sm text-muted-foreground">Project Team</span>
						<div className="flex items-center gap-4">
							<div className="flex -space-x-2">
								{members.slice(0, 4).map((member) => (
									<Avatar
										key={member.userId}
										className="size-8 border-2 border-white ring-1 ring-border"
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
									<div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-gray-50 text-[10px] font-bold text-muted-foreground ring-1 ring-border">
										+{members.length - 4}
									</div>
								)}
							</div>
							<ChevronRight className="size-4 text-muted-foreground/60" />
						</div>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[425px] rounded-xl p-6">
						<DialogHeader className="pb-4">
							<DialogTitle className="text-base font-semibold text-heading">
								Project Members
							</DialogTitle>
						</DialogHeader>
						<ul className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2">
							{members.map((member) => (
								<li
									key={member.userId}
									className="flex flex-col gap-2 p-2 rounded-lg transition-colors hover:bg-card"
								>
									<div className="flex items-center gap-3">
										<Avatar className="size-9 border border-border">
											<AvatarImage
												src={member.avatarUrl}
												alt={member.name}
											/>
											<AvatarFallback className="bg-gray-100 text-gray-600">
												<User className="size-4" />
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col flex-1 min-w-0">
											<span className="text-sm font-medium text-foreground">
												{member.name}
											</span>
											<span className="text-xs text-muted-foreground">
												{member.role}
											</span>
										</div>

										{member.specialOrder ? (
											<div className="flex items-center gap-2">
												<Badge
													variant="outline"
													className="text-green-600 border-green-200 bg-green-50 text-[10px] px-1.5"
												>
													{member.specialOrder.soNumber}
												</Badge>
												<Button
													size="sm"
													variant="outline"
													className="h-7 text-xs"
													onClick={() =>
														handleViewSO(
															member.specialOrder!.specialOrderId,
														)
													}
												>
													<Eye className="mr-1 size-3" />
													View
												</Button>
											</div>
										) : canUpload(member) ? (
											<div className="flex items-center gap-2">
												<Input
													type="text"
													placeholder="SO#"
													className="h-7 w-[100px] text-xs"
													value={soNumbers[member.userId] ?? ""}
													onChange={(e) =>
														setSoNumbers((prev) => ({
															...prev,
															[member.userId]: e.target.value,
														}))
													}
												/>
												<Input
													type="file"
													accept=".pdf"
													className="h-7 w-[120px] text-xs file:h-5 file:text-[10px]"
													onChange={(e) =>
														setFiles((prev) => ({
															...prev,
															[member.userId]:
																e.target.files?.[0] ?? null,
														}))
													}
												/>
												<Button
													size="sm"
													className="h-7 text-xs"
													disabled={
														!soNumbers[member.userId] ||
														!files[member.userId] ||
														uploadingMemberId === member.userId
													}
													onClick={() => handleUpload(member)}
												>
													{uploadingMemberId === member.userId
														? "Uploading..."
														: "Upload"}
												</Button>
											</div>
										) : (
											<span className="text-xs text-muted-foreground">
												No SO
											</span>
										)}
									</div>
									{uploadErrors[member.userId] && (
										<span className="ml-12 text-xs text-red-500">
											{uploadErrors[member.userId]}
										</span>
									)}
								</li>
							))}
						</ul>
					</DialogContent>
				</Dialog>
			</div>
		</PageCard>
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
		<PageCard noOverflow>
			<div className="px-6 py-3 border-b border-border">
				<h2 className="text-sm font-semibold text-heading">Document History</h2>
			</div>
			<div className="px-6 py-4">
				<ul className="relative space-y-6 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-border">
					{history.map((item, idx) => (
						<li key={item.id} className="relative flex items-start gap-4 pl-8">
							<div
								className={`absolute left-0 mt-1 size-[22px] rounded-full border-[3px] border-white shadow-sm ring-1 ring-border ${idx === 0 ? "bg-brand-primary" : "bg-background"}`}
							/>
							<div className="flex flex-1 flex-col gap-1">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-foreground">
											Version {item.version}
										</span>
										<Badge
											className={`${
												item.status === "Current"
													? "bg-blue-50 text-blue-600 border-blue-100"
													: item.status === "Returned"
														? "bg-red-50 text-red-600 border-red-100"
														: "bg-gray-50 text-gray-600 border-gray-100"
											} rounded-md px-2 py-0 h-5 text-[10px] font-semibold uppercase`}
										>
											{item.status}
										</Badge>
									</div>
									<span className="text-xs text-muted-foreground">
										{format(new Date(item.date), "MMM dd, yyyy · hh:mm a")}
									</span>
								</div>
								<p className="text-[13px] text-muted-foreground">
									{item.status === "Returned"
										? "Returned by Technical Panel"
										: `Uploaded by ${item.actorName}`}
								</p>
								{item.comment && (
									<div className="rounded-lg border border-dashed border-border bg-card p-3 text-xs italic text-muted-foreground">
										"{item.comment}"
									</div>
								)}
								{item.status !== "Current" && (
									<Button
										variant="outline"
										size="sm"
										className="w-fit gap-1.5 rounded-lg border-border h-7 text-xs font-medium text-muted-foreground hover:bg-card"
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
		</PageCard>
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
		<PageCard>
			<div className="bg-card border-b border-border px-6 py-3">
				<h2 className="text-sm font-semibold text-heading">Attachments</h2>
			</div>
			<ul className="p-4 flex flex-col gap-3">
				{attachments.map((attachment) => (
					<li
						key={attachment.id}
						className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-brand-primary/30"
					>
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-500">
								<FileText className="size-5" />
							</div>
							<div className="flex flex-1 flex-col overflow-hidden">
								<span className="truncate text-sm font-medium text-foreground">
									{attachment.name}
								</span>
								<span className="text-xs text-muted-foreground">
									{attachment.type} · v{attachment.version}
								</span>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Button
								nativeButton={false}
								variant="outline"
								className="h-8 rounded-lg border-border text-xs font-medium text-muted-foreground hover:bg-background"
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
								className="h-8 rounded-lg border-border text-xs font-medium text-muted-foreground hover:bg-background"
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
		</PageCard>
	);
}

export function ProjectDetailsPage({
	proposalId,
	currentUserId,
	currentUserRole,
}: ProjectDetailsPageProps) {
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
			<PageHeader
				title={
					<h1 className="flex flex-wrap items-center gap-3 text-[22px] font-semibold text-heading">
						<span>{data.title}</span>
						<StatusBadge status={data.status} />
						<span className="text-xs font-normal text-muted-foreground">
							Version {data.version}
						</span>
					</h1>
				}
				actions={
					<BrandButton
						nativeButton={false}
						className="flex w-fit items-center gap-2 px-5 h-9 !text-white hover:!text-white shadow-[0px_1px_2px_0px_var(--shadow-card)] hover:bg-brand-primary-hover"
						render={
							<Link to="/proposals/$proposalId" params={{ proposalId }} />
						}
					>
						<Eye className="size-4" />
						<span className="text-sm font-medium">Read Proposal Document</span>
					</BrandButton>
				}
			/>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				{/* Main Column */}
				<div className="lg:col-span-8 flex flex-col gap-6">
					<ProjectOverviewCard
						metadata={data.metadata}
						members={data.members}
						currentUserId={currentUserId}
						currentUserRole={currentUserRole}
						proposalId={proposalId}
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
