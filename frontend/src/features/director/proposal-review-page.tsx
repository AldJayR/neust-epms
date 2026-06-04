import { CheckCircle2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "../layout/app-shell";

interface ProposalReviewPageProps {
	proposalId: string;
}

export function ProposalReviewPage({ proposalId }: ProposalReviewPageProps) {
	// Mock data to match Figma
	const data = {
		title: "Sustainable Urban Farming Initiative",
		status: "Endorsed by RET Chair",
		pdfUrl:
			"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", // Placeholder PDF
		details: {
			submittedBy: "Michael E. Bensi",
			department: "CICT",
			duration: "Jan - Dec 2025",
			budgetNeust: "P154,000",
			sdgs: "SDG 6, SDG 9",
		},
		endorsement: {
			by: "Rachel Alegado",
			date: "April 22, 2025 · 3:25PM",
			remarks:
				"Proposal is well-aligned with the college's extension thrust. Budget has been revised and is now acceptable. Recommending for final approval.",
		},
		attachments: [
			{ name: "Project_Proposal.pdf", size: "2.4MB", active: true },
			{ name: "Special_Order.pdf", size: "1.1MB", active: false },
		],
	};

	return (
		<AppShell>
			<div className="flex flex-col gap-8">
				{/* Page Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<h1 className="text-2xl font-semibold text-[#11215a] tracking-tight">
							{data.title}
						</h1>
						<Badge
							variant="outline"
							className="bg-white border-[#e5e5e5] text-[#737373] font-medium rounded-lg px-2.5 py-0.5 text-[12px]"
						>
							{data.status}
						</Badge>
					</div>
					<Button className="bg-[#14369c] text-white hover:bg-[#14369c]/90 rounded-[10px] h-9 px-4 gap-2 text-sm font-medium">
						<Download className="size-4" />
						Download
					</Button>
				</div>

				{/* Main Content Layout */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* Left Column: PDF Viewer */}
					<div className="lg:col-span-8 flex flex-col gap-4">
						<div className="bg-[#f9f9f9] border border-[#ebebeb] rounded-[12px] shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] overflow-hidden h-[844px] flex flex-col items-center pt-8 px-4">
							{/* PDF Container simulating the white page in Figma */}
							<div className="bg-white w-full h-full shadow-lg rounded-t-sm overflow-hidden flex flex-col">
								<div className="flex-1">
									<iframe
										src={data.pdfUrl}
										className="w-full h-full border-none"
										title="Proposal Document"
									/>
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
											{data.details.submittedBy}
										</span>
									</div>
									<div className="flex justify-between items-center text-[14px]">
										<span className="text-[#737373] font-medium">
											Department
										</span>
										<span className="text-black font-medium">
											{data.details.department}
										</span>
									</div>
									<div className="flex justify-between items-center text-[14px]">
										<span className="text-[#737373] font-medium">Duration</span>
										<span className="text-black font-medium">
											{data.details.duration}
										</span>
									</div>
									<div className="flex justify-between items-center text-[14px]">
										<span className="text-[#737373] font-medium">
											Budget (NEUST)
										</span>
										<span className="text-black font-medium">
											{data.details.budgetNeust}
										</span>
									</div>
									<div className="flex justify-between items-center text-[14px]">
										<span className="text-[#737373] font-medium">
											SDGs addressed
										</span>
										<span className="text-black font-medium">
											{data.details.sdgs}
										</span>
									</div>
								</div>

								<div className="px-5 py-2">
									<Separator className="bg-[#ebebeb]" />
								</div>

								<div className="p-5 space-y-4">
									<h3 className="text-[14px] font-medium text-black">
										RET Chair Endorsement
									</h3>
									<div className="rounded-[10px] border border-[#e5e5e5] p-3 space-y-1">
										<div className="flex items-center gap-3">
											<CheckCircle2 className="size-4 text-black" />
											<span className="text-[14px] font-medium text-black">
												Endorsed by {data.endorsement.by}
											</span>
										</div>
										<div className="pl-7">
											<span className="text-[12px] text-[#737373] font-light">
												{data.endorsement.date}
											</span>
										</div>
									</div>

									<h3 className="text-[14px] font-medium text-black mt-6">
										Chair's remarks
									</h3>
									<div className="rounded-[10px] border border-[#e5e5e5] p-3">
										<p className="text-[14px] text-black font-light leading-relaxed">
											"{data.endorsement.remarks}"
										</p>
									</div>
								</div>

								<div className="px-5 py-2">
									<Separator className="bg-[#ebebeb]" />
								</div>

								<div className="p-5 space-y-3">
									<h3 className="text-[14px] font-medium text-black">
										Attached documents
									</h3>
									<div className="space-y-1">
										{data.attachments.map((file) => (
											<div
												key={file.name}
												className={`px-3 py-2 rounded-[5px] flex flex-col gap-0.5 cursor-pointer ${file.active ? "bg-[#caf1f6]" : "bg-transparent hover:bg-gray-50"}`}
											>
												<span
													className={`text-[12px] font-semibold ${file.active ? "text-[#0d74ce]" : "text-black"}`}
												>
													{file.name}
												</span>
												<span className="text-[11px] text-[#737373]">
													{file.size} {file.active && "· Currently Viewing"}
												</span>
											</div>
										))}
									</div>
								</div>

								<div className="p-5 flex gap-3">
									<Button
										variant="outline"
										className="flex-1 border border-[#e5e5e5] rounded-[10px] text-[#e54d2e] font-medium h-9 text-sm shadow-sm"
									>
										Deny
									</Button>
									<Button className="flex-1 bg-[#14369c] text-white hover:bg-[#14369c]/90 rounded-[10px] font-medium h-9 text-sm shadow-sm">
										Approve
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</AppShell>
	);
}
