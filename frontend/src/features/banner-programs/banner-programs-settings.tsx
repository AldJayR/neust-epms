import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, Power, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	createBannerProgramFn,
	managedBannerProgramsQueryOptions,
	updateBannerProgramFn,
} from "./functions";

interface BannerProgramsSettingsProps {
	open: boolean;
}

export function BannerProgramsSettings({ open }: BannerProgramsSettingsProps) {
	const queryClient = useQueryClient();
	const { data, isLoading, error } = useQuery({
		...managedBannerProgramsQueryOptions(),
		enabled: open,
	});
	const [programName, setProgramName] = React.useState("");
	const [editingId, setEditingId] = React.useState<number | null>(null);
	const [editingName, setEditingName] = React.useState("");

	const invalidatePrograms = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: ["banner-programs", "active"],
			}),
			queryClient.invalidateQueries({
				queryKey: ["banner-programs", "manage"],
			}),
		]);
	};

	const createMutation = useMutation({
		mutationFn: createBannerProgramFn,
		onSuccess: async () => {
			setProgramName("");
			toast.success("Banner program added");
			await invalidatePrograms();
		},
		onError: (mutationError) => toast.error(mutationError.message),
	});

	const updateMutation = useMutation({
		mutationFn: updateBannerProgramFn,
		onSuccess: async () => {
			setEditingId(null);
			setEditingName("");
			toast.success("Banner program updated");
			await invalidatePrograms();
		},
		onError: (mutationError) => toast.error(mutationError.message),
	});

	const isBusy = createMutation.isPending || updateMutation.isPending;

	return (
		<div className="mx-auto max-w-xl space-y-6">
			<div>
				<h2 className="text-base font-semibold">Banner Programs</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Configure the programs available to proposal authors in your scope.
				</p>
				{data?.scopeLabel && (
					<p className="mt-2 text-xs font-medium text-muted-foreground">
						Scope: {data.scopeLabel}
					</p>
				)}
			</div>

			<form
				className="flex gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					if (programName.trim()) {
						createMutation.mutate({ data: { programName } });
					}
				}}
			>
				<Input
					value={programName}
					onChange={(event) => setProgramName(event.target.value)}
					placeholder="Add a banner program"
					maxLength={255}
					disabled={isBusy}
				/>
				<Button type="submit" disabled={!programName.trim() || isBusy}>
					{createMutation.isPending ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Plus className="size-4" />
					)}
					Add
				</Button>
			</form>

			{isLoading && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="size-4 animate-spin" /> Loading programs...
				</div>
			)}
			{error && <p className="text-sm text-destructive">{error.message}</p>}

			{data && data.programs.length === 0 && (
				<p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
					No programs configured yet. Proposal authors will not be able to
					submit until at least one program is active.
				</p>
			)}

			{data && data.programs.length > 0 && (
				<div className="space-y-2">
					{data.programs.map((program) => {
						const isEditing = editingId === program.bannerProgramId;
						return (
							<div
								key={program.bannerProgramId}
								className="flex items-center gap-3 rounded-md border p-3"
							>
								{isEditing ? (
									<Input
										value={editingName}
										onChange={(event) => setEditingName(event.target.value)}
										maxLength={255}
										autoFocus
									/>
								) : (
									<span className="min-w-0 flex-1 truncate text-sm font-medium">
										{program.programName}
									</span>
								)}
								<Badge variant={program.isActive ? "secondary" : "outline"}>
									{program.isActive ? "Active" : "Inactive"}
								</Badge>
								{isEditing ? (
									<>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											disabled={!editingName.trim() || isBusy}
											onClick={() =>
												updateMutation.mutate({
													data: {
														bannerProgramId: program.bannerProgramId,
														programName: editingName,
													},
												})
											}
											aria-label="Save banner program name"
										>
											<Check className="size-4" />
										</Button>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											onClick={() => {
												setEditingId(null);
												setEditingName("");
											}}
											aria-label="Cancel rename"
										>
											<X className="size-4" />
										</Button>
									</>
								) : (
									<>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											onClick={() => {
												setEditingId(program.bannerProgramId);
												setEditingName(program.programName);
											}}
											aria-label={`Rename ${program.programName}`}
										>
											<Pencil className="size-4" />
										</Button>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											disabled={isBusy}
											onClick={() =>
												updateMutation.mutate({
													data: {
														bannerProgramId: program.bannerProgramId,
														isActive: !program.isActive,
													},
												})
											}
											aria-label={`${program.isActive ? "Deactivate" : "Activate"} ${program.programName}`}
										>
											<Power className="size-4" />
										</Button>
									</>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
