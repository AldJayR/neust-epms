"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AnnotationData, ProposalComment } from "@/lib/comments.functions";

interface CommentHighlightsProps {
	comments: ProposalComment[];
}

export function CommentHighlights({ comments }: CommentHighlightsProps) {
	return (
		<TooltipProvider>
			{comments.map((comment) => {
				const annot = comment.annotationJson;
				if (!annot) return null;
				return (
					<Tooltip key={comment.commentId}>
						<TooltipTrigger
							render={
								<button
								type="button"
								aria-label={`Comment by ${comment.user.name}: "${comment.content}"`}
								className="absolute z-20 pointer-events-auto bg-yellow-400/25 border border-yellow-500/20 hover:bg-yellow-400/40 focus-visible:bg-yellow-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-colors cursor-pointer"
								style={{
									left: `${annot.x}%`,
									top: `${annot.y}%`,
									width: `${annot.width}%`,
									height: `${annot.height}%`,
								}}
							/>
							}
						/>
						<TooltipContent className="bg-zinc-950 text-white border-zinc-800 p-3 max-w-[280px] shadow-lg rounded-[8px] z-50">
							<div className="space-y-1">
								<div className="flex items-center justify-between gap-4">
									<span className="font-semibold text-xs text-white">
										{comment.user.name}
									</span>
									<span className="text-3xs text-zinc-400">
										{comment.user.roleName}
									</span>
								</div>
								<p className="text-2xs leading-relaxed text-zinc-200">
									"{comment.content}"
								</p>
								<span className="text-[9px] block text-zinc-500 text-right">
									{new Date(comment.createdAt).toLocaleDateString()}
								</span>
							</div>
						</TooltipContent>
					</Tooltip>
				);
			})}
		</TooltipProvider>
	);
}

interface CommentCreationPopoverProps {
	pendingAnnotation: AnnotationData | null;
	pageNumber: number;
	commentText: string;
	onCommentTextChange: (text: string) => void;
	onSave: () => void;
	onCancel: () => void;
}

export function CommentCreationPopover({
	pendingAnnotation,
	pageNumber,
	commentText,
	onCommentTextChange,
	onSave,
	onCancel,
}: CommentCreationPopoverProps) {
	if (!pendingAnnotation) return null;

	const popoverStyle: React.CSSProperties = {
		position: "absolute",
		left: `${pendingAnnotation.x}%`,
		top: `${pendingAnnotation.y + pendingAnnotation.height}%`,
		transform:
			pendingAnnotation.y > 70 ? "translateY(-105%)" : "translateY(4px)",
		zIndex: 50,
	};

	return (
		<div
			style={popoverStyle}
			className="bg-background border border-border rounded-xl shadow-xl p-4 w-[280px] flex flex-col gap-3 z-50"
		>
			<div className="flex flex-col gap-0.5">
				<span className="text-xs font-semibold text-black">
					Add Remark / Comment
				</span>
				<span className="text-3xs text-muted-foreground">
					Page {pageNumber}
				</span>
			</div>
			<textarea
				ref={(el) => {
					if (el) el.focus();
				}}
				aria-label="Feedback comment text"
				className="w-full h-20 text-xs p-2 border border-border rounded-[6px] focus:outline-none focus:border-brand-primary resize-none"
				placeholder="Type your feedback here..."
				value={commentText}
				onChange={(e) => onCommentTextChange(e.target.value)}
			/>
			<div className="flex justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					className="h-8 rounded-[6px] text-xs cursor-pointer"
					onClick={onCancel}
				>
					Cancel
				</Button>
				<Button
					size="sm"
					className="h-8 rounded-[6px] text-xs bg-brand-primary hover:bg-brand-primary-hover text-white cursor-pointer"
					onClick={onSave}
					disabled={!commentText.trim()}
				>
					Save
				</Button>
			</div>
		</div>
	);
}
