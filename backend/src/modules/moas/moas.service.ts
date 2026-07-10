import { randomUUID } from "node:crypto";
import {
	and,
	count,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
	ne,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { moas } from "@/db/schema/moas.js";
import { partners } from "@/db/schema/partners.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { buildProposalScopeClause } from "@/lib/scope-helpers.js";
import { supabase } from "@/lib/supabase.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import { sanitizeFilename } from "@/services/file.service.js";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// ── Helpers ──

export function canManageMoas(user: AuthUser): boolean {
	return (
		user.roleName === ROLE_NAMES.RET_CHAIR ||
		user.roleName === ROLE_NAMES.DIRECTOR
	);
}

export async function isMoaLinkedToUserProject(
	moaId: string,
	userId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(projects)
		.innerJoin(
			proposalMembers,
			eq(projects.proposalId, proposalMembers.proposalId),
		)
		.where(and(eq(projects.moaId, moaId), eq(proposalMembers.userId, userId)))
		.limit(1);
	return !!row;
}

export async function syncProjectsToNewMoa(
	partnerId: string,
	newMoaId: string,
	validUntil: Date,
	userId: string,
	ipAddress: string | null,
): Promise<void> {
	const previousMoas = await db
		.select({ moaId: moas.moaId })
		.from(moas)
		.where(
			and(
				eq(moas.partnerId, partnerId),
				ne(moas.moaId, newMoaId),
				isNull(moas.archivedAt),
			),
		);

	const previousMoaIds = previousMoas.map((m) => m.moaId);
	if (previousMoaIds.length === 0) return;

	const projectsToSync = await db
		.select({
			projectId: projects.projectId,
			projectStatus: projects.projectStatus,
		})
		.from(projects)
		.where(
			and(
				inArray(projects.moaId, previousMoaIds),
				inArray(projects.projectStatus, ["Ongoing", "Expired", "Overdue"]),
				isNull(projects.archivedAt),
			),
		);

	const now = new Date();
	for (const p of projectsToSync) {
		let nextStatus = p.projectStatus;
		if (p.projectStatus === "Expired" && validUntil > now) {
			nextStatus = "Ongoing";
		}

		await db
			.update(projects)
			.set({
				moaId: newMoaId,
				projectStatus: nextStatus,
				updatedAt: now,
			})
			.where(eq(projects.projectId, p.projectId));

		await insertAuditLog({
			userId,
			action: `Synced project ${p.projectId} to new MOA ${newMoaId} (status updated: ${p.projectStatus} -> ${nextStatus})`,
			tableAffected: "projects",
			ipAddress,
		});
	}
}

// ── Queries ──

export async function listMoas(opts: {
	page: number;
	limit: number;
	archived?: string | undefined;
	user: AuthUser;
}) {
	const { page, limit, archived, user } = opts;

	if (!canManageMoas(user)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only RET Chair or Director can view the MOA repository",
		);
	}

	const offset = (page - 1) * limit;
	const showArchived = archived === "true";

	const rows = await db
		.select({
			moaId: moas.moaId,
			partnerId: moas.partnerId,
			storagePath: moas.storagePath,
			validFrom: moas.validFrom,
			validUntil: moas.validUntil,
			createdAt: moas.createdAt,
			updatedAt: moas.updatedAt,
			archivedAt: moas.archivedAt,
		})
		.from(moas)
		.where(showArchived ? isNotNull(moas.archivedAt) : isNull(moas.archivedAt))
		.orderBy(desc(moas.validUntil))
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) => ({
		...r,
		validFrom: r.validFrom.toISOString(),
		validUntil: r.validUntil.toISOString(),
		createdAt: r.createdAt.toISOString(),
		updatedAt: r.updatedAt.toISOString(),
		archivedAt: r.archivedAt?.toISOString() ?? null,
	}));

	const [totalResult] = await db
		.select({ value: count() })
		.from(moas)
		.where(showArchived ? isNotNull(moas.archivedAt) : isNull(moas.archivedAt));
	const total = Number(totalResult?.value ?? 0);

	return { items, total };
}

