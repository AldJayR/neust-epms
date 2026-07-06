import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { AuthUser } from "@/lib/auth";
import {
	createProposalFn,
	sdgsQueryOptions,
	submitProposalFn,
	updateProposalFn,
	uploadProposalDocumentFn,
} from "@/lib/ret.functions";
import { ProposalStepDetails } from "./proposal-step-details";
import { ProposalStepDocuments } from "./proposal-step-documents";
import { ProposalStepInfo } from "./proposal-step-info";
import { ProposalStepMembers } from "./proposal-step-members";
import { ProposalStepRequirements } from "./proposal-step-requirements";

const formSchema = z
	.object({
		title: z.string().min(1, "Project title is required"),
		bannerProgram: z.string().min(1, "Banner program is required"),
		projectLocale: z.string().min(1, "Project locale is required"),
		extensionCategory: z.string().min(1, "Extension category is required"),
		campusId: z.string().min(1, "Campus is required"),
		departmentId: z.string().min(1, "Department is required"),
		sdgIds: z.array(z.number()).min(1, "Select at least one SDG"),
		targetStartDate: z.string().min(1, "Start date is required"),
		targetEndDate: z.string().min(1, "End date is required"),
		budgetPartner: z.number().min(0, "Budget cannot be negative"),
		budgetNeust: z.number().min(0, "Budget cannot be negative"),
		members: z
			.array(
				z.object({
					userId: z.uuid(),
					projectRole: z.string().min(1, "Role is required"),
					name: z.string(), // helper for UI
				}),
			)
			.min(1, "At least one team member is required"),
	})
	.refine(
		(data) => {
			if (!data.targetStartDate || !data.targetEndDate) return true;
			const start = new Date(data.targetStartDate);
			const end = new Date(data.targetEndDate);
			return end >= start;
		},
		{
			message: "End date must be on or after the start date",
			path: ["targetEndDate"],
		},
	);

export type FormValues = z.infer<typeof formSchema>;

interface CreateProposalModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: AuthUser;
	initialData?: Partial<FormValues>;
	editingProposalId?: string;
	currentStatus?: string;
}

