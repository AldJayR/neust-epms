import { Download, Eye, FileText } from "lucide-react";
import { PageCard } from "@/components/custom/page-card";
import {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
} from "@/components/ui/attachment";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface AttachmentsCardProps {
	attachments: {
		id: string | number;
		name: string;
		type: string;
		url: string;
		version: string;
	}[];
}

export function AttachmentsCard({ attachments }: AttachmentsCardProps) {
	return (
		<PageCard>
			<div className="bg-card border-b border-border px-6 py-3">
				<h2 className="text-sm font-semibold text-heading">Attachments</h2>
			</div>
			<div className="p-4 flex flex-col gap-2">
				{attachments.map((attachment) => (
					<Attachment key={attachment.id} state="done" className="w-full">
						<AttachmentMedia>
							<FileText className="size-4" />
						</AttachmentMedia>
						<AttachmentContent>
							<AttachmentTitle>{attachment.name}</AttachmentTitle>
							<AttachmentDescription>
								{attachment.type} · {attachment.version}
							</AttachmentDescription>
						</AttachmentContent>
						<AttachmentActions>
							<Tooltip>
								<TooltipTrigger
									render={
										<AttachmentAction
											nativeButton={false}
											render={
												<a
													href={attachment.url}
													target="_blank"
													rel="noopener noreferrer"
													aria-label="View file"
												>
													<Eye className="size-3.5" />
												</a>
											}
										/>
									}
								/>
								<TooltipContent>View file</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger
									render={
										<AttachmentAction
											nativeButton={false}
											render={
												<a
													href={attachment.url}
													download
													aria-label="Download file"
												>
													<Download className="size-3.5" />
												</a>
											}
										/>
									}
								/>
								<TooltipContent>Download file</TooltipContent>
							</Tooltip>
						</AttachmentActions>
					</Attachment>
				))}
			</div>
		</PageCard>
	);
}
