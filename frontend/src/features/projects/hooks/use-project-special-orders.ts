import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	getSpecialOrderSignedUrlFn,
	uploadSpecialOrderFn,
} from "../special-orders.functions";
import type { ProjectMember } from "@/types/project";

export function useProjectSpecialOrders(proposalId: string) {
	const queryClient = useQueryClient();
	const [uploadingMemberId, setUploadingMemberId] = useState<string | null>(
		null,
	);
	const [soNumbers, setSoNumbers] = useState<Record<string, string>>({});
	const [files, setFiles] = useState<Record<string, File | null>>({});
	const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

	const handleUpload = async (member: ProjectMember) => {
		const soNumber = soNumbers[member.userId];
		const file = files[member.userId];
		if (!soNumber || !file) return;

		setUploadingMemberId(member.userId);
		setUploadErrors((previous) => ({ ...previous, [member.userId]: "" }));

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("memberId", member.memberId);
			formData.append("soNumber", soNumber);

			await uploadSpecialOrderFn({ data: formData });

			await queryClient.invalidateQueries({
				queryKey: ["dashboard", "proposals", proposalId],
			});

			setSoNumbers((previous) => ({ ...previous, [member.userId]: "" }));
			setFiles((previous) => ({ ...previous, [member.userId]: null }));
		} catch (error) {
			setUploadErrors((previous) => ({
				...previous,
				[member.userId]:
					error instanceof Error ? error.message : "Upload failed",
			}));
		} finally {
			setUploadingMemberId(null);
		}
	};

	const handleViewSO = async (specialOrderId: string) => {
		try {
			const result = await getSpecialOrderSignedUrlFn({
				data: specialOrderId,
			});
			window.open(result.url, "_blank", "noopener,noreferrer");
		} catch (error) {
			console.error("Failed to get signed URL:", error);
		}
	};

	return {
		uploadingMemberId,
		soNumbers,
		files,
		uploadErrors,
		setSoNumber: (userId: string, value: string) =>
			setSoNumbers((previous) => ({ ...previous, [userId]: value })),
		setFile: (userId: string, file: File | null) =>
			setFiles((previous) => ({ ...previous, [userId]: file })),
		handleUpload,
		handleViewSO,
	};
}