export function CreateProposalModal({
	open,
	onOpenChange,
	user,
	initialData,
	editingProposalId,
	currentStatus,
}: CreateProposalModalProps) {
	const [state, setState] = React.useReducer(
		(
			prev: {
				step: number;
				file: File | null;
				uploadProgress: number;
				uploadPhase: "idle" | "creating" | "uploading" | "done";
			},
			next:
				| Partial<typeof prev>
				| ((current: typeof prev) => Partial<typeof prev>),
		) => {
			const patch = typeof next === "function" ? next(prev) : next;
			return { ...prev, ...patch };
		},
		{
			step: 1,
			file: null,
			uploadProgress: 0,
			uploadPhase: "idle" as const,
		},
	);

	const { step, file, uploadProgress, uploadPhase } = state;
	const queryClient = useQueryClient();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		mode: "onChange",
		defaultValues: {
			title: "",
			bannerProgram: "",
			projectLocale: "",
			extensionCategory: "",
			campusId: user.campusId.toString(),
			departmentId: user.departmentId?.toString() ?? "",
			sdgIds: [],
			targetStartDate: "",
			targetEndDate: "",
			budgetPartner: 0,
			budgetNeust: 0,
			members: [
				{
					userId: user.userId,
					projectRole: "Project Leader",
					name: `${user.firstName} ${user.lastName}`,
				},
			],
		},
	});

	React.useEffect(() => {
		if (open && initialData) {
			form.reset(initialData);
		}
	}, [open, initialData, form]);

	const isEditing = !!editingProposalId;

	const { data: sdgsData } = useQuery(sdgsQueryOptions());

	const updateProposalMutation = useMutation({
		mutationFn: updateProposalFn,
	});

	const submitProposalMutation = useMutation({
		mutationFn: submitProposalFn,
	});

	const createProposalMutation = useMutation({
		mutationFn: createProposalFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			queryClient.invalidateQueries({ queryKey: ["ret"] });
		},
	});

	const uploadDocumentMutation = useMutation({
		mutationFn: uploadProposalDocumentFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			queryClient.invalidateQueries({ queryKey: ["ret"] });
		},
	});

	const handleSave = async (shouldSubmit: boolean) => {
		if (shouldSubmit && !isEditing && !file) {
			toast.error("Please upload the Project Proposal PDF");
			return;
		}

		let timer: ReturnType<typeof setInterval> | null = null;
		const values = form.getValues();

		try {
			setState({ uploadPhase: "creating", uploadProgress: 0 });

			let proposalId = editingProposalId ?? "";

			if (isEditing && editingProposalId) {
				await updateProposalMutation.mutateAsync({
					data: {
						proposalId: editingProposalId,
						title: values.title,
						bannerProgram: values.bannerProgram,
						projectLocale: values.projectLocale,
						extensionCategory: values.extensionCategory,
						budgetPartner: values.budgetPartner,
						budgetNeust: values.budgetNeust,
					},
				});
			} else {
				const proposal = await createProposalMutation.mutateAsync({
					data: {
						campusId: Number(values.campusId),
						departmentId: Number(values.departmentId),
						title: values.title,
						bannerProgram: values.bannerProgram,
						projectLocale: values.projectLocale,
						extensionCategory: values.extensionCategory,
						budgetPartner: values.budgetPartner,
						budgetNeust: values.budgetNeust,
						targetStartDate: new Date(values.targetStartDate).toISOString(),
						targetEndDate: new Date(values.targetEndDate).toISOString(),
						sdgIds: values.sdgIds,
						members: values.members.map((m) => ({
							userId: m.userId,
							projectRole: m.projectRole,
						})),
					},
				});
				proposalId = proposal.proposalId;
			}

			if (file) {
				setState({ uploadProgress: 30, uploadPhase: "uploading" });

				const fileSizeMB = file.size / 1024 / 1024;
				const baseInterval = 80;
				const interval = Math.max(40, baseInterval - fileSizeMB * 2);
				const increment = Math.max(1, Math.min(8, 30 / fileSizeMB));

				timer = setInterval(() => {
					setState((curr) => {
						const next = curr.uploadProgress + increment;
						return { uploadProgress: next >= 95 ? 95 : next };
					});
				}, interval);

				const formData = new FormData();
				formData.append("file", file);
				formData.append("proposalId", proposalId);

				await uploadDocumentMutation.mutateAsync({ data: formData });

				if (timer) clearInterval(timer);
			}

			if (shouldSubmit && (!isEditing || currentStatus === "Draft" || currentStatus === "Returned")) {
				const targetId = editingProposalId ?? proposalId;
				await submitProposalMutation.mutateAsync({
					data: { proposalId: targetId },
				});
			}

			setState({ uploadProgress: 100, uploadPhase: "done" });

			toast.success(
				shouldSubmit
					? "Project proposal submitted successfully for review!"
					: "Proposal draft saved successfully!"
			);
			onOpenChange(false);
			form.reset();
			setState({ step: 1, file: null });
			queryClient.invalidateQueries({ queryKey: ["ret", "dashboard"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "proposals"] });
			setTimeout(() => {
				setState({ uploadPhase: "idle", uploadProgress: 0 });
			}, 1000);
		} catch (error: unknown) {
			if (timer) clearInterval(timer);
			const message =
				error instanceof Error ? error.message : "Something went wrong";
			toast.error(message);
			setTimeout(() => {
				setState({ uploadPhase: "idle", uploadProgress: 0 });
			}, 1000);
		}
	};

	const nextStep = async () => {
		if (step === 1) {
			setState((prev) => ({ step: prev.step + 1 }));
			return;
		}

		let fieldsToValidate: (keyof FormValues)[] = [];
		if (step === 2) {
			fieldsToValidate = [
				"title",
				"bannerProgram",
				"projectLocale",
				"extensionCategory",
				"campusId",
				"departmentId",
				"sdgIds",
			];
		} else if (step === 3) {
			fieldsToValidate = [
				"targetStartDate",
				"targetEndDate",
				"budgetPartner",
				"budgetNeust",
			];
		} else if (step === 4) {
			fieldsToValidate = ["members"];
		}

		const isValid = await form.trigger(fieldsToValidate);
		if (isValid) setState((prev) => ({ step: prev.step + 1 }));
	};

	const prevStep = () => setState((prev) => ({ step: prev.step - 1 }));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0">
				<form
					onSubmit={(e) => e.preventDefault()}
					className="flex flex-col h-full"
				>
					<DialogHeader className="py-4 px-6 border-b border-border">
						<DialogTitle className="text-xl font-semibold text-heading">
							{isEditing
								? "Edit Project Proposal"
								: "Start New Project Proposal"}
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground">
							Step {step} of 5:{" "}
							{step === 1
								? "Requirements"
								: step === 2
									? "Project Overview"
									: step === 3
										? "Timeline & Budget"
										: step === 4
											? "Team Composition"
											: "Attachments"}
						</DialogDescription>
					</DialogHeader>

					<div className="p-6 overflow-y-auto max-h-[60vh]">
						{step === 1 && <ProposalStepRequirements />}

						{step === 2 && (
							<ProposalStepInfo form={form} user={user} sdgsData={sdgsData} />
						)}

						{step === 3 && <ProposalStepDetails form={form} />}

						{step === 4 && <ProposalStepMembers form={form} user={user} />}

						{step === 5 && (
							<ProposalStepDocuments
								file={file}
								setFile={(f) => setState({ file: f })}
								uploadPhase={uploadPhase}
								uploadProgress={uploadProgress}
								isEditing={isEditing}
							/>
						)}
					</div>

					<DialogFooter className="p-6 border-t border-border bg-card">
						<div className="flex items-center justify-between w-full">
							{step > 1 ? (
								<Button type="button" variant="outline" onClick={prevStep}>
									<ChevronLeft className="size-4" />
									Previous
								</Button>
							) : (
								<Button
									type="button"
									variant="ghost"
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
							)}

							{step < 5 ? (
								<Button
									type="button"
									onClick={nextStep}
									className="bg-brand-primary hover:bg-brand-primary-hover"
								>
									Next
									<ChevronRight className="size-4" />
								</Button>
							) : (
								<div className="flex items-center gap-3">
									<Button
										type="button"
										variant="outline"
										onClick={() => handleSave(false)}
										disabled={
											createProposalMutation.isPending ||
											updateProposalMutation.isPending ||
											submitProposalMutation.isPending ||
											uploadDocumentMutation.isPending
										}
									>
										Save as Draft
									</Button>
									<Button
										type="button"
										onClick={() => handleSave(true)}
										className="bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold"
										disabled={
											createProposalMutation.isPending ||
											updateProposalMutation.isPending ||
											submitProposalMutation.isPending ||
											uploadDocumentMutation.isPending
										}
									>
										{createProposalMutation.isPending ||
										updateProposalMutation.isPending ||
										submitProposalMutation.isPending ||
										uploadDocumentMutation.isPending ? (
											<>
												<Loader2 className="size-4 animate-spin" />
												Submitting...
											</>
										) : (
											<>
												Submit for Review
												<Check className="size-4" />
											</>
										)}
									</Button>
								</div>
							)}
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
