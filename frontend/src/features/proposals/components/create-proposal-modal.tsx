import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import * as React from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
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
	uploadProposalDocumentFn,
} from "@/lib/ret.functions";
import { ProposalStepDetails } from "./proposal-step-details";
import { ProposalStepDocuments } from "./proposal-step-documents";
import { ProposalStepInfo } from "./proposal-step-info";
import { ProposalStepMembers } from "./proposal-step-members";

export const formSchema = z
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
}

export function CreateProposalModal({
	open,
	onOpenChange,
	user,
}: CreateProposalModalProps) {
	const [step, setStep] = React.useState(1);
	const [file, setFile] = React.useState<File | null>(null);
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const [uploadProgress, setUploadProgress] = React.useState(0);
	const [uploadPhase, setUploadPhase] = React.useState<
		"idle" | "creating" | "uploading" | "done"
	>("idle");
	const [isDragging, setIsDragging] = React.useState(false);

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

	const { data: sdgsData } = useQuery(sdgsQueryOptions());

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

	const onSubmit: SubmitHandler<FormValues> = async (values) => {
		if (!file) {
			toast.error("Please upload the Project Proposal PDF");
			return;
		}

		let timer: ReturnType<typeof setInterval> | null = null;

		try {
			setUploadPhase("creating");
			setUploadProgress(0);

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

			setUploadProgress(30);
			setUploadPhase("uploading");

			const fileSizeMB = file.size / 1024 / 1024;
			const baseInterval = 80;
			const interval = Math.max(40, baseInterval - fileSizeMB * 2);
			const increment = Math.max(1, Math.min(8, 30 / fileSizeMB));

			timer = setInterval(() => {
				setUploadProgress((prev) => {
					const next = prev + increment;
					return next >= 95 ? 95 : next;
				});
			}, interval);

			const formData = new FormData();
			formData.append("file", file);
			formData.append("proposalId", proposal.proposalId);

			await uploadDocumentMutation.mutateAsync({ data: formData });

			if (timer) clearInterval(timer);
			setUploadProgress(100);
			setUploadPhase("done");

			toast.success("Project proposal submitted successfully!");
			onOpenChange(false);
			form.reset();
			setStep(1);
			setFile(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
			queryClient.invalidateQueries({ queryKey: ["ret", "dashboard"] });
		} catch (error: unknown) {
			if (timer) clearInterval(timer);
			const message =
				error instanceof Error ? error.message : "Something went wrong";
			toast.error(message);
		} finally {
			setTimeout(() => {
				setUploadPhase("idle");
				setUploadProgress(0);
			}, 1000);
		}
	};

	const nextStep = async () => {
		let fieldsToValidate: (keyof FormValues)[] = [];
		if (step === 1) {
			fieldsToValidate = [
				"title",
				"bannerProgram",
				"projectLocale",
				"extensionCategory",
				"campusId",
				"departmentId",
				"sdgIds",
			];
		} else if (step === 2) {
			fieldsToValidate = [
				"targetStartDate",
				"targetEndDate",
				"budgetPartner",
				"budgetNeust",
			];
		} else if (step === 3) {
			fieldsToValidate = ["members"];
		}

		const isValid = await form.trigger(fieldsToValidate);
		if (isValid) setStep((prev) => prev + 1);
	};

	const prevStep = () => setStep((prev) => prev - 1);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0">
				<form
					onKeyDown={(e) => {
						if (e.key === "Enter") e.preventDefault();
					}}
					className="flex flex-col h-full"
				>
					<DialogHeader className="py-4 px-6 border-b border-[#ebebeb]">
						<DialogTitle className="text-xl font-semibold text-[#11215a]">
							Start New Project Proposal
						</DialogTitle>
						<DialogDescription className="text-sm text-[#666]">
							Step {step} of 4:{" "}
							{step === 1
								? "Project Overview"
								: step === 2
									? "Timeline & Budget"
									: step === 3
										? "Team Composition"
										: "Attachments"}
						</DialogDescription>
					</DialogHeader>

					<div className="p-6 overflow-y-auto max-h-[60vh]">
						{step === 1 && (
							<ProposalStepInfo form={form} user={user} sdgsData={sdgsData} />
						)}

						{step === 2 && <ProposalStepDetails form={form} />}

						{step === 3 && <ProposalStepMembers form={form} user={user} />}

						{step === 4 && (
							<ProposalStepDocuments
								file={file}
								setFile={setFile}
								fileInputRef={fileInputRef}
								isDragging={isDragging}
								setIsDragging={setIsDragging}
								uploadPhase={uploadPhase}
								uploadProgress={uploadProgress}
							/>
						)}
					</div>

					<DialogFooter className="p-6 border-t border-[#ebebeb] bg-[#fcfcfc]">
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

							{step < 4 ? (
								<Button
									type="button"
									onClick={nextStep}
									className="bg-brand-primary hover:bg-brand-primary-hover"
								>
									Next
									<ChevronRight className="size-4" />
								</Button>
							) : (
								<Button
									type="button"
									onClick={() => form.handleSubmit(onSubmit)()}
									className="bg-brand-primary hover:bg-brand-primary-hover text-white"
									disabled={
										createProposalMutation.isPending ||
										uploadDocumentMutation.isPending
									}
								>
									{createProposalMutation.isPending ||
									uploadDocumentMutation.isPending ? (
										<>
											<Loader2 className="size-4 animate-spin" />
											Submitting...
										</>
									) : (
										<>
											Finish
											<Check className="size-4" />
										</>
									)}
								</Button>
							)}
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