export async function getMoaById(id: string, user: AuthUser) {
	if (!canManageMoas(user)) {
		const linked = await isMoaLinkedToUserProject(id, user.userId);
		if (!linked) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"You do not have access to this MOA",
			);
		}
	}

	const [row] = await db
		.select({
			moaId: moas.moaId,
			partnerId: moas.partnerId,
			partnerName: partners.partnerName,
			storagePath: moas.storagePath,
			validFrom: moas.validFrom,
			validUntil: moas.validUntil,
			createdAt: moas.createdAt,
			updatedAt: moas.updatedAt,
			archivedAt: moas.archivedAt,
		})
		.from(moas)
		.innerJoin(partners, eq(moas.partnerId, partners.partnerId))
		.where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
		.limit(1);

	if (!row) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	const now = new Date();
	const daysUntilExpiry = Math.ceil(
		(row.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
	);

	let status: "Valid" | "Renewal Needed" | "Expired" = "Valid";
	if (row.validUntil < now) {
		status = "Expired";
	} else if (daysUntilExpiry <= 30) {
		status = "Renewal Needed";
	}

	return {
		moaId: row.moaId,
		partnerId: row.partnerId,
		partnerName: row.partnerName,
		storagePath: row.storagePath,
		validFrom: row.validFrom.toISOString(),
		validUntil: row.validUntil.toISOString(),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		archivedAt: row.archivedAt?.toISOString() ?? null,
		status,
		daysToExpiry: (daysUntilExpiry < 0 ? "Expired" : daysUntilExpiry) as
			| number
			| "Expired",
	};
}

export async function getLinkedProjects(id: string, user: AuthUser) {
	if (!canManageMoas(user)) {
		const linked = await isMoaLinkedToUserProject(id, user.userId);
		if (!linked) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"You do not have access to this MOA",
			);
		}
	}

	const [moaExists] = await db
		.select({ moaId: moas.moaId })
		.from(moas)
		.where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
		.limit(1);

	if (!moaExists) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	const conditions = [eq(projects.moaId, id)];

	const scopeClause = buildProposalScopeClause(user);
	if (scopeClause) conditions.push(scopeClause);

	const rows = await db
		.select({
			projectId: proposals.proposalId,
			title: proposals.title,
			projectStatus: projects.projectStatus,
			leaderName: sql<
				string | null
			>`concat(${users.firstName}, ' ', ${users.lastName})`,
			createdAt: projects.createdAt,
		})
		.from(projects)
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.leftJoin(
			proposalMembers,
			and(
				eq(proposalMembers.proposalId, proposals.proposalId),
				eq(proposalMembers.projectRole, "Project Leader"),
			),
		)
		.leftJoin(users, eq(proposalMembers.userId, users.userId))
		.where(and(...conditions))
		.orderBy(desc(projects.createdAt));

	return rows.map((r) => ({
		projectId: r.projectId,
		title: r.title,
		projectStatus: r.projectStatus,
		leaderName: r.leaderName,
		createdAt: r.createdAt.toISOString(),
	}));
}

// ── Mutations ──

