import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
} from "#/components/ui/pagination";

interface PaginationBarProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	total: number;
	limit: number;
	isLoading?: boolean;
	className?: string;
}

function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
	const pages: (number | "ellipsis")[] = [];

	if (totalPages <= 7) {
		for (let i = 1; i <= totalPages; i++) pages.push(i);
		return pages;
	}

	pages.push(1);

	if (page > 3) pages.push("ellipsis");

	const start = Math.max(2, page - 1);
	const end = Math.min(totalPages - 1, page + 1);
	for (let i = start; i <= end; i++) pages.push(i);

	if (page < totalPages - 2) pages.push("ellipsis");

	pages.push(totalPages);

	return pages;
}

export function PaginationBar({
	page,
	totalPages,
	onPageChange,
	total,
	limit,
	isLoading,
	className,
}: PaginationBarProps) {
	const from = Math.min((page - 1) * limit + 1, total);
	const to = Math.min(page * limit, total);

	return (
		<div
			className={`flex flex-col items-center justify-between gap-4 border-t border-transparent pt-4 sm:flex-row ${className}`}
		>
			<p className="text-xs text-[#666]">
				Showing <span className="font-bold">{from}</span> to{" "}
				<span className="font-bold">{to}</span> of{" "}
				<span className="font-bold">{total}</span> results
			</p>

			{totalPages > 1 && (
				<Pagination className="w-auto mx-0">
					<PaginationContent className="gap-1">
						<PaginationItem>
							<Button
								variant="ghost"
								size="sm"
								className="gap-1 pl-2.5 text-[#0a0a0a] hover:bg-transparent"
								onClick={() => onPageChange(page - 1)}
								disabled={page <= 1 || isLoading}
							>
								<ChevronLeft className="size-4" />
								<span>Previous</span>
							</Button>
						</PaginationItem>

						{getPageNumbers(page, totalPages).map((p, i) => {
							if (p === "ellipsis") {
								return (
									<PaginationItem key={`ellipsis-${i}`}>
										<PaginationEllipsis />
									</PaginationItem>
								);
							}

							return (
								<PaginationItem key={p}>
									<PaginationLink
										isActive={page === p}
										onClick={() => onPageChange(p)}
										className={
											page === p
												? "border-[#e5e5e5] bg-white text-[#0a0a0a] shadow-sm"
												: "border-transparent text-[#0a0a0a] hover:bg-transparent"
										}
									>
										{p}
									</PaginationLink>
								</PaginationItem>
							);
						})}

						<PaginationItem>
							<Button
								variant="ghost"
								size="sm"
								className="gap-1 pr-2.5 text-[#0a0a0a] hover:bg-transparent"
								onClick={() => onPageChange(page + 1)}
								disabled={page >= totalPages || isLoading}
							>
								<span>Next</span>
								<ChevronRight className="size-4" />
							</Button>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</div>
	);
}
