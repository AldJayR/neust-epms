import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	restoreMoaFn,
	restoreProjectFn,
	restoreProposalFn,
} from "../functions";
import {
	createArchiveRestoreItem,
	getArchiveRestoreId,
	type ArchiveRestoreItem,
	type ArchiveRestoreType,
} from "../helpers/archive-helpers";

export function useArchiveRestore() {
	const queryClient = useQueryClient();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [itemToRestore, setItemToRestore] = useState<ArchiveRestoreItem | null>(
		null,
	);

	const restoreProposalMutation = useMutation({
		mutationFn: restoreProposalFn,
		onSuccess: () => {
			toast.success("Proposal restored successfully");
			queryClient.invalidateQueries({ queryKey: ["archives", "proposals"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "proposals"] });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to restore proposal",
			);
		},
	});
	const restoreProjectMutation = useMutation({
		mutationFn: restoreProjectFn,
		onSuccess: () => {
			toast.success("Project restored successfully");
			queryClient.invalidateQueries({ queryKey: ["archives", "projects"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to restore project",
			);
		},
	});
	const restoreMoaMutation = useMutation({
		mutationFn: restoreMoaFn,
		onSuccess: () => {
			toast.success("MOA restored successfully");
			queryClient.invalidateQueries({ queryKey: ["archives", "moas"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "moas"] });
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Failed to restore MOA");
		},
	});

	const handleRestoreClick = (
		id: string,
		type: ArchiveRestoreType,
		title: string,
	) => {
		setItemToRestore(createArchiveRestoreItem(id, type, title));
		setConfirmOpen(true);
	};

	const handleConfirmRestore = async () => {
		if (!itemToRestore) return;
		const id = getArchiveRestoreId(itemToRestore);
		if (itemToRestore.type === "proposal") {
			await restoreProposalMutation.mutateAsync({ data: id });
		} else if (itemToRestore.type === "project") {
			await restoreProjectMutation.mutateAsync({ data: id });
		} else {
			await restoreMoaMutation.mutateAsync({ data: id });
		}
		setConfirmOpen(false);
		setItemToRestore(null);
	};

	return {
		confirmOpen,
		setConfirmOpen,
		itemToRestore,
		handleRestoreClick,
		handleConfirmRestore,
	};
}