export async function createMoa(
	body: { partnerId: string; validFrom: string; validUntil: string },
	user: AuthUser,
	ipAddress: string,
) {
	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		throw new ApiError(403, "FORBIDDEN", "This action requires Director role");
	}

	const validFrom = new Date(body.validFrom);
	const validUntil = new Date(body.validUntil);

	if (validUntil <= validFrom) {
		throw new ApiError(
			400,
			"INVALID_DATES",
			"validUntil must be after validFrom",
		);
	}

	const [partner] = await db
		.select({ partnerId: partners.partnerId })
		.from(partners)
		.where(eq(partners.partnerId, body.partnerId))
		.limit(1);

	if (!partner) {
		throw new ApiError(404, "PARTNER_NOT_FOUND", "Partner not found");
	}

	const [created] = await db
		.insert(moas)
		.values({
			partnerId: body.partnerId,
			validFrom,
			validUntil,
		})
		.returning();

	if (!created) {
		throw new ApiError(500, "INSERT_FAILED", "Failed to create MOA");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Created MOA ${created.moaId}`,
		tableAffected: "moas",
		ipAddress,
	});

	await syncProjectsToNewMoa(
		created.partnerId,
		created.moaId,
		created.validUntil,
		user.userId,
		ipAddress,
	);

	return {
		...created,
		validFrom: created.validFrom.toISOString(),
		validUntil: created.validUntil.toISOString(),
		createdAt: created.createdAt.toISOString(),
		updatedAt: created.updatedAt.toISOString(),
		archivedAt: created.archivedAt?.toISOString() ?? null,
	};
}

export async function uploadMoaDocument(
	formData: FormData,
	user: AuthUser,
	ipAddress: string,
	contentLength: number,
) {
	if (!canManageMoas(user)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You must be the Director or RET Chair to manage MOAs",
		);
	}

	if (contentLength > MAX_UPLOAD_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 50MB limit");
	}

	const file = formData.get("file");
	const partnerName = formData.get("partnerName");
	const validFromStr = formData.get("validFrom");
	const validUntilStr = formData.get("validUntil");

	if (!(file instanceof File)) {
		throw new ApiError(400, "NO_FILE", "A PDF file is required");
	}

	if (file.size <= 0) {
		throw new ApiError(422, "EMPTY_FILE", "Uploaded file cannot be empty");
	}

	if (file.size > MAX_UPLOAD_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 50MB limit");
	}

	if (file.type !== "application/pdf") {
		throw new ApiError(422, "INVALID_FILE_TYPE", "Only PDF files are allowed");
	}

	if (typeof partnerName !== "string" || !partnerName) {
		throw new ApiError(400, "INVALID_PARTNER_NAME", "partnerName is required");
	}

	if (typeof validFromStr !== "string" || !validFromStr) {
		throw new ApiError(400, "INVALID_VALID_FROM", "validFrom is required");
	}

	if (typeof validUntilStr !== "string" || !validUntilStr) {
		throw new ApiError(400, "INVALID_VALID_UNTIL", "validUntil is required");
	}

	const validFrom = new Date(validFromStr);
	const validUntil = new Date(validUntilStr);

	if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
		throw new ApiError(400, "INVALID_DATES", "Invalid date format");
	}

	if (validUntil <= validFrom) {
		throw new ApiError(
			400,
			"INVALID_DATES",
			"validUntil must be after validFrom",
		);
	}

	// 1. Get or create partner
	let partnerId: string;
	const [existingPartner] = await db
		.select({ partnerId: partners.partnerId })
		.from(partners)
		.where(eq(partners.partnerName, partnerName))
		.limit(1);

	if (existingPartner) {
		partnerId = existingPartner.partnerId;
	} else {
		const [newPartner] = await db
			.insert(partners)
			.values({
				partnerName,
				partnerType: "Institutional",
			})
			.returning({ partnerId: partners.partnerId });
		if (!newPartner) {
			throw new ApiError(
				500,
				"CREATE_PARTNER_FAILED",
				"Failed to create partner",
			);
		}
		partnerId = newPartner.partnerId;
	}

	// 2. Upload to Supabase Storage
	const sanitizedFilename = sanitizeFilename(file.name);
	const storagePath = `moas/${partnerId}/${Date.now()}_${randomUUID()}_${sanitizedFilename}`;

	const { error: uploadError } = await supabase.storage
		.from("documents")
		.upload(storagePath, file, {
			contentType: file.type,
			upsert: false,
		});

	if (uploadError) {
		throw new ApiError(
			400,
			"UPLOAD_FAILED",
			`Supabase storage upload failed: ${uploadError.message}`,
		);
	}

	// 3. Create MOA record
	const [created] = await db
		.insert(moas)
		.values({
			partnerId,
			storagePath,
			validFrom,
			validUntil,
		})
		.returning();

	if (!created) {
		await supabase.storage.from("documents").remove([storagePath]);
		throw new ApiError(500, "INSERT_FAILED", "Failed to create MOA");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Created MOA ${created.moaId} for partner ${partnerName}`,
		tableAffected: "moas",
		ipAddress,
	});

	await syncProjectsToNewMoa(
		created.partnerId,
		created.moaId,
		created.validUntil,
		user.userId,
		ipAddress,
	);

	return {
		...created,
		validFrom: created.validFrom.toISOString(),
		validUntil: created.validUntil.toISOString(),
		createdAt: created.createdAt.toISOString(),
		updatedAt: created.updatedAt.toISOString(),
		archivedAt: created.archivedAt?.toISOString() ?? null,
	};
}

