import { ChevronRight, Eye, User } from "lucide-react";
import { DetailsRow } from "@/components/custom/details-row";
import { PageCard } from "@/components/custom/page-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { ProjectMember } from "@/types/project";
import {
	canManageSpecialOrders,
	canUploadSpecialOrder,
} from "../helpers/project-details-helpers";
import { useProjectSpecialOrders } from "../hooks/use-project-special-orders";

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
		extensionServices: string[];
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

export function ProjectOverviewCard({
	metadata,
	members,
	currentUserId,
	currentUserRole,
	proposalId,
	status,
}: ProjectOverviewCardProps) {
	const {
		uploadingMemberId,
		soNumbers,
		files,
		uploadErrors,
		setSoNumber,
		setFile,
		handleUpload,
		handleViewSO,
	} = useProjectSpecialOrders(proposalId);

	const isAllowedToManageSO = canManageSpecialOrders(
		currentUserId,
		currentUserRole,
		members,
	);

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
									.map((name) => name[0])
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
				<DetailsRow label="Extension Services Offered">
					{metadata.extensionServices.join(", ") || "None"}
				</DetailsRow>
				{![
					"Draft",
					"Pending Review",
					"Endorsed",
					"Approved",
					"Returned",
					"Rejected",
				].includes(status) && (
					<DetailsRow label="Active MOA">{metadata.moaLinked}</DetailsRow>
				)}
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
								<Badge
									variant="outline"
									className="text-[10px] font-normal text-muted-foreground border-dashed"
								>
									Manage SO
								</Badge>
							)}
							<div className="flex -space-x-2">
								{members.slice(0, 4).map((member) => (
									<Avatar
										key={member.userId}
										className="size-8 border-2 border-white ring-1 ring-border dark:border-border"
									>
										<AvatarImage src={member.avatarUrl} alt={member.name} />
										<AvatarFallback className="bg-gray-100 text-gray-600 text-[10px] dark:bg-muted dark:text-muted-foreground">
											{member.name
												.split(" ")
												.map((name) => name[0])
												.join("")}
										</AvatarFallback>
									</Avatar>
								))}
								{members.length > 4 && (
									<div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-gray-50 text-[10px] font-bold text-muted-foreground ring-1 ring-border dark:border-border dark:bg-muted">
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
									{members.filter((member) => member.specialOrder).length}/
									{members.length} Special Orders uploaded
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
											<AvatarImage src={member.avatarUrl} alt={member.name} />
											<AvatarFallback className="bg-gray-100 text-gray-600 dark:bg-muted dark:text-muted-foreground">
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

										{isAllowedToManageSO &&
											(member.specialOrder ? (
												<div className="flex items-center gap-2">
													<Badge
														variant="outline"
														className="text-green-600 border-green-200 bg-green-50 text-[10px] px-1.5 dark:text-green-300 dark:border-green-900/60 dark:bg-green-950/30"
													>
														{member.specialOrder.soNumber}
													</Badge>
													<Button
														size="sm"
														variant="outline"
														className="h-7 text-xs"
														onClick={() =>
															handleViewSO(
																member.specialOrder?.specialOrderId ?? "",
															)
														}
													>
														<Eye className="mr-1 size-3" />
														View
													</Button>
												</div>
											) : canUploadSpecialOrder(
													status,
													currentUserId,
													currentUserRole,
													members,
												) ? (
												<div className="flex items-center gap-2.5">
													<Input
														type="text"
														placeholder="e.g. SO-2024-001"
														className="h-7 w-[110px] text-xs"
														value={soNumbers[member.userId] ?? ""}
														onChange={(event) =>
															setSoNumber(member.userId, event.target.value)
														}
													/>
													<Input
														type="file"
														accept=".pdf"
														className="h-7 w-[180px] text-xs file:h-5 file:text-[10px]"
														onChange={(event) =>
															setFile(
																member.userId,
																event.target.files?.[0] ?? null,
															)
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
														{uploadingMemberId === member.userId ? (
															<Spinner className="size-3" />
														) : (
															"Upload"
														)}
													</Button>
												</div>
											) : (
												<span className="text-xs text-muted-foreground">
													No SO
												</span>
											))}
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
