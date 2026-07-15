import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProposalComment } from "../comments.functions";
import { CommentsTab } from "./comments-tab";
import type { PdfViewerRef } from "./pdf-viewer";
import { ProposalDetailsTab } from "./proposal-details-tab";

interface ProposalReviewSidebarProps {
	comments: ProposalComment[];
	attachmentsCount: number;
	viewerRef: React.RefObject<PdfViewerRef | null>;
}

export function ProposalReviewSidebar({
	comments,
	attachmentsCount,
	viewerRef,
}: ProposalReviewSidebarProps) {
	const [activeTab, setActiveTab] = useState<"details" | "comments">("details");

	return (
		<div className="lg:col-span-4 flex flex-col gap-6">
			<Card className="border-border shadow-[0_1px_3px_0_var(--shadow-card)] rounded-[12px] overflow-hidden pt-2 pb-0 gap-0">
				<Tabs
					defaultValue="details"
					value={activeTab}
					onValueChange={(value) =>
						setActiveTab(value as "details" | "comments")
					}
					className="w-full"
				>
					<TabsList
						variant="line"
						className="w-full justify-start rounded-none gap-0 px-0"
					>
						<div className="relative w-full flex">
							<TabsTrigger
								value="details"
								className="flex-1 py-3 text-xs font-semibold rounded-none cursor-pointer data-active:bg-transparent data-active:shadow-none data-active:text-brand-primary after:!opacity-0"
							>
								Proposal Details
							</TabsTrigger>
							<TabsTrigger
								value="comments"
								className="flex-1 py-3 text-xs font-semibold rounded-none cursor-pointer data-active:bg-transparent data-active:shadow-none data-active:text-brand-primary after:!opacity-0"
							>
								Comments
								{comments.length > 0 && (
									<span
										className={`px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${activeTab === "comments" ? "bg-primary text-primary-foreground" : "bg-gray-100 text-muted-foreground dark:bg-muted"}`}
									>
										{comments.length}
									</span>
								)}
							</TabsTrigger>
							<div
								className={`absolute bottom-0 left-0 h-[2px] w-1/2 bg-brand-primary transition-all duration-300 ease-in-out ${activeTab === "details" ? "translate-x-0" : "translate-x-full"}`}
							/>
						</div>
					</TabsList>

					<TabsContent value="details" className="mt-0">
						<ProposalDetailsTab />
					</TabsContent>

					<TabsContent value="comments" className="mt-0">
						<CommentsTab
							comments={comments}
							attachmentsCount={attachmentsCount}
							pdfViewerRef={viewerRef}
						/>
					</TabsContent>
				</Tabs>
			</Card>
		</div>
	);
}