export async function updateMoa(
	id: string,
	body: {
		partnerId?: string | undefined;
		validFrom?: string | undefined;
		validUntil?: string | undefined;
	},
	user: AuthUser,
	ipAddress: string,
) {
	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		throw new ApiError(403, "FORBIDDEN", "This action requires Director role");
	}

	const [existing] = await db
		.select({
			validFrom: moas.validFrom,
			validUntil: moas.validUntil,
		})
		.from(moas)
		.where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	const nextValidFrom =
		body.validFrom !== undefined
			? new Date(body.validFrom)
			: existing.validFrom;
	const nextValidUntil =
		body.validUntil !== undefined
			? new Date(body.validUntil)
			: existing.validUntil;

	if (nextValidUntil <= nextValidFrom) {
		throw new ApiError(
			400,
			"INVALID_DATES",
			"validUntil must be after validFrom",
		);
	}

	const setValues: Record<string, Date | string> = { updatedAt: new Date() };
	if (body.partnerId !== undefined) {
		const [partner] = await db
			.select({ partnerId: partners.partnerId })
			.from(partners)
			.where(eq(partners.partnerId, body.partnerId))
			.limit(1);

		if (!partner) {
			throw new ApiError(404, "PARTNER_NOT_FOUND", "Partner not found");
		}
		setValues.partnerId = body.partnerId;
	}
	if (body.validFrom !== undefined)
		setValues.validFrom = new Date(body.validFrom);
	if (body.validUntil !== undefined)
		setValues.validUntil = new Date(body.validUntil);

	const [updated] = await db
		.update(moas)
		.set(setValues)
		.where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
		.returning();

	if (!updated) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Updated MOA ${id}`,
		tableAffected: "moas",
		ipAddress,
	});

	const now = new Date();
	if (updated.validUntil > now) {
		const expiredProjects = await db
			.select({ projectId: projects.projectId })
			.from(projects)
			.where(
				and(
					eq(projects.moaId, id),
					eq(projects.projectStatus, "Expired"),
					isNull(projects.archivedAt),
				),
			);

		for (const p of expiredProjects) {
			await db
				.update(projects)
				.set({
					projectStatus: "Ongoing",
					updatedAt: now,
				})
				.where(eq(projects.projectId, p.projectId));

			await insertAuditLog({
				userId: user.userId,
				action: `Restored project ${p.projectId} status to Ongoing (MOA validity range extended)`,
				tableAffected: "projects",
				ipAddress,
			});
		}
	}

	return {
		...updated,
		validFrom: updated.validFrom.toISOString(),
		validUntil: updated.validUntil.toISOString(),
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
		archivedAt: updated.archivedAt?.toISOString() ?? null,
	};
}

export async function restoreMoa(
	id: string,
	user: AuthUser,
	ipAddress: string,
) {
	if (!canManageMoas(user)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You must be the Director or RET Chair to restore MOAs",
		);
	}

	const [updated] = await db
		.update(moas)
		.set({ archivedAt: null })
		.where(eq(moas.moaId, id))
		.returning();

	if (!updated) {
		throw new ApiError(
			404,
			"NOT_FOUND",
			"MOA not found or could not be restored",
		);
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Restored MOA ${id}`,
		tableAffected: "moas",
		ipAddress,
	});

	return { message: "MOA restored successfully", id };
}
