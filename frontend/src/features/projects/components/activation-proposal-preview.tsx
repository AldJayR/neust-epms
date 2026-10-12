import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { PdfFirstPagePreview } from "@/features/proposals/public";
import { projectDetailsQueryOptions } from "../functions";

/** Uses the shared details query, whose proposal attachments are newest-version first. */
function ProposalPreviewContent({ projectId }: { projectId: string }) {
	const details = useQuery(projectDetailsQueryOptions(projectId));
	const [retryKey, setRetryKey] = useState(0);
	const document = details.data?.attachments[0];

	async function retry() {
		const result = await details.refetch();
		if (!result.isError && result.data?.attachments[0]?.url === document?.url) {
			// Recreate the PDF load task even if the refreshed URL is unchanged.
			setRetryKey((current) => current + 1);
		}
	}

	return (
		<section
			className="min-w-0 space-y-2"
			aria-label="Project proposal first-page preview"
		>
			{details.isPending ? (
				<p role="status" className="p-6 text-sm text-muted-foreground">
					Loading proposal document…
				</p>
			) : details.isError || !document?.url ? (
				<div role="alert" className="space-y-3 rounded-md border p-4">
					<p className="text-sm text-muted-foreground">
						{details.isError
							? "Unable to load the proposal document."
							: "The proposal PDF is unavailable."}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void retry()}
						disabled={details.isFetching}
					>
						Retry preview
					</Button>
				</div>
			) : (
				<PdfFirstPagePreview
					key={`${projectId}:${retryKey}`}
					url={document.url}
					onRetry={() => void retry()}
					retrying={details.isFetching}
				/>
			)}
		</section>
	);
}

export function ActivationProposalPreview({
	projectId,
}: {
	projectId: string;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={<Button type="button" variant="outline" size="sm" />}
			>
				<Eye className="size-4" />
				View proposal first page
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[820px]">
				<DialogHeader>
					<DialogTitle>Project proposal — first page</DialogTitle>
					<DialogDescription>
						Check the partner named in the proposal before selecting an active
						MOA.
					</DialogDescription>
				</DialogHeader>
				{open && (
					<ProposalPreviewContent key={projectId} projectId={projectId} />
				)}
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="outline" />}>
						Close preview
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
