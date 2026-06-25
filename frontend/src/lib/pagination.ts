export function getPageNumbers(
	page: number,
	totalPages: number,
): (number | "ellipsis")[] {
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
