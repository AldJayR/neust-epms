import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { AuthUser } from "@/lib/auth";
import { type FormValues, formSchema } from "../components/proposal-form";
import {
	canSubmitEditingProposal,
	getFieldsToValidate,
	requiresProposalDocument,
} from "../helpers/proposal-wizard-helpers";
import {
	createProposalFn,
	extensionServicesQueryOptions,
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
}

interface WizardState {
	step: number;
	file: File | null;
	uploadProgress: number;
	uploadPhase: "idle" | "creating" | "uploading" | "done";
}

export function useProposalWizard({
	onOpenChange,
	user,
	initialData,
	editingProposalId,
	currentStatus,
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
			uploadProgress: 0,
			uploadPhase: "idle" as const,
		},
	);

	const queryClient = useQueryClient();
	const defaultValues: FormValues = {
		title: "",
		bannerProgram: "",
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
	const invalidateProposalData = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["faculty"] }),
			queryClient.invalidateQueries({ queryKey: ["ret"] }),
			queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
		]);
	};
	const updateProposalMutation = useMutation({
		mutationFn: updateProposalFn,
		onSuccess: invalidateProposalData,
	});
	const submitProposalMutation = useMutation({
		mutationFn: submitProposalFn,
		onSuccess: invalidateProposalData,
	});
	const createProposalMutation = useMutation({
		mutationFn: createProposalFn,
		onSuccess: invalidateProposalData,
	});
	const uploadDocumentMutation = useMutation({
		mutationFn: uploadProposalDocumentFn,
		onSuccess: invalidateProposalData,
	});

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			form.reset();
			setState({ step: 1, file: null });
		}
		onOpenChange(isOpen);
	};

	const handleSave = async (shouldSubmit: boolean) => {
		if (requiresProposalDocument(shouldSubmit, isEditing) && !state.file) {
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
						extensionServiceIds: values.extensionServiceIds,
						budgetPartner: values.budgetPartner,
						budgetNeust: values.budgetNeust,
						sectorNames: values.beneficiarySectors,
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

			if (
				shouldSubmit &&
				(!isEditing || canSubmitEditingProposal(currentStatus))
			) {
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
			setState({ step: 1, file: null });
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
		isEditing,
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
	};
}
