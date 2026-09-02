import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { bannerProgramsQueryOptions } from "@/features/banner-programs";
import type { AuthUser } from "@/lib/auth";
import { type FormValues, formSchema } from "../components/proposal-form";
import {
	canSubmitEditingProposal,
	getFieldsToValidate,
	requiresProposalDocument,
} from "../helpers/proposal-wizard-helpers";
import { uploadSpecialOrderFn } from "@/features/projects/special-orders.functions";
import {
	createProposalFn,
	extensionServicesQueryOptions,
	getProposalByIdFn,
	sdgsQueryOptions,
	submitProposalFn,
	updateProposalFn,
	uploadProposalDocumentFn,
} from "../ret.functions";

interface UseProposalWizardOptions {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: AuthUser;
	initialData?: Partial<FormValues>;
	editingProposalId?: string;
	currentStatus?: string;
	hasExistingProposalDocument?: boolean;
}

interface WizardState {
	step: number;
	file: File | null;
	soFiles: Record<string, File | null>;
	uploadProgress: number;
	uploadPhase: "idle" | "creating" | "uploading" | "done";
}

export function useProposalWizard({
	onOpenChange,
	user,
	initialData,
	editingProposalId,
	currentStatus,
	hasExistingProposalDocument,
}: UseProposalWizardOptions) {
	const isEditing = Boolean(editingProposalId);
	const [state, setState] = React.useReducer(
		(
			previous: WizardState,
			next:
				| Partial<WizardState>
				| ((current: WizardState) => Partial<WizardState>),
		) => {
			const patch = typeof next === "function" ? next(previous) : next;
			return { ...previous, ...patch };
		},
		{
			step: 1,
			file: null,
			soFiles: {},
			uploadProgress: 0,
			uploadPhase: "idle" as const,
		},
	);

	const queryClient = useQueryClient();
	const defaultValues: FormValues = {
		title: "",
		bannerProgramId: 0,
		projectLocale: "",
		extensionServiceIds: [],
		campusId: user.campusId?.toString() ?? "",
		departmentId: user.departmentId?.toString() ?? "",
		sdgIds: [],
		beneficiarySectors: [],
		targetStartDate: "",
		targetEndDate: "",
		budgetPartner: 0,
		budgetNeust: 0,
		members: [
			{
				userId: user.userId,
				projectRole: "Project Leader",
				name: `${user.firstName} ${user.lastName}`,
				soNumber: "",
			},
		],
	};
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		mode: "onChange",
		defaultValues,
		values: initialData ? { ...defaultValues, ...initialData } : undefined,
		resetOptions: {
			keepDirtyValues: true,
			keepErrors: true,
		},
	});

	const { data: sdgsData } = useQuery(sdgsQueryOptions());
	const { data: extensionServicesData } = useQuery(
		extensionServicesQueryOptions(),
	);
	const { data: bannerProgramsData } = useQuery(bannerProgramsQueryOptions());

	const createProposalMutation = useMutation({
		mutationFn: createProposalFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["ret"] });
		},
	});

	const updateProposalMutation = useMutation({
		mutationFn: updateProposalFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["ret"] });
		},
	});

	const submitProposalMutation = useMutation({
		mutationFn: submitProposalFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["ret"] });
		},
	});

	const uploadDocumentMutation = useMutation({
		mutationFn: uploadProposalDocumentFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["ret"] });
		},
	});

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			form.reset();
			setState({ step: 1, file: null, soFiles: {} });
		}
		onOpenChange(isOpen);
	};

	const handleSave = async (shouldSubmit: boolean) => {
		if (shouldSubmit && isEditing && !canSubmitEditingProposal(currentStatus)) {
			toast.error(
				"Only Draft or Returned proposals can be submitted for review",
			);
			return;
		}

		if (
			requiresProposalDocument(
				shouldSubmit,
				isEditing,
				hasExistingProposalDocument,
			) &&
			!state.file
		) {
			toast.error("Please upload the Project Proposal PDF");
			return;
		}

		const values = form.getValues();

		if (shouldSubmit) {
			const missingSo = values.members.some(
				(m) => !m.soNumber?.trim() || (!isEditing && !state.soFiles[m.userId]),
			);
			if (missingSo) {
				toast.error(
					"Please provide a Special Order number and upload the SO PDF for all team members before submitting.",
				);
				return;
			}
		}

		let timer: ReturnType<typeof setInterval> | null = null;

		try {
			setState({ uploadPhase: "creating", uploadProgress: 0 });
			let proposalId = editingProposalId ?? "";

			if (isEditing && editingProposalId) {
				await updateProposalMutation.mutateAsync({
					data: {
						proposalId: editingProposalId,
						title: values.title,
						bannerProgramId: values.bannerProgramId,
						projectLocale: values.projectLocale,
						extensionServiceIds: values.extensionServiceIds,
						budgetPartner: values.budgetPartner,
						budgetNeust: values.budgetNeust,
						sectorNames: values.beneficiarySectors,
						sdgIds: values.sdgIds,
						members: values.members.map((member) => ({
							userId: member.userId,
							projectRole: member.projectRole,
						})),
					},
				});
			} else {
				const proposal = await createProposalMutation.mutateAsync({
					data: {
						campusId: Number(values.campusId),
						departmentId: Number(values.departmentId),
						title: values.title,
						bannerProgramId: values.bannerProgramId,
						projectLocale: values.projectLocale,
						extensionServiceIds: values.extensionServiceIds,
						budgetPartner: values.budgetPartner,
						budgetNeust: values.budgetNeust,
						targetStartDate: new Date(values.targetStartDate).toISOString(),
						targetEndDate: new Date(values.targetEndDate).toISOString(),
						sdgIds: values.sdgIds,
						sectorNames: values.beneficiarySectors,
						members: values.members.map((member) => ({
							userId: member.userId,
							projectRole: member.projectRole,
						})),
					},
				});
				proposalId = proposal.proposalId;
			}

			if (state.file) {
				setState({ uploadProgress: 30, uploadPhase: "uploading" });
				const fileSizeMB = state.file.size / 1024 / 1024;
				const baseInterval = 80;
				const interval = Math.max(40, baseInterval - fileSizeMB * 2);
				const increment = Math.max(1, Math.min(8, 30 / fileSizeMB));

				timer = setInterval(() => {
					setState((current) => {
						const next = current.uploadProgress + increment;
						return { uploadProgress: next >= 95 ? 95 : next };
					});
				}, interval);

				const formData = new FormData();
				formData.append("file", state.file);
				formData.append("proposalId", proposalId);
				await uploadDocumentMutation.mutateAsync({ data: formData });
				if (timer) clearInterval(timer);
			}

			// Upload member Special Orders if provided
			const targetProposalId = editingProposalId ?? proposalId;
			const proposalDetails = await getProposalByIdFn({
				data: { proposalId: targetProposalId },
			});
			for (const member of values.members) {
				const soFile = state.soFiles[member.userId];
				const proposalMember = proposalDetails.members.find(
					(m) => m.userId === member.userId,
				);
				if (soFile && proposalMember?.memberId && member.soNumber) {
					const soFormData = new FormData();
					soFormData.append("memberId", proposalMember.memberId);
					soFormData.append("soNumber", member.soNumber);
					soFormData.append("file", soFile);
					await uploadSpecialOrderFn({ data: soFormData });
				}
			}

			if (shouldSubmit) {
				const targetId = editingProposalId ?? proposalId;
				await submitProposalMutation.mutateAsync({
					data: { proposalId: targetId },
				});
			}

			setState({ uploadProgress: 100, uploadPhase: "done" });
			toast.success(
				shouldSubmit
					? "Project proposal submitted successfully for review!"
					: "Proposal draft saved successfully!",
			);
			onOpenChange(false);
			form.reset();
			setState({ step: 1, file: null, soFiles: {} });
			setTimeout(
				() => setState({ uploadPhase: "idle", uploadProgress: 0 }),
				1000,
			);
		} catch (error: unknown) {
			if (timer) clearInterval(timer);
			toast.error(
				error instanceof Error ? error.message : "Something went wrong",
			);
			setTimeout(
				() => setState({ uploadPhase: "idle", uploadProgress: 0 }),
				1000,
			);
		}
	};

	const nextStep = async () => {
		if (state.step === 1) {
			setState((previous) => ({ step: previous.step + 1 }));
			return;
		}
		const fieldsToValidate = getFieldsToValidate(state.step);
		const isValid = await form.trigger(fieldsToValidate);
		if (isValid) setState((previous) => ({ step: previous.step + 1 }));
	};

	return {
		...state,
		form,
		sdgsData,
		extensionServicesData,
		bannerProgramsData,
		isEditing,
		hasExistingProposalDocument,
		isBusy:
			createProposalMutation.isPending ||
			updateProposalMutation.isPending ||
			submitProposalMutation.isPending ||
			uploadDocumentMutation.isPending,
		isSubmitting: submitProposalMutation.isPending,
		handleOpenChange,
		handleSave,
		nextStep,
		previousStep: () => setState((previous) => ({ step: previous.step - 1 })),
		setFile: (file: File | null) => setState({ file }),
		setMemberSoFile: (userId: string, file: File | null) =>
			setState((prev) => ({
				soFiles: { ...prev.soFiles, [userId]: file },
			})),
	};
}
