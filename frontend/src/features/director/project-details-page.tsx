import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useState } from "react";
import { ChevronRight, Download, Eye, FileText, Info, Pencil, User } from "lucide-react";
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
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
} from "@/components/ui/attachment";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
	API_BASE,
	type ProjectMember,
	getAccessTokenForUploadFn,
	getSpecialOrderSignedUrlFn,
	projectDetailsQueryOptions,
} from "@/lib/dashboard.functions";
import type { AuthUser } from "@/lib/auth";
import { CreateProposalModal } from "@/features/proposals/components/create-proposal-modal";
import { getProposalByIdFn } from "@/lib/ret.functions";
import { ProjectDetailsSkeleton } from "./project-details-skeleton";

interface ProjectDetailsPageProps {
	proposalId: string;
	currentUser: AuthUser;
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
	status: string;
}

function ProjectOverviewCard({
	metadata,
	members,
	currentUserId,
	currentUserRole,
	proposalId,
	status,
}: ProjectOverviewCardProps) {
	const queryClient = useQueryClient();
	const [uploadingMemberId, setUploadingMemberId] = useState<string | null>(null);
	const [soNumbers, setSoNumbers] = useState<Record<string, string>>({});
	const [files, setFiles] = useState<Record<string, File | null>>({});
	const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

	const isAllowedToManageSO =
		currentUserRole === "Director" ||
		currentUserRole === "RET Chair" ||
		members.some((m) => m.userId === currentUserId);

	function canUpload(_member: ProjectMember): boolean {
		if (status !== "Approved") return false;
		if (currentUserRole === "Director") return true;
		if (members.some((m) => m.userId === currentUserId && m.role === "Project Leader"))
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
			const token = await getAccessTokenForUploadFn();
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
								className="flex w-full items-center justify-between px-6 py-3 transition-colors hover:bg-card cursor-pointer"
							/>
						}
					>
						<span className="text-sm text-muted-foreground">Project Team</span>
						<div className="flex items-center gap-4">
							{isAllowedToManageSO && (
								<Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-dashed">
									Manage SO
								</Badge>
							)}
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
					<DialogContent className="sm:max-w-[680px] rounded-xl p-6">
						<DialogHeader className="pb-2">
							<DialogTitle className="text-base font-semibold text-heading">
								Project Members
							</DialogTitle>
							{isAllowedToManageSO && (
								<span className="text-xs text-muted-foreground">
									{members.filter((m) => m.specialOrder).length}/{members.length} Special Orders uploaded
								</span>
							)}
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

										{isAllowedToManageSO && (
											member.specialOrder ? (
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
												<div className="flex items-center gap-2.5">
													<Input
														type="text"
														placeholder="SO#"
														className="h-7 w-[110px] text-xs"
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
														className="h-7 w-[180px] text-xs file:h-5 file:text-[10px]"
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
											)
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
										? `Returned by ${item.actorName}`
										: item.status === "Endorsed"
											? `Endorsed by ${item.actorName}`
											: item.status === "Approved"
												? `Approved by ${item.actorName}`
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
			<div className="p-4 flex flex-col gap-2">
				{attachments.map((attachment) => (
					<Attachment key={attachment.id} state="done" className="w-full">
						<AttachmentMedia>
							<FileText className="size-4" />
						</AttachmentMedia>
						<AttachmentContent>
							<AttachmentTitle>{attachment.name}</AttachmentTitle>
							<AttachmentDescription>
								{attachment.type} · {attachment.version}
							</AttachmentDescription>
						</AttachmentContent>
						<AttachmentActions>
							<AttachmentAction
								render={
									<a
										href={attachment.url}
										target="_blank"
										rel="noopener noreferrer"
									/>
								}
								aria-label="View"
							>
								<Eye className="size-3.5" />
							</AttachmentAction>
							<AttachmentAction
								render={<a href={attachment.url} download />}
								aria-label="Download"
							>
								<Download className="size-3.5" />
							</AttachmentAction>
						</AttachmentActions>
					</Attachment>
				))}
			</div>
		</PageCard>
	);
}

export function ProjectDetailsPage({
	proposalId,
	currentUser,
}: ProjectDetailsPageProps) {
	const { userId: currentUserId, roleName: currentUserRole } = currentUser;
	const queryClient = useQueryClient();
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

	const isAllowedToReadProposal =
		currentUserRole === "Director" ||
		currentUserRole === "RET Chair" ||
		(data.members && data.members.some((m) => m.userId === currentUserId));

	const [isEditing, setIsEditing] = useState(false);

	const { data: editProposalData } = useQuery({
		queryKey: ["proposal", "edit", proposalId],
		queryFn: () => getProposalByIdFn({ data: { proposalId } }),
		enabled: isEditing,
	});

	const isProjectLeader =
		data.members?.some(
			(m) => m.userId === currentUserId && m.role === "Project Leader",
		) ?? false;

	const isEditable =
		isProjectLeader &&
		!["Approved", "Ongoing", "Closed"].includes(data.status);

	const editInitialData = editProposalData
		? {
				title: editProposalData.title,
				bannerProgram: editProposalData.bannerProgram,
				projectLocale: editProposalData.projectLocale,
				extensionCategory: editProposalData.extensionCategory,
				campusId: editProposalData.campusId.toString(),
				departmentId: editProposalData.departmentId?.toString() ?? "",
				sdgIds: [] as number[],
				targetStartDate: editProposalData.targetStartDate ?? "",
				targetEndDate: editProposalData.targetEndDate ?? "",
				budgetPartner: Number(editProposalData.budgetPartner ?? 0),
				budgetNeust: Number(editProposalData.budgetNeust ?? 0),
				members: data.members.map((m) => ({
					userId: m.userId,
					projectRole: m.role,
					name: m.name,
				})),
			}
		: undefined;

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
					</h1>
				}
				actions={
					<>
						{isAllowedToReadProposal ? (
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
						) : undefined}
						{isEditable && (
							<Button
								variant="outline"
								className="flex w-fit items-center gap-2 px-5 h-9 shadow-[0px_1px_2px_0px_var(--shadow-card)]"
								onClick={() => setIsEditing(true)}
							>
								<Pencil className="size-4" />
								<span className="text-sm font-medium">Edit</span>
							</Button>
						)}
					</>
				}
			/>

			{data.status === "Approved" && (
				<Alert>
					<Info className="size-4 text-blue-500" />
					<AlertTitle>Your proposal has been approved!</AlertTitle>
					<AlertDescription className="space-y-2">
						<p>
							Great news — your project proposal has been approved. Here's what to do next:
						</p>
						<ol className="list-decimal pl-5 space-y-1">
							<li>
								<strong>Print the proposal document</strong> and submit the physical
								copy to the Extension Services Department Office for their records.
							</li>
							<li>
								<strong>Upload the Special Order</strong> for each project member —
								you can do this by opening the Project Team section below and
								uploading the corresponding SO for each team member.
							</li>
						</ol>
						<p className="pt-1">
							Once the Special Orders are in place, the project lead can request
							the Director to activate the project so work can officially begin.
						</p>
					</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				{/* Main Column */}
				<div className={`${isAllowedToReadProposal ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-6`}>
					<ProjectOverviewCard
						metadata={data.metadata}
						members={data.members}
						currentUserId={currentUserId}
						currentUserRole={currentUserRole}
						proposalId={proposalId}
						status={data.status}
					/>
					<DocumentHistoryCard history={data.history} />
				</div>

				{/* Sidebar */}
				{isAllowedToReadProposal && (
					<div className="lg:col-span-4 flex flex-col gap-6">
						<AttachmentsCard attachments={data.attachments} />
					</div>
				)}
			</div>

			<CreateProposalModal
				open={isEditing}
				onOpenChange={(v) => {
					setIsEditing(v);
					if (!v) {
						queryClient.invalidateQueries({
							queryKey: ["dashboard", "proposals", proposalId],
						});
					}
				}}
				user={currentUser}
				initialData={editInitialData}
				editingProposalId={proposalId}
			/>
		</div>
	);
}
