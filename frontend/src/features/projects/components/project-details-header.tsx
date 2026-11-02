import { Link } from "@tanstack/react-router";
import { Eye, FileUp, Info, Pencil, Play } from "lucide-react";
import { BrandButton } from "@/components/custom/brand-button";
import { PageHeader } from "@/components/custom/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { InstitutionalApprovalDialog } from "@/features/proposals/components/institutional-approval-dialog";
import type { DirectorDashboardState } from "@/lib/director-dashboard-state";

interface ProjectDetailsHeaderProps {
	proposalId: string;
	title: string;
	status: string;
	isAllowedToReadProposal: boolean;
	isEditable: boolean;
	showActivateButton: boolean;
	showCloseButton: boolean;
	activateReady: boolean;
	statusDescription?: { explanation: string; nextStep: string } | null;
	isDirector?: boolean;
	hasSignedSpecialOrder?: boolean;
	onEdit: () => void;
	onActivate: () => void;
	onClose: () => void;
	dashboardContext?: DirectorDashboardState;
}

export function ProjectDetailsHeader({
	proposalId,
	title,
	status,
	isAllowedToReadProposal,
	isEditable,
	showActivateButton,
	showCloseButton,
	activateReady,
	statusDescription,
	isDirector,
	hasSignedSpecialOrder,
	onEdit,
	onActivate,
	onClose,
	dashboardContext,
}: ProjectDetailsHeaderProps) {
	return (
		<>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							render={
								<Link
									to="/dashboard"
									search={{ page: 1, pageSize: 10, ...dashboardContext }}
								/>
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

			<PageHeader
				title={
					<h1 className="flex flex-wrap items-center gap-3 text-[1.375rem] font-semibold text-heading">
						<span>{title}</span>
						<StatusBadge status={status} />
					</h1>
				}
				actions={
					<>
						{isDirector && status === "Approved" && (
							<InstitutionalApprovalDialog
								proposalId={proposalId}
								proposalTitle={title}
								trigger={
									<BrandButton
										type="button"
										className="flex w-fit items-center gap-2 px-4 h-9 shadow-[0px_1px_2px_0px_var(--shadow-card)]"
									>
										<FileUp className="size-4" />
										<span className="text-sm font-medium">
											Upload Signed Documents
										</span>
									</BrandButton>
								}
							/>
						)}
						{isDirector &&
							status === "Institutionally Approved" &&
							hasSignedSpecialOrder === false && (
								<InstitutionalApprovalDialog
									proposalId={proposalId}
									proposalTitle={title}
									signedSpecialOrderOnly
									trigger={
										<BrandButton type="button" className="h-9 gap-2 text-sm">
											<FileUp className="size-4" />
											Upload Signed Special Order
										</BrandButton>
									}
								/>
							)}
						{isAllowedToReadProposal ? (
							<BrandButton
								nativeButton={false}
								className="flex w-fit items-center gap-2 px-5 h-9 shadow-[0px_1px_2px_0px_var(--shadow-card)]"
								render={
									<Link
										to="/proposals/$proposalId"
										params={{ proposalId }}
										search={{ dashboard: dashboardContext }}
									/>
								}
							>
								<Eye className="size-4" />
								<span className="text-sm font-medium">
									Read Proposal Document
								</span>
							</BrandButton>
						) : undefined}
						{isEditable && (
							<Button
								variant="outline"
								className="flex w-fit items-center gap-2 px-5 h-9 shadow-[0px_1px_2px_0px_var(--shadow-card)]"
								onClick={onEdit}
							>
								<Pencil className="size-4" />
								<span className="text-sm font-medium">Edit</span>
							</Button>
						)}
						{showActivateButton && (
							<Button
								variant="outline"
								className="flex w-fit items-center gap-2 px-5 h-9 shadow-[0px_1px_2px_0px_var(--shadow-card)]"
								disabled={!activateReady}
								title={
									!activateReady
										? "Prerequisites must be met before activating project"
										: undefined
								}
								onClick={onActivate}
							>
								<Play className="size-4" />
								<span className="text-sm font-medium">Activate Project</span>
							</Button>
						)}
						{showCloseButton && (
							<Button
								variant="destructive"
								className="flex w-fit items-center gap-2 px-4 h-9"
								onClick={onClose}
							>
								<span className="text-sm font-medium">Approve Completion</span>
							</Button>
						)}
					</>
				}
			/>

			{statusDescription && (
				<Alert className="-mt-2 text-xs">
					<Info />
					<AlertDescription className="space-y-1 text-xs">
						<p className="font-semibold text-foreground">
							{statusDescription.explanation}
						</p>
						<p>
							<span className="font-semibold text-foreground">Next Step:</span>{" "}
							{statusDescription.nextStep}
						</p>
					</AlertDescription>
				</Alert>
			)}
		</>
	);
}
