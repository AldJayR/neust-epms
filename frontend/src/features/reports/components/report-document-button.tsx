import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getReportAttachmentUrlFn, getReportSignedUrlFn } from "../functions";

export function ReportDocumentButton({
	id,
	kind = "report",
	label = "View report",
}: {
	id: string;
	kind?: "report" | "attachment";
	label?: string;
}) {
	const [opening, setOpening] = useState(false);
	return (
		<Button
			size="sm"
			variant="outline"
			disabled={opening}
			onClick={async () => {
				const documentWindow = window.open("about:blank", "_blank");
				if (!documentWindow) {
					toast.error("Allow pop-ups to open the document in a new tab.");
					return;
				}
				documentWindow.opener = null;
				setOpening(true);
				try {
					const { url } = await (kind === "attachment"
						? getReportAttachmentUrlFn({ data: id })
						: getReportSignedUrlFn({ data: id }));
					documentWindow.location.href = url;
				} catch (error) {
					documentWindow.close();
					toast.error(
						error instanceof Error
							? error.message
							: "We couldn't open this document. Please try again.",
					);
				} finally {
					setOpening(false);
				}
			}}
		>
			{opening ? "Opening…" : label}
		</Button>
	);
}
