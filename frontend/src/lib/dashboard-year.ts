import { z } from "zod";

export function currentManilaYear(now = new Date()): number {
	return Number(
		new Intl.DateTimeFormat("en", {
			year: "numeric",
			timeZone: "Asia/Manila",
		}).format(now),
	);
}
export const dashboardYearSchema = z.coerce.number().int().min(2000).max(2200);
export const periodMetadataSchema = z.object({
	availableYears: z.array(z.number().int()),
});
export type PeriodMetadata = z.infer<typeof periodMetadataSchema>;
export interface DashboardYearProps {
	year: number;
	onYearChange: (year: number) => void;
}
