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
import { toDateOnly, toManilaDisplayDate } from "@/lib/dates";
import { getStatusDescription } from "@/lib/status-descriptions";
import { invalidateWorkflowQueries } from "@/lib/workflow-queries";
import { ActivateProjectWizard } from "./components/activate-project-wizard";
import { ActivityHistoryCard } from "./components/activity-history-card";
import { AttachmentsCard } from "./components/attachments-card";
import { ProjectDetailsHeader } from "./components/project-details-header";
import { ProjectDetailsSkeleton } from "./components/project-details-skeleton";
import { ProjectOverviewCard } from "./components/project-overview-card";
import { closeProjectFn, projectDetailsQueryOptions } from "./functions";
import {
	canReadProject,
	canSubmitProjectReports,
	isProjectLeader,
} from "./helpers/project-details-helpers";
import { ProjectReadinessCard } from "./project-readiness-card";
import { ReportingScheduleCard } from "./reporting-schedule-card";
import {
	TerminalResultsCard,
	useTerminalResults,
} from "./terminal-results-card";

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
	const { data, isLoading, error } = useQuery(
		projectDetailsQueryOptions(proposalId),
	);
	const terminalResults = useTerminalResults(proposalId);

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
		onSuccess: async () => {
			await invalidateWorkflowQueries(queryClient);
			toast.success("Project closed successfully!");
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	if (isLoading) {
		return <ProjectDetailsSkeleton />;
	}

	if (error)
		return (
			<div role="alert" className="p-6">
				Unable to load project details. Please reload to try again.
			</div>
		);
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
	const canSubmitReports = canSubmitProjectReports(currentUserId, data.members);
	const isEditable =
		projectLeader && ["Draft", "Returned"].includes(data.status);

	const editInitialData = editProposalData
		? {
				title: editProposalData.title,
				bannerProgramId: editProposalData.bannerProgramId ?? 0,
				projectLocale: editProposalData.projectLocale,
				extensionServiceIds: editProposalData.extensionServices.map(
					(service) => service.extensionServiceId,
				),
				campusId: editProposalData.campusId.toString(),
				departmentId: editProposalData.departmentId?.toString() ?? "",
				sdgIds: editProposalData.sdgIds,
				beneficiarySectors: editProposalData.beneficiarySectors,
				targetStartDate: editProposalData.targetStartDate
					? toDateOnly(toManilaDisplayDate(editProposalData.targetStartDate))
					: "",
				targetEndDate: editProposalData.targetEndDate
					? toDateOnly(toManilaDisplayDate(editProposalData.targetEndDate))
					: "",
				budgetPartner: Number(editProposalData.budgetPartner ?? 0),
				budgetNeust: Number(editProposalData.budgetNeust ?? 0),
				members: (editProposalData.members ?? []).map((m) => ({
					...m,
					soNumber: m.soNumber ?? "",
				})),
			}
		: undefined;

	const isDirector = currentUserRole === "Director";
	const statusDescription = projectLeader
		? getStatusDescription(data.status)
		: undefined;
	const showActivateButton =
		isDirector && data.status === "Institutionally Approved";
	const showCloseButton = isDirector && data.status === "Pending Closure";

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
				isDirector={isDirector}
			/>

			{(data.status === "Approved" ||
				data.status === "Institutionally Approved") &&
				readiness && (
					<ProjectReadinessCard
						isReady={readiness.isReady}
						prerequisites={readiness.prerequisites}
						blocker={readiness.blocker}
					/>
				)}

			{(data.status === "Approved" ||
				data.status === "Institutionally Approved") &&
				projectLeader && (
					<Alert>
						<Info className="size-4 text-blue-500" />
						<AlertTitle>Your proposal has been approved!</AlertTitle>
						<AlertDescription className="space-y-2">
							<p>
								Great news — your project proposal has been approved. Here's
								what to do next:
							</p>
							<ol className="list-decimal pl-5 space-y-1">
								<li>
									<strong>Print the proposal document</strong> and submit the
									physical copy to the Extension Services Department Office for
									their records.
								</li>
								<li>
									<strong>Check the Special Orders</strong> in Project Team. A
									Special Order PDF must be on file for every team member before
									activation.
								</li>
							</ol>
							<p className="pt-1">
								The Director must record the signed institutional approval
								document and activate the project before work begins.
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
							canSubmitReports={canSubmitReports}
							allowAttachmentUpload={[
								"Ongoing",
								"Overdue",
								"Pending Closure",
							].includes(data.status)}
						/>
					)}
					<ActivityHistoryCard history={data.history} />
					{["Ongoing", "Overdue", "Pending Closure", "Closed"].includes(
						data.status,
					) && (
						<TerminalResultsCard projectId={proposalId} status={data.status} />
					)}
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
				hasExistingProposalDocument={editProposalData?.hasProposalDocument}
			/>

			<ActivateProjectWizard
				open={showActivateWizard}
				onOpenChange={setShowActivateWizard}
				projectId={proposalId}
				targetStartDate={data.targetStartDate}
				targetEndDate={data.targetEndDate}
			/>

			<ConfirmDialog
				open={showCloseDialog}
				onOpenChange={setShowCloseDialog}
				onConfirm={async () => {
					await closeMutation.mutateAsync({ data: { projectId: proposalId } });
				}}
				title="Close Project"
				description={`Close "${data.title}" with ${terminalResults.data?.traineeCount?.toLocaleString() ?? "no recorded"} trainees. ${terminalResults.data?.completed ? "The required report and evaluation forms are complete." : "Review the terminal report and evaluation forms before approving closure."} Recorded trainee counts will be included in official reports once you approve.`}
				confirmLabel="Close Project"
				confirmVariant="destructive"
				requireTyping="CLOSE"
			/>
		</div>
	);
}
