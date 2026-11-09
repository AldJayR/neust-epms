import { and, eq, isNull, ne, or, type SQL, sql } from "drizzle-orm";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { proposals } from "@/db/schema/proposals.js";

// This explicitly retired entry still has account references; it is not a reporting campus.
export const LEGACY_MAIN_CAMPUS_NAME = "Cabanatuan City (Main)";

export function visibleReportingCampus() {
	return ne(campuses.campusName, LEGACY_MAIN_CAMPUS_NAME);
}

export type ReportingFilters = {
	campusId?: number | undefined;
	departmentId?: number | undefined;
	college?: string | undefined;
};

/** Correlated to proposals; usable by counts and lists without additional joins. */
export function reportingProposalScope(filters: ReportingFilters = {}): SQL[] {
	const conditions: SQL[] = [];
	const campusConditions = [
		eq(campuses.campusId, proposals.campusId),
		visibleReportingCampus(),
	];
	if (filters.campusId !== undefined)
		conditions.push(eq(proposals.campusId, filters.campusId));
	const departmentConditions: SQL[] = [];
	if (filters.departmentId !== undefined)
		departmentConditions.push(
			filters.departmentId === 0
				? isNull(proposals.departmentId)
				: eq(proposals.departmentId, filters.departmentId),
		);
	if (filters.college)
		departmentConditions.push(
			sql`${proposals.departmentId} IN (SELECT ${departments.departmentId} FROM ${departments} WHERE ${or(eq(departments.departmentName, filters.college), eq(departments.departmentCode, filters.college))})`,
		);
	if (departmentConditions.length) {
		// A campus-wide selection must never be narrowed by a stale college parameter.
		const match =
			filters.campusId !== undefined
				? or(eq(campuses.isMainCampus, false), and(...departmentConditions))
				: and(eq(campuses.isMainCampus, true), ...departmentConditions);
		if (match) campusConditions.push(match);
	}
	conditions.push(
		sql`EXISTS (SELECT 1 FROM ${campuses} WHERE ${and(...campusConditions)})`,
	);
	return conditions;
}

/** The caller joins campuses and departments to proposals. */
export function reportingDepartmentId() {
	return sql<
		number | null
	>`CASE WHEN ${campuses.isMainCampus} THEN ${proposals.departmentId} ELSE NULL END`;
}

export function reportingUnitLabel() {
	return sql<string>`CASE WHEN ${campuses.isMainCampus}
		THEN coalesce(${departments.departmentCode}, 'Unassigned college') || ' · ' || ${campuses.campusName}
		ELSE ${campuses.campusName} END`;
}

export function reportingUnitKey(
	campusId: number,
	departmentId: number | null,
) {
	return `${campusId}:${departmentId ?? "campus"}`;
}
