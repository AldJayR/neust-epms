import { z } from "@hono/zod-openapi";
import { and, gte, isNotNull, lt, sql } from "drizzle-orm";
import { proposals } from "@/db/schema/proposals.js";

export const ProjectYearSchema = z.coerce.number().int().min(2000).max(2200);

export function currentManilaYear(now = new Date()): number {
	return Number(
		new Intl.DateTimeFormat("en", {
			year: "numeric",
			timeZone: "Asia/Manila",
		}).format(now),
	);
}

export function projectYearBounds(year: number) {
	const validatedYear = ProjectYearSchema.parse(year);
	return {
		start: new Date(`${validatedYear}-01-01T00:00:00+08:00`),
		end: new Date(`${validatedYear + 1}-01-01T00:00:00+08:00`),
	};
}

/** Scheduled end dates are inclusive calendar dates; next-year start is exclusive. */
export function projectPeriodClause(year: number) {
	const { start, end } = projectYearBounds(year);
	return sql`${and(
		isNotNull(proposals.targetStartDate),
		isNotNull(proposals.targetEndDate),
		lt(proposals.targetStartDate, end),
		gte(proposals.targetEndDate, start),
	)}`;
}
