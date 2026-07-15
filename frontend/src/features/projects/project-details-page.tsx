import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useReducer, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreateProposalModal } from "@/features/proposals";
import { getProposalByIdFn } from "@/features/proposals/public";
import { useProjectReadiness } from "@/hooks/use-project-readiness";
import type { AuthUser } from "@/lib/auth";
import { getStatusDescription } from "@/lib/status-descriptions";
import { ActivateProjectWizard } from "./components/activate-project-wizard";
import { ActivityHistoryCard } from "./components/activity-history-card";
import { AttachmentsCard } from "./components/attachments-card";
import { ProjectDetailsHeader } from "./components/project-details-header";
import { ProjectDetailsSkeleton } from "./components/project-details-skeleton";
import { ProjectOverviewCard } from "./components/project-overview-card";
import { closeProjectFn, projectDetailsQueryOptions } from "./functions";
import {
	canReadProject,
	isProjectLeader,
} from "./helpers/project-details-helpers";
import { ProjectReadinessCard } from "./project-readiness-card";
import { ReportingScheduleCard } from "./reporting-schedule-card";

interface ProjectDetailsPageProps {
	proposalId: string;
	currentUser: AuthUser;
}

export function ProjectDetailsPage({
	proposalId,
	currentUser,
}: ProjectDetailsPageProps) {
	const { userId: currentUserId, roleName: currentUserRole } = currentUser;
	const queryClient = useQueryClient();
	const { data, isLoading } = useQuery(projectDetailsQueryOptions(proposalId));

	const [isEditing, dispatchEditing] = useReducer(
		(_state: boolean, open: boolean) => open,
		false,
	);
	const { data: editProposalData } = useQuery({
		queryKey: ["proposal", "edit", proposalId],
		queryFn: () => getProposalByIdFn({ data: { proposalId } }),
		enabled: isEditing,
	});

	const { data: readiness } = useProjectReadiness(proposalId);
	const [showActivateWizard, setShowActivateWizard] = useState(false);
	const [showCloseDialog, setShowCloseDialog] = useState(false);

	const closeMutation = useMutation({
		mutationFn: closeProjectFn,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["dashboard", "proposals", proposalId],
			});
			toast.success("Project closed successfully!");
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

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

	const isAllowedToReadProposal = canReadProject(
		currentUserId,
		currentUserRole,
		data.members,
	);
	const projectLeader = isProjectLeader(currentUserId, data.members);
	const isEditable =
		projectLeader && ["Draft", "Returned"].includes(data.status);

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
				members: data.members.map((member) => ({
					userId: member.userId,
					projectRole: member.role,
					name: member.name,
				})),
			}
		: undefined;

	const isDirector = currentUserRole === "Director";
	const statusDescription = projectLeader
		? getStatusDescription(data.status)
		: undefined;
	const showActivateButton = isDirector && data.status === "Approved";
	const showCloseButton = isDirector && data.status === "Ongoing";

	return (
		<div className="flex flex-col gap-6">
			<ProjectDetailsHeader
				proposalId={proposalId}
				title={data.title}
				status={data.status}
				isAllowedToReadProposal={isAllowedToReadProposal}
				isEditable={isEditable}
				showActivateButton={showActivateButton}
				showCloseButton={showCloseButton}
				activateReady={readiness?.isReady ?? false}
				statusDescription={statusDescription}
				onEdit={() => dispatchEditing(true)}
				onActivate={() => setShowActivateWizard(true)}
				onClose={() => setShowCloseDialog(true)}
			/>

			{data.status === "Approved" && readiness && (
				<ProjectReadinessCard
					isReady={readiness.isReady}
					prerequisites={readiness.prerequisites}
					blocker={readiness.blocker}
				/>
			)}

			{data.status === "Approved" && projectLeader && (
				<Alert>
					<Info className="size-4 text-blue-500" />
					<AlertTitle>Your proposal has been approved!</AlertTitle>
					<AlertDescription className="space-y-2">
						<p>
							Great news — your project proposal has been approved. Here's what
							to do next:
						</p>
						<ol className="list-decimal pl-5 space-y-1">
							<li>
								<strong>Print the proposal document</strong> and submit the
								physical copy to the Extension Services Department Office for
								their records.
							</li>
							<li>
								<strong>Upload the Special Order</strong> for each project
								member — you can do this by opening the Project Team section
								below and uploading the corresponding SO for each team member.
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
				<div
					className={`${isAllowedToReadProposal ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-6`}
				>
					<ProjectOverviewCard
						metadata={data.metadata}
						members={data.members}
						currentUserId={currentUserId}
						currentUserRole={currentUserRole}
						proposalId={proposalId}
						status={data.status}
					/>
					{[
						"Ongoing",
						"Overdue",
						"Pending Closure",
						"Completed",
						"Closed",
					].includes(data.status) && (
						<ReportingScheduleCard
							projectId={proposalId}
							canSubmitReports={[
								"Faculty",
								"RET Chair",
							].includes(currentUserRole)}
						/>
					)}
					<ActivityHistoryCard history={data.history} />
				</div>

				{isAllowedToReadProposal && (
					<div className="lg:col-span-4 flex flex-col gap-6">
						<AttachmentsCard attachments={data.attachments} />
					</div>
				)}
			</div>

			<CreateProposalModal
				open={isEditing}
				onOpenChange={(open) => {
					if (!open) {
						queryClient.invalidateQueries({
							queryKey: ["dashboard", "proposals", proposalId],
						});
					}
					dispatchEditing(open);
				}}
				user={currentUser}
				initialData={editInitialData}
				editingProposalId={proposalId}
				currentStatus={data.status}
			/>

			<ActivateProjectWizard
				open={showActivateWizard}
				onOpenChange={setShowActivateWizard}
				projectId={proposalId}
			/>

			<ConfirmDialog
				open={showCloseDialog}
				onOpenChange={setShowCloseDialog}
				onConfirm={async () => {
					await closeMutation.mutateAsync({ data: { projectId: proposalId } });
				}}
				title="Close Project"
				description={`This will permanently close the project "${data.title}". It requires both a Final Accomplishment report and a Terminal report to be submitted. This action cannot be undone.`}
				confirmLabel="Close Project"
				confirmVariant="destructive"
				requireTyping="CLOSE"
			/>
		</div>
	);
}
