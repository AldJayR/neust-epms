import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { LoadingButton } from "@/components/custom/loading-button";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const formatBudget = (value: number) => `P${value.toLocaleString("en-PH")}`;

const formatReviewDate = (dateStr: string) => {
	try {
		return new Date(dateStr).toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	} catch {
		return dateStr;
	}
};

interface ProposalDetailsTabProps {
	data: {
		metadata: {
			leader: {
				name: string;
			};
			departmentCode: string;
			duration: string;
			budget: {
				neust: number;
			};
			moaLinked: string;
			sdgs?: string;
		};
		attachments?: {
			id: string;
			name: string;
			version: string;
		}[];
	};
	endorsement?: {
		status: string;
		actorName: string;
		date: string;
		comment?: string;
	};
	activeAttachmentId: string | null;
	setActiveAttachmentId: (id: string) => void;
	isReviewable: boolean;
	handleDeny: () => void;
	handleApprove: (comments?: string) => void;
	isPending: boolean;
	isRET?: boolean;
}

export function ProposalDetailsTab({
	data,
	endorsement,
	activeAttachmentId,
	setActiveAttachmentId,
	isReviewable,
	handleDeny,
	handleApprove,
	isPending,
	isRET = false,
}: ProposalDetailsTabProps) {
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [commentsText, setCommentsText] = useState("");

	return (
		<CardContent className="p-0">
			<div className="p-5 space-y-4">
				<div className="flex justify-between items-center text-sm">
					<span className="text-muted-foreground font-medium">
						Submitted by
					</span>
					<span className="text-black font-medium">
						{data.metadata.leader.name}
					</span>
				</div>
				<div className="flex justify-between items-center text-sm">
					<span className="text-muted-foreground font-medium">Department</span>
					<span className="text-black font-medium">
						{data.metadata.departmentCode}
					</span>
				</div>
				<div className="flex justify-between items-center text-sm">
					<span className="text-muted-foreground font-medium">Duration</span>
					<span className="text-black font-medium">
						{data.metadata.duration}
					</span>
				</div>
				<div className="flex justify-between items-center text-sm">
					<span className="text-muted-foreground font-medium">
						Budget (NEUST)
					</span>
					<span className="text-black font-medium">
						{formatBudget(data.metadata.budget.neust)}
					</span>
				</div>
				<div className="flex justify-between items-center text-sm">
					<span className="text-muted-foreground font-medium">SDGs</span>
					<span className="text-black font-medium">
						{data.metadata.sdgs ?? "None"}
					</span>
				</div>
			</div>

			<div className="px-5 py-2">
				<Separator />
			</div>

			{endorsement && (
				<>
					<div className="p-5 space-y-4">
						<h2 className="text-sm font-medium text-black">Endorsement</h2>
						<div className="rounded-lg border border-border p-3 space-y-1">
							<div className="flex items-center gap-3">
								<CheckCircle2 className="size-4 text-black" />
								<span className="text-sm font-medium text-black">
									{endorsement.status} by {endorsement.actorName}
								</span>
							</div>
							<div className="pl-7">
								<span className="text-xs text-muted-foreground font-light">
									{formatReviewDate(endorsement.date)}
								</span>
							</div>
						</div>

						{endorsement.comment && (
							<>
								<h2 className="text-sm font-medium text-black mt-6">Remarks</h2>
								<div className="rounded-lg border border-border p-3">
									<p className="text-sm text-black font-light leading-relaxed">
										"{endorsement.comment}"
									</p>
								</div>
							</>
						)}
					</div>

					<div className="px-5 py-2">
						<Separator />
					</div>
				</>
			)}

			<div className="p-5 space-y-3">
				<h2 className="text-sm font-medium text-black">Attached documents</h2>
				<div className="space-y-1">
					{data.attachments?.map((file) => {
						const isActive =
							activeAttachmentId === null
								? data.attachments?.[0]?.id === file.id
								: activeAttachmentId === file.id;
						return (
							<button
								key={file.id}
								type="button"
								onClick={() => {
									setActiveAttachmentId(file.id);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setActiveAttachmentId(file.id);
									}
								}}
								className={`w-full px-3 py-2 rounded-[5px] flex flex-col gap-0.5 cursor-pointer text-left ${isActive ? "bg-[#caf1f6]" : "bg-transparent hover:bg-gray-50"}`}
							>
								<span
									className={`text-xs font-semibold ${isActive ? "text-[#0d74ce]" : "text-black"}`}
								>
									{file.name}
								</span>
								<span className="text-2xs text-muted-foreground">
									{file.version} {isActive && "· Currently Viewing"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{isReviewable && isRET && (
				<>
					<div className="px-5 py-2">
						<Separator />
					</div>
					<div className="px-5 pt-2">
						<p className="text-xs text-muted-foreground font-light leading-relaxed">
							Approving will forward this proposal to the Director/Admin for
							final review.
						</p>
					</div>
				</>
			)}

			{isReviewable && (
				<div className="p-5 flex gap-3">
					<LoadingButton
						variant="outline"
						className="flex-1 border border-border rounded-lg text-[#e54d2e] font-medium h-9 text-sm shadow-sm"
						onClick={handleDeny}
						loading={isPending}
					>
						Return
					</LoadingButton>
					<LoadingButton
						className="flex-1 font-medium h-9 text-sm shadow-sm cursor-pointer bg-brand-primary text-white hover:bg-brand-primary/90 rounded-lg"
						onClick={() => {
							if (isRET) {
								setCommentsText("");
								setIsConfirmOpen(true);
							} else {
								handleApprove();
							}
						}}
						loading={isPending}
					>
						{isRET ? "Endorse" : "Approve"}
					</LoadingButton>
				</div>
			)}

			<Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
				<DialogContent className="sm:max-w-[425px] rounded-xl p-6 bg-background gap-4">
					<DialogHeader className="pb-2">
						<DialogTitle className="text-base font-semibold text-heading">
							Endorse Proposal
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground font-light">
							Please enter any final comments or remarks before endorsing this
							proposal (optional).
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<Textarea
							placeholder="Write final comments/remarks here (optional)..."
							value={commentsText}
							onChange={(e) => setCommentsText(e.target.value)}
							className="w-full min-h-[100px] border border-border rounded-lg p-3 text-sm focus-visible:ring-1 focus-visible:ring-brand-primary"
						/>
					</div>

					<DialogFooter className="flex gap-3 mt-4">
						<Button
							variant="outline"
							className="flex-1 border border-border rounded-lg text-gray-500 font-medium h-9 text-sm shadow-sm cursor-pointer"
							onClick={() => setIsConfirmOpen(false)}
						>
							Cancel
						</Button>
						<LoadingButton
							className="flex-1 font-medium h-9 text-sm shadow-sm cursor-pointer bg-brand-primary text-white hover:bg-brand-primary/90 rounded-lg"
							onClick={() => {
								handleApprove(commentsText);
								setIsConfirmOpen(false);
							}}
							loading={isPending}
						>
							Endorse
						</LoadingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</CardContent>
	);
}
