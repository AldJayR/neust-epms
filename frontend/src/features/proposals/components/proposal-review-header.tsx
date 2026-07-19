import { Link } from "@tanstack/react-router";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { BrandButton } from "@/components/custom/brand-button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";

interface ProposalReviewHeaderProps {
	proposalId: string;
	title: string;
	status: string;
	currentDocument?: { id: string; url: string };
	isDownloading: boolean;
	onDownloadAnnotated: () => Promise<void>;
}

export function ProposalReviewHeader({
	proposalId,
	title,
	status,
	currentDocument,
	isDownloading,
	onDownloadAnnotated,
}: ProposalReviewHeaderProps) {
	return (
		<>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							render={
								<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />
							}
						>
							Dashboard
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink
							render={
								<Link
									to="/projects/$projectId"
									params={{ projectId: proposalId }}
								/>
							}
						>
							Project Details
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Proposal Review</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 flex-wrap items-center gap-4">
					<h1 className="min-w-0 break-words text-2xl font-semibold text-heading tracking-tight">
						{title}
					</h1>
					<StatusBadge status={status} variant="outline" />
				</div>
				{currentDocument && (
					<div className="flex items-center">
						<BrandButton
							type="button"
							className="h-9 rounded-r-none border-r border-primary-foreground/25 px-4 text-sm font-medium"
							disabled={isDownloading}
							onClick={() => void onDownloadAnnotated()}
						>
							{isDownloading ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Download className="size-4" />
							)}
							{isDownloading ? "Preparing..." : "Download Annotated Copy"}
						</BrandButton>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<BrandButton
										type="button"
										className="h-9 rounded-l-none px-2"
										aria-label="More download options"
									/>
								}
							>
								<ChevronDown className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() =>
										window.open(
											currentDocument.url,
											"_blank",
											"noopener,noreferrer",
										)
								}
								>
									<Download className="size-4" />
									Download Original PDF
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</div>
		</>
	);
}
