import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import * as React from "react";
import { Controller, type UseFormReturn, useFieldArray } from "react-hook-form";
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
import { searchUsersFn } from "@/features/auth";
import type { AuthUser } from "@/lib/auth";
import {
	PROJECT_LEADER_ROLE,
	PROJECT_MEMBER_ROLE,
	PROJECT_ROLES,
} from "@/lib/project-roles";
import type { FormValues } from "./proposal-form";

export function ProposalStepMembers({
	form,
	user,
}: {
	form: UseFormReturn<FormValues>;
	user: AuthUser;
}) {
	const [search, setSearch] = React.useState("");
	const deferredSearch = React.useDeferredValue(search);
	const { data: users } = useQuery({
		queryKey: ["users", "search", deferredSearch],
		queryFn: () => searchUsersFn({ data: { search: deferredSearch } }),
		enabled: deferredSearch.length >= 2,
	});
	const { fields, append, remove } = useFieldArray({
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
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</div>
				{!!users?.length && (
					<div className="mt-2 border rounded-md divide-y shadow-sm max-h-[150px] overflow-y-auto">
						{users.map((candidate) => (
							<button
								key={candidate.userId}
								type="button"
								className="w-full text-left p-2 flex items-center justify-between hover:bg-muted cursor-pointer"
								onClick={() => {
									if (
										fields.some((member) => member.userId === candidate.userId)
									)
										toast.error("User is already a team member");
									else
										append({
											userId: candidate.userId,
											projectRole: PROJECT_MEMBER_ROLE,
											specificRole: "",
											name: `${candidate.firstName} ${candidate.lastName}`,
										});
									setSearch("");
								}}
							>
								<div className="text-sm">
									<p className="font-medium">
										{candidate.firstName} {candidate.lastName}
									</p>
									<p className="text-xs text-muted-foreground">
										{candidate.email}
									</p>
								</div>
								<Plus className="size-4 text-primary" />
							</button>
						))}
					</div>
				)}
			</div>
			<div className="space-y-2">
				<FieldLabel>Team Members &amp; Roles</FieldLabel>
				<div className="border rounded-md divide-y max-h-[280px] overflow-y-auto">
					{fields.map((field, index) => (
						<div key={field.id} className="p-3.5 space-y-2">
							<div className="flex items-center justify-between gap-3">
								<p className="text-sm font-medium truncate">{field.name}</p>
								{field.userId !== user.userId && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label={`Remove ${field.name}`}
										className="text-destructive shrink-0"
										onClick={() => remove(index)}
									>
										<Trash2 className="size-4" />
									</Button>
								)}
							</div>
							<div className="flex items-center gap-2">
								{field.userId === user.userId ? (
									<span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
										Project Leader
									</span>
								) : (
									<Controller
										control={form.control}
										name={`members.${index}.projectRole`}
										render={({ field: roleField }) => (
											<Select
												value={roleField.value}
												onValueChange={roleField.onChange}
											>
												<SelectTrigger
													size="sm"
													aria-label={`Role for ${field.name}`}
													className="w-[150px] text-xs"
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{PROJECT_ROLES.map((role) => (
														<SelectItem
															key={role}
															value={role}
															disabled={role === PROJECT_LEADER_ROLE}
														>
															{role === PROJECT_LEADER_ROLE
																? `${role} (current)`
																: role}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								)}
								{field.userId !== user.userId && (
									<Input
										{...form.register(`members.${index}.specificRole`)}
										placeholder="Specific role (optional)"
										maxLength={100}
										className="h-8 flex-1 text-xs"
									/>
								)}
							</div>
						</div>
					))}
				</div>
				<FieldError errors={[form.formState.errors.members]} />
			</div>
		</div>
	);
}
