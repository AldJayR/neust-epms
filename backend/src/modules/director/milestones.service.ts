import type { z } from "@hono/zod-openapi";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { projectMilestones } from "@/db/schema/project-milestones.js";
import { projects } from "@/db/schema/projects.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import { ApiError } from "@/lib/errors.js";
import {
	reportingProposalScope,
	reportingUnitLabel,
} from "@/lib/reporting-units.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import type { MilestonesQuerySchema } from "./milestones.schema.js";

export async function getDirectorMilestones(
	user: AuthUser,
	query: z.infer<typeof MilestonesQuerySchema>,
) {
	if (user.roleName !== ROLE_NAMES.DIRECTOR)
		throw new ApiError(403, "FORBIDDEN", "Director access required");
	const scope = and(
		isNull(proposals.archivedAt),
		isNull(projects.archivedAt),
		...reportingProposalScope(),
	);
	const [result] = await db
		.select({ value: count() })
		.from(projectMilestones)
		.innerJoin(
			proposals,
			eq(proposals.proposalId, projectMilestones.proposalId),
		)
		.leftJoin(projects, eq(projects.proposalId, proposals.proposalId))
		.where(scope);
	const total = Number(result?.value ?? 0);
	const page = Math.min(
		query.page,
		Math.max(1, Math.ceil(total / query.limit)),
	);
	const rows = await db
		.select({
			id: projectMilestones.milestoneId,
			kind: projectMilestones.kind,
			proposalId: proposals.proposalId,
			projectId: projects.projectId,
			title: proposals.title,
			unitLabel: reportingUnitLabel(),
			campus: sql<string>`coalesce(${campuses.campusName}, '')`,
			actorId: projectMilestones.actorId,
			actorName: sql<
				string | null
			>`nullif(trim(concat(${users.firstName}, ' ', ${users.lastName})), '')`,
			occurredAt: projectMilestones.occurredAt,
		})
		.from(projectMilestones)
		.innerJoin(
			proposals,
			eq(proposals.proposalId, projectMilestones.proposalId),
		)
		.leftJoin(projects, eq(projects.proposalId, proposals.proposalId))
		.leftJoin(departments, eq(departments.departmentId, proposals.departmentId))
		.leftJoin(campuses, eq(campuses.campusId, proposals.campusId))
		.leftJoin(users, eq(users.userId, projectMilestones.actorId))
		.where(scope)
		.orderBy(
			desc(projectMilestones.occurredAt),
			desc(projectMilestones.milestoneId),
		)
		.limit(query.limit)
		.offset((page - 1) * query.limit);
	return {
		items: rows.map((row) => ({
			...row,
			occurredAt: row.occurredAt.toISOString(),
		})),
		total,
		page,
		limit: query.limit,
	};
}
