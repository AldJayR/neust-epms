import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	Calendar as CalendarIcon,
	Check,
	ChevronLeft,
	ChevronRight,
	FileText,
	Loader2,
	Plus,
	Search,
	Trash2,
	Upload,
} from "lucide-react";
import * as React from "react";
import {
	Controller,
	type SubmitHandler,
	useFieldArray,
	useForm,
	useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Progress, ProgressValue } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AuthUser } from "@/lib/auth";
import { searchUsersFn } from "@/lib/auth.functions";
import {
	createProposalFn,
	sdgsQueryOptions,
	uploadProposalDocumentFn,
} from "@/lib/ret.functions";

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

function formatPeso(value: number): string {
	if (!value && value !== 0) return "";
	return value.toLocaleString("en-PH", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

function parsePesoInput(raw: string): number {
	const cleaned = raw.replace(/[^0-9.]/g, "");
	const parsed = parseFloat(cleaned);
	return Number.isNaN(parsed) ? 0 : parsed;
}

interface CurrencyInputProps {
	value: number;
	onChange: (value: number) => void;
	placeholder?: string;
}

function CurrencyInput({ value, onChange, placeholder }: CurrencyInputProps) {
	const [prevValue, setPrevValue] = React.useState(value);
	const [display, setDisplay] = React.useState(() => formatPeso(value));

	if (value !== prevValue) {
		setPrevValue(value);
		setDisplay(formatPeso(value));
	}

	return (
		<div className="relative">
			<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
				₱
			</span>
			<Input
				type="text"
				inputMode="decimal"
				className="pl-7"
				value={display}
				placeholder={placeholder}
				onChange={(e) => {
					const raw = e.target.value;
					const num = parsePesoInput(raw);
					setDisplay(raw === "" ? "" : formatPeso(num));
					onChange(num);
				}}
				onBlur={() => setDisplay(formatPeso(value))}
			/>
		</div>
	);
}

type FormValues = z.infer<typeof formSchema>;

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
	const [userSearch, setUserSearch] = React.useState("");
	const queryClient = useQueryClient();
	const [uploadProgress, setUploadProgress] = React.useState(0);
	const [uploadPhase, setUploadPhase] = React.useState<
		"idle" | "creating" | "uploading" | "done"
	>("idle");

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

	const {
		fields: memberFields,
		append: appendMember,
		remove: removeMember,
	} = useFieldArray({
		control: form.control,
		name: "members",
	});

	const { data: sdgsData } = useQuery(sdgsQueryOptions());

	const deferredSearch = React.useDeferredValue(userSearch);

	const { data: searchUsersData } = useQuery({
		queryKey: ["users", "search", deferredSearch],
		queryFn: () => searchUsersFn({ data: { search: deferredSearch } }),
		enabled: deferredSearch.length >= 2,
	});

	const watchedSdgIds =
		useWatch({
			control: form.control,
			name: "sdgIds",
		}) || [];
	const watchedMembers = useWatch({
		control: form.control,
		name: "members",
	});

	const createProposalMutation = useMutation({
		mutationFn: createProposalFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});

	const uploadDocumentMutation = useMutation({
		mutationFn: uploadProposalDocumentFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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

	const [isDragging, setIsDragging] = React.useState(false);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			validateAndSetFile(e.target.files[0]);
			e.target.value = "";
		}
	};

	const validateAndSetFile = (selectedFile: File) => {
		if (selectedFile.type !== "application/pdf") {
			toast.error("Only PDF files are allowed");
			return;
		}
		if (selectedFile.size > 50 * 1024 * 1024) {
			toast.error("File size must be less than 50MB");
			return;
		}
		setFile(selectedFile);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile) validateAndSetFile(droppedFile);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const removeFile = () => {
		setFile(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

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
							<div className="space-y-4">
								<Field>
									<FieldLabel>Project Title</FieldLabel>
									<FieldContent>
										<Input
											placeholder="Enter project title"
											{...form.register("title")}
										/>
									</FieldContent>
									<FieldError errors={[form.formState.errors.title]} />
								</Field>
								<Field>
									<FieldLabel>Banner Program</FieldLabel>
									<FieldContent>
										<Input
											placeholder="e.g. Community Outreach"
											{...form.register("bannerProgram")}
										/>
									</FieldContent>
									<FieldError errors={[form.formState.errors.bannerProgram]} />
								</Field>
								<Field>
									<FieldLabel>Project Locale</FieldLabel>
									<FieldContent>
										<Input
											placeholder="e.g. Cabanatuan City"
											{...form.register("projectLocale")}
										/>
									</FieldContent>
									<FieldError errors={[form.formState.errors.projectLocale]} />
								</Field>
								<Field>
									<FieldLabel>Extension Category</FieldLabel>
									<FieldContent>
										<Select
											onValueChange={(val) => {
												if (val != null)
													form.setValue("extensionCategory", val);
											}}
											value={form.watch("extensionCategory")}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select category" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Category A">Category A</SelectItem>
												<SelectItem value="Category B">Category B</SelectItem>
												<SelectItem value="Category C">Category C</SelectItem>
											</SelectContent>
										</Select>
									</FieldContent>
									<FieldError
										errors={[form.formState.errors.extensionCategory]}
									/>
								</Field>
								<Field>
									<FieldLabel>Campus</FieldLabel>
									<FieldContent>
										<Input
											readOnly
											value={user.campusName}
											className="bg-muted"
										/>
									</FieldContent>
								</Field>
								<Field>
									<FieldLabel>Department</FieldLabel>
									<FieldContent>
										<Input
											readOnly
											value={user.departmentName ?? ""}
											className="bg-muted"
										/>
									</FieldContent>
								</Field>
								<div className="space-y-2">
									<FieldLabel>Addressed SDGs</FieldLabel>
									<div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
										{sdgsData?.map((sdg) => (
											<div
												key={sdg.sdgId}
												className="flex flex-row items-start space-x-3 space-y-0"
											>
												<Checkbox
													checked={watchedSdgIds.includes(sdg.sdgId)}
													onCheckedChange={(checked) => {
														const current = form.getValues("sdgIds") || [];
														if (checked) {
															form.setValue("sdgIds", [...current, sdg.sdgId]);
														} else {
															form.setValue(
																"sdgIds",
																current.filter((id) => id !== sdg.sdgId),
															);
														}
													}}
												/>
												<span className="font-normal text-xs">
													{sdg.sdgName}
												</span>
											</div>
										))}
									</div>
									<FieldError errors={[form.formState.errors.sdgIds]} />
								</div>
							</div>
						)}

						{step === 2 && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<Field>
										<FieldLabel>Target Start Date</FieldLabel>
										<FieldContent>
											<Controller
												control={form.control}
												name="targetStartDate"
												render={({ field }) => (
													<Popover>
														<PopoverTrigger
															render={
																<Button
																	type="button"
																	variant="outline"
																	className="w-full justify-start text-left font-normal"
																/>
															}
														>
															<CalendarIcon className="mr-2 size-4 text-muted-foreground" />
															{field.value ? (
																format(new Date(field.value), "PPP")
															) : (
																<span className="text-muted-foreground">
																	Pick a start date
																</span>
															)}
														</PopoverTrigger>
														<PopoverContent
															className="w-auto p-0"
															align="start"
														>
															<Calendar
																mode="single"
																selected={
																	field.value
																		? new Date(field.value)
																		: undefined
																}
																onSelect={(date) =>
																	field.onChange(
																		date ? format(date, "yyyy-MM-dd") : "",
																	)
																}
															/>
														</PopoverContent>
													</Popover>
												)}
											/>
										</FieldContent>
										<FieldError
											errors={[form.formState.errors.targetStartDate]}
										/>
									</Field>
									<Field>
										<FieldLabel>Target End Date</FieldLabel>
										<FieldContent>
											<Controller
												control={form.control}
												name="targetEndDate"
												render={({ field }) => (
													<Popover>
														<PopoverTrigger
															render={
																<Button
																	type="button"
																	variant="outline"
																	className="w-full justify-start text-left font-normal"
																/>
															}
														>
															<CalendarIcon className="mr-2 size-4 text-muted-foreground" />
															{field.value ? (
																format(new Date(field.value), "PPP")
															) : (
																<span className="text-muted-foreground">
																	Pick an end date
																</span>
															)}
														</PopoverTrigger>
														<PopoverContent
															className="w-auto p-0"
															align="start"
														>
															<Calendar
																mode="single"
																selected={
																	field.value
																		? new Date(field.value)
																		: undefined
																}
																onSelect={(date) =>
																	field.onChange(
																		date ? format(date, "yyyy-MM-dd") : "",
																	)
																}
															/>
														</PopoverContent>
													</Popover>
												)}
											/>
										</FieldContent>
										<FieldError
											errors={[form.formState.errors.targetEndDate]}
										/>
									</Field>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<Field>
										<FieldLabel>Budget (Partner)</FieldLabel>
										<FieldContent>
											<CurrencyInput
												value={form.watch("budgetPartner")}
												onChange={(val) => form.setValue("budgetPartner", val)}
												placeholder="0"
											/>
										</FieldContent>
										<FieldError
											errors={[form.formState.errors.budgetPartner]}
										/>
									</Field>
									<Field>
										<FieldLabel>Budget (NEUST)</FieldLabel>
										<FieldContent>
											<CurrencyInput
												value={form.watch("budgetNeust")}
												onChange={(val) => form.setValue("budgetNeust", val)}
												placeholder="0"
											/>
										</FieldContent>
										<FieldError errors={[form.formState.errors.budgetNeust]} />
									</Field>
								</div>
							</div>
						)}

						{step === 3 && (
							<div className="space-y-4">
								<div className="space-y-2">
									<FieldLabel>Search Team Members</FieldLabel>
									<div className="relative">
										<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											placeholder="Search by name or email"
											className="pl-9"
											value={userSearch}
											onChange={(e) => setUserSearch(e.target.value)}
										/>
									</div>
									{searchUsersData && searchUsersData.length > 0 && (
										<div className="mt-2 border rounded-md divide-y shadow-sm max-h-[150px] overflow-y-auto">
											{searchUsersData.map((u) => (
												<button
													key={u.userId}
													type="button"
													className="w-full text-left p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
													onClick={() => {
														if (
															!memberFields.some((m) => m.userId === u.userId)
														) {
															appendMember({
																userId: u.userId,
																projectRole: "Member",
																name: `${u.firstName} ${u.lastName}`,
															});
														} else {
															toast.error("User is already a team member");
														}
														setUserSearch("");
													}}
												>
													<div className="text-sm">
														<p className="font-medium">
															{u.firstName} {u.lastName}
														</p>
														<p className="text-xs text-muted-foreground">
															{u.email}
														</p>
													</div>
													<Plus className="size-4 text-blue-600" />
												</button>
											))}
										</div>
									)}
								</div>

								<div className="space-y-2">
									<FieldLabel>Team Members & Roles</FieldLabel>
									<div className="border rounded-md divide-y">
										{memberFields.map((field, index) => (
											<div
												key={field.id}
												className="p-3 flex items-center justify-between"
											>
												<div className="flex-1">
													<p className="text-sm font-medium">{field.name}</p>
													<div className="mt-1 flex items-center gap-2">
														{field.userId === user.userId ? (
															<span className="text-xs text-muted-foreground h-7 flex items-center">
																{watchedMembers?.[index]?.projectRole ??
																	field.projectRole}
															</span>
														) : (
															<Select
																value={
																	watchedMembers?.[index]?.projectRole ??
																	field.projectRole
																}
																onValueChange={(val) => {
																	if (val != null)
																		form.setValue(
																			`members.${index}.projectRole`,
																			val,
																		);
																}}
															>
																<SelectTrigger className="h-7 w-[150px] text-xs">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="Project Leader">
																		Project Leader
																	</SelectItem>
																	<SelectItem value="Co-Project Leader">
																		Co-Project Leader
																	</SelectItem>
																	<SelectItem value="Project Staff">
																		Project Staff
																	</SelectItem>
																	<SelectItem value="Member">Member</SelectItem>
																</SelectContent>
															</Select>
														)}
													</div>
												</div>
												{field.userId !== user.userId && (
													<Button
														variant="ghost"
														size="icon"
														className="text-red-500 hover:text-red-700 hover:bg-red-50"
														onClick={() => removeMember(index)}
													>
														<Trash2 className="size-4" />
													</Button>
												)}
											</div>
										))}
									</div>
									<FieldError errors={[form.formState.errors.members]} />
								</div>
							</div>
						)}

						{step === 4 && (
							<div className="space-y-6">
								{/* biome-ignore lint/a11y/noStaticElementInteractions: drag and drop zone */}
								<div
									className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-[#fcfcfc] transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-[#e5e5e5]"}`}
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
								>
									{uploadPhase !== "idle" ? (
										<div className="flex flex-col items-center gap-3 w-full max-w-xs">
											<div className="p-3 bg-primary/10 rounded-full">
												<Loader2 className="size-8 text-primary animate-spin" />
											</div>
											<p className="text-sm font-medium">
												{uploadPhase === "creating" && "Creating proposal..."}
												{uploadPhase === "uploading" && "Uploading document..."}
												{uploadPhase === "done" && "Upload complete!"}
											</p>
											<Progress value={uploadProgress} className="w-full">
												<ProgressValue />
											</Progress>
										</div>
									) : file ? (
										<div className="flex flex-col items-center gap-2">
											<div className="p-3 bg-primary/10 rounded-full">
												<FileText className="size-8 text-primary" />
											</div>
											<p className="text-sm font-medium">{file.name}</p>
											<p className="text-xs text-muted-foreground">
												{(file.size / 1024 / 1024).toFixed(2)} MB
											</p>
											<div className="flex gap-2 mt-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														fileInputRef.current?.click();
													}}
												>
													Change File
												</Button>
												<Button
													variant="outline"
													size="sm"
													className="text-destructive hover:text-destructive"
													onClick={removeFile}
												>
													Remove
												</Button>
											</div>
										</div>
									) : (
										<>
											<div className="p-4 bg-primary/10 rounded-full">
												<Upload className="size-8 text-primary" />
											</div>
											<div className="text-center">
												<p className="text-sm font-medium">
													Click to upload or drag and drop
												</p>
												<p className="text-xs text-muted-foreground mt-1">
													Project Proposal PDF (Max 50MB)
												</p>
											</div>
											<input
												type="file"
												id="file-upload"
												ref={fileInputRef}
												className="hidden"
												aria-label="Upload Project Proposal PDF"
												accept="application/pdf"
												onChange={handleFileChange}
											/>
											<Button
												variant="secondary"
												className="bg-brand-primary hover:bg-brand-primary-hover text-white"
												render={
													/* biome-ignore lint/a11y/noLabelWithoutControl: label is used to render button wrapper */
													<label
														htmlFor="file-upload"
														className="cursor-pointer"
													>
														Select File
													</label>
												}
												nativeButton={false}
											/>
										</>
									)}
								</div>
							</div>
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
