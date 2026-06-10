import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "../layout/app-shell";
import {
	projectDetailsQueryOptions,
	reviewProposalFn,
} from "@/lib/dashboard.functions";

interface ProposalReviewPageProps {
	proposalId: string;
}

export function ProposalReviewPage({ proposalId }: ProposalReviewPageProps) {
	const queryClient = useQueryClient();
	const { data, isLoading, error } = useQuery(
		projectDetailsQueryOptions(proposalId),
	);

	const reviewMutation = useMutation({
		mutationFn: (input: {
			proposalId: string;
			decision: "Endorsed" | "Approved" | "Returned" | "Rejected";
			comments?: string;
		}) => reviewProposalFn({ data: input }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["dashboard", "proposals", proposalId],
			});
		},
	});

	const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(
		null,
	);

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

	const endorsement = data?.history.find(
		(h) => h.status === "Endorsed" || h.status === "Approved",
	);

	const currentDoc =
		data?.attachments.find((a) => a.id === activeAttachmentId) ??
		data?.attachments[0];

	const isReviewable =
		data?.status === "Endorsed" || data?.status === "Submitted";

	const handleApprove = () => {
		const decision = data?.status === "Endorsed" ? "Approved" : "Endorsed";
		reviewMutation.mutate({
			proposalId,
			decision,
			comments: "Approved via review",
		});
	};

	const handleDeny = () => {
		reviewMutation.mutate({
			proposalId,
			decision: "Returned",
			comments: "Returned for revision",
		});
	};

	return (
		<AppShell>
			<div className="flex flex-col gap-8">
				{/* Page Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<h1 className="text-2xl font-semibold text-[#11215a] tracking-tight">
							{isLoading ? "Loading..." : (data?.title ?? "Proposal")}
						</h1>
						{data?.status && (
							<Badge
								variant="outline"
								className="bg-white border-[#e5e5e5] text-[#737373] font-medium rounded-lg px-2.5 py-0.5 text-[12px]"
							>
								{data.status}
							</Badge>
						)}
					</div>
					{currentDoc && (
						<a href={currentDoc.url} target="_blank" rel="noopener noreferrer">
							<Button className="bg-[#14369c] text-white hover:bg-[#14369c]/90 rounded-[10px] h-9 px-4 gap-2 text-sm font-medium">
								<Download className="size-4" />
								Download
							</Button>
						</a>
					)}
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center h-[500px]">
						<Loader2 className="size-8 animate-spin text-[#11215a]" />
					</div>
				) : error ? (
					<div className="flex items-center justify-center h-[500px]">
						<p className="text-muted-foreground">
							Failed to load proposal details.
						</p>
					</div>
				) : data ? (
					/* Main Content Layout */
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
						{/* Left Column: PDF Viewer */}
						<div className="lg:col-span-8 flex flex-col gap-4">
							<div className="bg-[#f9f9f9] border border-[#ebebeb] rounded-[12px] shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] overflow-hidden h-[844px] flex flex-col items-center pt-8 px-4">
								<div className="bg-white w-full h-full shadow-lg rounded-t-sm overflow-hidden flex flex-col">
									<div className="flex-1">
										{currentDoc ? (
											<iframe
												src={currentDoc.url}
												className="w-full h-full border-none"
												title={currentDoc.name}
											/>
										) : (
											<div className="flex items-center justify-center h-full text-[#737373]">
												No document available
											</div>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Right Column: Details & Actions */}
						<div className="lg:col-span-4 flex flex-col gap-6">
							<Card className="border-[#ebebeb] shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] rounded-[12px] overflow-hidden">
								<div className="px-4 py-3 border-b border-[#ebebeb]">
									<h2 className="text-sm font-normal text-[#666]">
										Proposal Details
									</h2>
								</div>
								<CardContent className="p-0">
									<div className="p-5 space-y-4">
										<div className="flex justify-between items-center text-[14px]">
											<span className="text-[#737373] font-medium">
												Submitted by
											</span>
											<span className="text-black font-medium">
												{data.metadata.leader.name}
											</span>
										</div>
										<div className="flex justify-between items-center text-[14px]">
											<span className="text-[#737373] font-medium">
												Department
											</span>
											<span className="text-black font-medium">
												{data.metadata.department}
											</span>
										</div>
										<div className="flex justify-between items-center text-[14px]">
											<span className="text-[#737373] font-medium">
												Duration
											</span>
											<span className="text-black font-medium">
												{data.metadata.duration}
											</span>
										</div>
										<div className="flex justify-between items-center text-[14px]">
											<span className="text-[#737373] font-medium">
												Budget (NEUST)
											</span>
											<span className="text-black font-medium">
												{formatBudget(data.metadata.budget.neust)}
											</span>
										</div>
										<div className="flex justify-between items-center text-[14px]">
											<span className="text-[#737373] font-medium">
												MOA Partner
											</span>
											<span className="text-black font-medium">
												{data.metadata.moaLinked}
											</span>
										</div>
									</div>

									<div className="px-5 py-2">
										<Separator className="bg-[#ebebeb]" />
									</div>

									{endorsement && (
										<div className="p-5 space-y-4">
											<h3 className="text-[14px] font-medium text-black">
												Endorsement
											</h3>
											<div className="rounded-[10px] border border-[#e5e5e5] p-3 space-y-1">
												<div className="flex items-center gap-3">
													<CheckCircle2 className="size-4 text-black" />
													<span className="text-[14px] font-medium text-black">
														{endorsement.status} by {endorsement.actorName}
													</span>
												</div>
												<div className="pl-7">
													<span className="text-[12px] text-[#737373] font-light">
														{formatReviewDate(endorsement.date)}
													</span>
												</div>
											</div>

											{endorsement.comment && (
												<>
													<h3 className="text-[14px] font-medium text-black mt-6">
														Remarks
													</h3>
													<div className="rounded-[10px] border border-[#e5e5e5] p-3">
														<p className="text-[14px] text-black font-light leading-relaxed">
															"{endorsement.comment}"
														</p>
													</div>
												</>
											)}
										</div>
									)}

									<div className="px-5 py-2">
										<Separator className="bg-[#ebebeb]" />
									</div>

									<div className="p-5 space-y-3">
										<h3 className="text-[14px] font-medium text-black">
											Attached documents
										</h3>
										<div className="space-y-1">
											{data.attachments.map((file) => {
												const isActive =
													activeAttachmentId === null
														? data.attachments[0]?.id === file.id
														: activeAttachmentId === file.id;
												return (
													<div
														key={file.id}
														onClick={() => setActiveAttachmentId(file.id)}
														onKeyDown={(e) => {
															if (e.key === "Enter" || e.key === " ") {
																e.preventDefault();
																setActiveAttachmentId(file.id);
															}
														}}
														role="button"
														tabIndex={0}
														className={`px-3 py-2 rounded-[5px] flex flex-col gap-0.5 cursor-pointer ${isActive ? "bg-[#caf1f6]" : "bg-transparent hover:bg-gray-50"}`}
													>
														<span
															className={`text-[12px] font-semibold ${isActive ? "text-[#0d74ce]" : "text-black"}`}
														>
															{file.name}
														</span>
														<span className="text-[11px] text-[#737373]">
															{file.version} {isActive && "· Currently Viewing"}
														</span>
													</div>
												);
											})}
										</div>
									</div>

									{isReviewable && (
										<div className="p-5 flex gap-3">
											<Button
												variant="outline"
												className="flex-1 border border-[#e5e5e5] rounded-[10px] text-[#e54d2e] font-medium h-9 text-sm shadow-sm"
												onClick={handleDeny}
												disabled={reviewMutation.isPending}
											>
												{reviewMutation.isPending ? (
													<Loader2 className="size-4 animate-spin" />
												) : (
													"Return"
												)}
											</Button>
											<Button
												className="flex-1 bg-[#14369c] text-white hover:bg-[#14369c]/90 rounded-[10px] font-medium h-9 text-sm shadow-sm"
												onClick={handleApprove}
												disabled={reviewMutation.isPending}
											>
												{reviewMutation.isPending ? (
													<Loader2 className="size-4 animate-spin" />
												) : (
													"Approve"
												)}
											</Button>
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				) : null}
			</div>
		</AppShell>
	);
}
