import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { BrandButton } from "@/components/custom/brand-button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { StatusBadge } from "@/components/ui/status-badge";

interface ProposalReviewHeaderProps {
	proposalId: string;
	title: string;
	status: string;
	currentDocument?: { url: string };
}

export function ProposalReviewHeader({
	proposalId,
	title,
	status,
	currentDocument,
}: ProposalReviewHeaderProps) {
	return (
		<>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							render={<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />}
						>
							Dashboard
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink
							render={
								<Link to="/projects/$projectId" params={{ projectId: proposalId }} />
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

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<h1 className="text-2xl font-semibold text-heading tracking-tight">
						{title}
					</h1>
					<StatusBadge status={status} variant="outline" />
				</div>
				{currentDocument && (
					<a href={currentDocument.url} target="_blank" rel="noopener noreferrer">
						<BrandButton className="h-9 px-4 gap-2 text-sm font-medium">
							<Download className="size-4" />
							Download
						</BrandButton>
					</a>
				)}
			</div>
		</>
	);
}
