import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import * as React from "react";
import { type UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AuthUser } from "@/lib/auth";
import { searchUsersFn } from "@/lib/auth.functions";
import type { FormValues } from "./create-proposal-modal";

interface ProposalStepMembersProps {
	form: UseFormReturn<FormValues>;
	user: AuthUser;
}

export function ProposalStepMembers({ form, user }: ProposalStepMembersProps) {
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
								className="w-full text-left p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
								onClick={() => {
									if (!memberFields.some((m) => m.userId === u.userId)) {
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
													form.setValue(`members.${index}.projectRole`, val);
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
	);
}
