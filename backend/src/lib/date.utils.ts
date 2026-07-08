export const months = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

export function formatDuration(start: Date, end: Date): string {
	const totalMonths =
		(end.getFullYear() - start.getFullYear()) * 12 +
		(end.getMonth() - start.getMonth());
	const years = Math.floor(totalMonths / 12);
	const remainingMonths = totalMonths % 12;
	const parts: string[] = [];
	if (years > 0) parts.push(`${years} yr(s)`);
	if (remainingMonths > 0) parts.push(`${remainingMonths} mo(s)`);
	return parts.length > 0 ? parts.join(" ") : "0 mo(s)";
}

export function getCurrentAcademicYear(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	if (month >= 8) return `${year}-${year + 1}`;
	return `${year - 1}-${year}`;
}

export function getCurrentSemester(): 1 | 2 {
	const month = new Date().getMonth() + 1;
	return month >= 8 || month <= 1 ? 1 : 2;
}
