import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Search, Trash2, Upload, X } from "lucide-react";
import * as React from "react";
import { type UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { searchUsersFn } from "@/features/auth";
import type { AuthUser } from "@/lib/auth";
import type { FormValues } from "./proposal-form";

interface ProposalStepMembersProps {
	form: UseFormReturn<FormValues>;
	user: AuthUser;
	soFiles?: Record<string, File | null>;
	onSetSoFile?: (userId: string, file: File | null) => void;
}

export function ProposalStepMembers({
	form,
	user,
	soFiles = {},
	onSetSoFile,
}: ProposalStepMembersProps) {
	const [userSearch, setUserSearch] = React.useState("");
	const deferredSearch = React.useDeferredValue(userSearch);

	const { data: searchUsersData } = useQuery({
		queryKey: ["users", "search", deferredSearch],
		queryFn: () => searchUsersFn({ data: { search: deferredSearch } }),
		enabled: deferredSearch.length >= 2,
	});

	const {
		fields: memberFields,
		append: appendMember,
		remove: removeMember,
	} = useFieldArray({
		control: form.control,
		name: "members",
	});

	const watchedMembers = useWatch({
		control: form.control,
		name: "members",
	});

	function handleAddMember(u: {
		userId: string;
		firstName: string;
		lastName: string;
	}) {
		if (!memberFields.some((m) => m.userId === u.userId)) {
			appendMember({
				userId: u.userId,
				projectRole: "Member",
				name: `${u.firstName} ${u.lastName}`,
				soNumber: "",
			});
		} else {
			toast.error("User is already a team member");
		}
		setUserSearch("");
	}

	return (
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
								className="w-full text-left p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer dark:hover:bg-muted"
								onClick={() => handleAddMember(u)}
							>
								<div className="text-sm">
									<p className="font-medium">
										{u.firstName} {u.lastName}
									</p>
									<p className="text-xs text-muted-foreground">{u.email}</p>
								</div>
								<Plus className="size-4 text-blue-600" />
							</button>
						))}
					</div>
				)}
			</div>

			<div className="space-y-2">
				<FieldLabel>Team Members & Roles</FieldLabel>
				<div className="border rounded-md divide-y max-h-[280px] overflow-y-auto">
					{memberFields.map((field, index) => {
						const selectedFile = soFiles[field.userId];
						return (
							<div
								key={field.id}
								className="p-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
							>
								<div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div className="min-w-[140px]">
										<p className="text-sm font-medium text-slate-900 truncate dark:text-foreground">
											{field.name}
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										{field.userId === user.userId ? (
											<span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded dark:bg-muted font-medium">
												{watchedMembers?.[index]?.projectRole ??
													field.projectRole}
											</span>
										) : (
											<Input
												{...form.register(
													`members.${index}.projectRole` as const,
												)}
												placeholder="Role (e.g. Co-Leader)"
												className="h-8 w-[130px] text-xs"
											/>
										)}
										<Input
											{...form.register(
												`members.${index}.soNumber` as const,
											)}
											placeholder="SO # (e.g. SO-2024-001)"
											className="h-8 w-[140px] text-xs"
										/>
										{selectedFile ? (
											<div className="flex items-center gap-1.5 h-8 px-2 rounded-md border border-border bg-slate-100 dark:bg-muted/60 text-xs max-w-[210px] shrink-0">
												<FileText className="size-3.5 text-primary shrink-0" />
												<span
													className="truncate font-medium text-slate-800 dark:text-slate-100 text-xs max-w-[100px]"
													title={selectedFile.name}
												>
													{selectedFile.name}
												</span>
												<span className="text-[10px] text-muted-foreground shrink-0">
													({Math.round(selectedFile.size / 1024)}KB)
												</span>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => onSetSoFile?.(field.userId, null)}
													className="size-5 shrink-0 rounded-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors ml-0.5 p-0 cursor-pointer"
													title="Remove Special Order"
												>
													<X className="size-3" />
												</Button>
											</div>
										) : (
											<label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-dashed border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer text-xs font-medium transition-colors shrink-0">
												<Upload className="size-3.5 text-muted-foreground" />
												<span>Upload SO PDF</span>
												<input
													type="file"
													accept=".pdf,application/pdf"
													className="sr-only"
													onChange={(e) => {
														const file = e.target.files?.[0] ?? null;
														if (file) {
															if (
																file.type !== "application/pdf" &&
																!file.name.toLowerCase().endsWith(".pdf")
															) {
																toast.error(
																	"Only PDF files are allowed for Special Orders",
																);
																return;
															}
															if (file.size > 50 * 1024 * 1024) {
																toast.error(
																	"File size must be under 50MB",
																);
																return;
															}
															onSetSoFile?.(field.userId, file);
														}
														e.target.value = "";
													}}
												/>
											</label>
										)}
									</div>
								</div>
							{field.userId !== user.userId && (
								<Button
									variant="ghost"
									size="icon"
									className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 dark:text-red-300 dark:hover:text-red-200 dark:hover:bg-red-950/30 self-end sm:self-center"
									onClick={() => removeMember(index)}
								>
									<Trash2 className="size-4" />
								</Button>
							)}
						</div>
					);
				})}
				</div>
				<FieldError errors={[form.formState.errors.members]} />
			</div>
		</div>
	);
}
