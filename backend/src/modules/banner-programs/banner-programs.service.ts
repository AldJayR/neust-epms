import type { z } from "@hono/zod-openapi";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { bannerPrograms } from "@/db/schema/banner-programs.js";
import { campuses } from "@/db/schema/campuses.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import type {
	CreateBannerProgramSchema,
	UpdateBannerProgramSchema,
} from "./banner-programs.schema.js";

type CreateBannerProgram = z.infer<typeof CreateBannerProgramSchema>;
type UpdateBannerProgram = z.infer<typeof UpdateBannerProgramSchema>;

interface BannerProgramScope {
	campusId: number;
	departmentId: number | null;
	label: string;
}

function requireRetChair(user: AuthUser): void {
	if (user.roleName !== ROLE_NAMES.RET_CHAIR) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only a RET Chair can manage banner programs",
		);
	}
}

function resolveRetChairScope(user: AuthUser): BannerProgramScope {
	requireRetChair(user);

	if (user.isMainCampus) {
		if (user.departmentId === null || user.departmentName === null) {
			throw new ApiError(
				400,
				"BANNER_PROGRAM_SCOPE_UNRESOLVED",
				"A main-campus RET Chair must be assigned to a department before managing banner programs",
			);
		}

		return {
			campusId: user.campusId,
			departmentId: user.departmentId,
			label: user.departmentName,
		};
	}

	return {
		campusId: user.campusId,
		departmentId: null,
		label: user.campusName,
	};
}

function resolveSelectionScope(user: AuthUser): BannerProgramScope | null {
	if (user.isMainCampus) {
		if (user.departmentId === null || user.departmentName === null) return null;
		return {
			campusId: user.campusId,
			departmentId: user.departmentId,
			label: user.departmentName,
		};
	}

	return {
		campusId: user.campusId,
		departmentId: null,
		label: user.campusName,
	};
}

function scopeConditions(scope: BannerProgramScope) {
	return [
		eq(bannerPrograms.campusId, scope.campusId),
		scope.departmentId === null
			? isNull(bannerPrograms.departmentId)
			: eq(bannerPrograms.departmentId, scope.departmentId),
	];
}

function serializeProgram(program: typeof bannerPrograms.$inferSelect) {
	return {
		...program,
		createdAt: program.createdAt.toISOString(),
		updatedAt: program.updatedAt.toISOString(),
	};
}

export async function listActiveBannerPrograms(user: AuthUser) {
	const scope = resolveSelectionScope(user);
	if (!scope) return [];

	const rows = await db
		.select()
		.from(bannerPrograms)
		.where(and(...scopeConditions(scope), eq(bannerPrograms.isActive, true)))
		.orderBy(asc(bannerPrograms.programName));

	return rows.map(serializeProgram);
}

export async function listManagedBannerPrograms(user: AuthUser) {
	const scope = resolveRetChairScope(user);
	const rows = await db
		.select()
		.from(bannerPrograms)
		.where(and(...scopeConditions(scope)))
		.orderBy(asc(bannerPrograms.isActive), asc(bannerPrograms.programName));

	return {
		scopeLabel: scope.label,
		programs: rows.map(serializeProgram),
	};
}

export async function createBannerProgram(
	user: AuthUser,
	body: CreateBannerProgram,
	ipAddress: string,
) {
	const scope = resolveRetChairScope(user);
	const programName = body.programName.trim();

	const [duplicate] = await db
		.select({ bannerProgramId: bannerPrograms.bannerProgramId })
		.from(bannerPrograms)
		.where(
			and(
				...scopeConditions(scope),
				sql`lower(${bannerPrograms.programName}) = lower(${programName})`,
			),
		)
		.limit(1);

	if (duplicate) {
		throw new ApiError(
			409,
			"DUPLICATE_BANNER_PROGRAM",
			"A banner program with this name already exists in your scope",
		);
	}

	const [created] = await db
		.insert(bannerPrograms)
		.values({
			campusId: scope.campusId,
			departmentId: scope.departmentId,
			programName,
		})
		.returning();

	if (!created) {
		throw new ApiError(500, "INSERT_FAILED", "Failed to create banner program");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Created banner program ${created.bannerProgramId}`,
		tableAffected: "banner_programs",
		newValue: { programName: created.programName, scope: scope.label },
		ipAddress,
	});

	return serializeProgram(created);
}

export async function updateBannerProgram(
	user: AuthUser,
	bannerProgramId: number,
	body: UpdateBannerProgram,
	ipAddress: string,
) {
	const scope = resolveRetChairScope(user);
	const [existing] = await db
		.select()
		.from(bannerPrograms)
		.where(
			and(
				eq(bannerPrograms.bannerProgramId, bannerProgramId),
				...scopeConditions(scope),
			),
		)
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "Banner program not found");
	}

	const programName = body.programName?.trim();
	if (
		programName &&
		programName.toLowerCase() !== existing.programName.toLowerCase()
	) {
		const [duplicate] = await db
			.select({ bannerProgramId: bannerPrograms.bannerProgramId })
			.from(bannerPrograms)
			.where(
				and(
					...scopeConditions(scope),
					sql`lower(${bannerPrograms.programName}) = lower(${programName})`,
					ne(bannerPrograms.bannerProgramId, bannerProgramId),
				),
			)
			.limit(1);

		if (duplicate) {
			throw new ApiError(
				409,
				"DUPLICATE_BANNER_PROGRAM",
				"A banner program with this name already exists in your scope",
			);
		}
	}

	const [updated] = await db
		.update(bannerPrograms)
		.set({
			...(programName ? { programName } : {}),
			...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
			updatedAt: new Date(),
		})
		.where(eq(bannerPrograms.bannerProgramId, bannerProgramId))
		.returning();

	if (!updated) {
		throw new ApiError(500, "UPDATE_FAILED", "Failed to update banner program");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Updated banner program ${bannerProgramId}`,
		tableAffected: "banner_programs",
		oldValue: {
			programName: existing.programName,
			isActive: existing.isActive,
		},
		newValue: { programName: updated.programName, isActive: updated.isActive },
		ipAddress,
	});

	return serializeProgram(updated);
}

export async function validateBannerProgramForProposal(
	executor: Pick<typeof db, "select">,
	bannerProgramId: number,
	campusId: number,
	departmentId: number,
) {
	const [program] = await executor
		.select({
			bannerProgramId: bannerPrograms.bannerProgramId,
			programName: bannerPrograms.programName,
			programCampusId: bannerPrograms.campusId,
			programDepartmentId: bannerPrograms.departmentId,
			isMainCampus: campuses.isMainCampus,
		})
		.from(bannerPrograms)
		.innerJoin(campuses, eq(bannerPrograms.campusId, campuses.campusId))
		.where(
			and(
				eq(bannerPrograms.bannerProgramId, bannerProgramId),
				eq(bannerPrograms.isActive, true),
			),
		)
		.limit(1);

	if (!program) {
		throw new ApiError(
			400,
			"INVALID_BANNER_PROGRAM",
			"The selected banner program is unavailable",
		);
	}

	const expectedDepartmentId = program.isMainCampus ? departmentId : null;
	if (
		program.programCampusId !== campusId ||
		program.programDepartmentId !== expectedDepartmentId
	) {
		throw new ApiError(
			403,
			"BANNER_PROGRAM_OUT_OF_SCOPE",
			"The selected banner program is outside the proposal scope",
		);
	}

	return {
		bannerProgramId: program.bannerProgramId,
		programName: program.programName,
	};
}
