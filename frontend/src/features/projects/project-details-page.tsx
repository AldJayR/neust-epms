import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useReducer, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreateProposalModal } from "@/features/proposals";
import { getProposalByIdFn } from "@/features/proposals/public";
import type { AuthUser } from "@/lib/auth";
import { toDateOnly, toManilaDisplayDate } from "@/lib/dates";
import type { DirectorDashboardState } from "@/lib/director-dashboard-state";
import { getStatusDescription } from "@/lib/status-descriptions";
import { ActivateProjectWizard } from "./components/activate-project-wizard";
import { ActivityHistoryCard } from "./components/activity-history-card";
import { AttachmentsCard } from "./components/attachments-card";
import { CloseProjectDialog } from "./components/close-project-dialog";
import { ProjectDetailsHeader } from "./components/project-details-header";
import { ProjectDetailsSkeleton } from "./components/project-details-skeleton";
import { ProjectOverviewCard } from "./components/project-overview-card";
import { projectDetailsQueryOptions } from "./functions";
import {
	canReadProject,
	canSubmitProjectReports,
	isProjectLeader,
} from "./helpers/project-details-helpers";
import { projectReadinessQueryOptions } from "./readiness.functions";
import { ReportingScheduleCard } from "./reporting-schedule-card";
import {
	TerminalResultsCard,
	useTerminalResults,
} from "./terminal-results-card";

interface ProjectDetailsPageProps {
	proposalId: string;
	currentUser: AuthUser;
	dashboardContext?: DirectorDashboardState;
	initialAction?: "activation";
	onActionHandled?: () => void;
}

export function ProjectDetailsPage({
	proposalId,
	currentUser,
	dashboardContext,
	initialAction,
	onActionHandled,
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

	const readinessQuery = useQuery({
		...projectReadinessQueryOptions(proposalId),
		refetchOnMount: initialAction === "activation" ? "always" : true,
	});
	const readiness = readinessQuery.data;
	const [showActivateWizard, setShowActivateWizard] = useState(false);
	const [showCloseDialog, setShowCloseDialog] = useState(false);

	if (isLoading) {
		return <ProjectDetailsSkeleton />;
	}

	if (error && !data)
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
				beneficiarySectors:
					editProposalData.sectors ??
					editProposalData.beneficiarySectors.map((sectorName) => ({
						sectorName,
					})),
				targetStartDate: editProposalData.targetStartDate
					? toDateOnly(toManilaDisplayDate(editProposalData.targetStartDate))
					: "",
				targetEndDate: editProposalData.targetEndDate
					? toDateOnly(toManilaDisplayDate(editProposalData.targetEndDate))
					: "",
				budgetPartner: Number(editProposalData.budgetPartner ?? 0),
				budgetNeust: Number(editProposalData.budgetNeust ?? 0),
				members: (editProposalData.members ?? []).map((member) => ({
					...member,
					specificRole: member.specificRole ?? "",
				})),
			}
		: undefined;

	const isDirector = currentUserRole === "Director";
	const statusDescription = projectLeader
		? getStatusDescription(data.status)
		: undefined;
	const showActivateButton =
		isDirector && data.status === "Institutionally Approved";
	const showCloseButton = isDirector && data.status === "Pending Completion";

	return (
		<div className="flex flex-col gap-6">
			<ProjectDetailsHeader
				dashboardContext={dashboardContext}
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
				hasSignedSpecialOrder={!!data.signedSpecialOrderDocPath}
			/>
			{initialAction === "activation" &&
				showActivateButton &&
				!readinessQuery.isFetchedAfterMount &&
				readinessQuery.isFetching && (
					<p role="status" className="text-sm text-muted-foreground">
						Checking activation requirements…
					</p>
				)}
			{initialAction === "activation" &&
				showActivateButton &&
				readinessQuery.isError && (
					<Alert variant="destructive">
						<AlertTitle>Unable to check activation requirements</AlertTitle>
						<AlertDescription>
							<Button
								variant="outline"
								size="sm"
								disabled={readinessQuery.isFetching}
								onClick={() => void readinessQuery.refetch()}
							>
								Try again
							</Button>
						</AlertDescription>
					</Alert>
				)}
			{initialAction === "activation" &&
				(!showActivateButton || (readiness && !readiness.isReady)) && (
					<Alert>
						<Info />
						<AlertTitle>Activation requirements have changed</AlertTitle>
						<AlertDescription>
							{readiness?.blocker
								? `Complete ${readiness.blocker.toLowerCase()} before activation.`
								: "Check this project's current status before continuing."}
						</AlertDescription>
					</Alert>
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
							<p>
								As the project leader, you must print the{" "}
								<strong>proposal document</strong>, the{" "}
								<strong>Special Orders</strong>, and the{" "}
								<strong>
									endorsement document signed by the College Dean/Campus
									Director
								</strong>
								. Submit all physical copies to the Extension Services
								Department Office for their records.
							</p>
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
					{["Ongoing", "Overdue", "Pending Completion", "Completed"].includes(
						data.status,
					) && (
						<section
							id="reporting-schedule"
							tabIndex={-1}
							aria-label="Project reporting schedule"
							className="scroll-mt-6"
						>
							<ReportingScheduleCard
								projectId={proposalId}
								canSubmitReports={canSubmitReports}
								allowAttachmentUpload={[
									"Ongoing",
									"Overdue",
									"Pending Completion",
								].includes(data.status)}
							/>
						</section>
					)}
					<ActivityHistoryCard history={data.history} />
					{["Ongoing", "Overdue", "Pending Completion", "Completed"].includes(
						data.status,
					) && (
						<section
							id="terminal-results"
							tabIndex={-1}
							aria-label="Terminal report and project results"
							className="scroll-mt-6"
						>
							<TerminalResultsCard
								projectId={proposalId}
								status={data.status}
							/>
						</section>
					)}
				</div>

				{isAllowedToReadProposal && (
					<div className="lg:col-span-4 flex flex-col gap-6">
						<AttachmentsCard
							attachments={data.attachments}
							proposalId={proposalId}
						/>
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
				hasExistingSpecialOrderDocument={
					editProposalData?.hasSpecialOrderDocument
				}
			/>

			<ActivateProjectWizard
				open={
					showActivateWizard ||
					(initialAction === "activation" &&
						showActivateButton &&
						!readinessQuery.isError &&
						readinessQuery.isFetchedAfterMount &&
						Boolean(readiness?.isReady))
				}
				onOpenChange={(open) => {
					setShowActivateWizard(open);
					if (!open && initialAction === "activation") onActionHandled?.();
				}}
				projectId={proposalId}
				targetStartDate={data.targetStartDate}
				targetEndDate={data.targetEndDate}
			/>

			{showCloseButton && showCloseDialog && (
				<CloseProjectDialog
					open={showCloseDialog}
					onOpenChange={setShowCloseDialog}
					projectId={proposalId}
					projectTitle={data.title}
					traineeCount={terminalResults.data?.traineeCount}
				/>
			)}
		</div>
	);
}
