import { randomUUID } from "node:crypto";
import {
	and,
	count,
	desc,
	eq,
	isNotNull,
	isNull,
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
import { getMoaValidityStatus } from "@/lib/moa-validity.js";
import { buildProposalScopeClause } from "@/lib/scope-helpers.js";
import { supabase } from "@/lib/supabase.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import { isPdfFile, sanitizeFilename } from "@/services/file.service.js";
import { hashFileSha256 } from "@/services/file-integrity.service.js";
import { syncProjectsToMoa } from "./moa-project-sync.service.js";

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
		.where(
			and(
				eq(projects.moaId, moaId),
				eq(proposalMembers.userId, userId),
				isNull(proposalMembers.archivedAt),
			),
		)
		.limit(1);
	return !!row;
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

	const [rows, [totalResult]] = await Promise.all([
		db
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
			.where(
				showArchived ? isNotNull(moas.archivedAt) : isNull(moas.archivedAt),
			)
			.orderBy(desc(moas.validUntil))
			.limit(limit)
			.offset(offset),
		db
			.select({ value: count() })
			.from(moas)
			.where(
				showArchived ? isNotNull(moas.archivedAt) : isNull(moas.archivedAt),
			),
	]);
	const total = Number(totalResult?.value ?? 0);

	const items = rows.map((r) => ({
		...r,
		validFrom: r.validFrom.toISOString(),
		validUntil: r.validUntil.toISOString(),
		createdAt: r.createdAt.toISOString(),
		updatedAt: r.updatedAt.toISOString(),
		archivedAt: r.archivedAt?.toISOString() ?? null,
	}));

	return { items, total };
}

export async function getMoaById(id: string, user: AuthUser) {
	const [[row], linked] = await Promise.all([
		db
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
			.limit(1),
		!canManageMoas(user)
			? isMoaLinkedToUserProject(id, user.userId)
			: Promise.resolve(true),
	]);

	if (!linked) {
		throw new ApiError(403, "FORBIDDEN", "You do not have access to this MOA");
	}

	if (!row) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	const now = new Date();
	const daysUntilExpiry = Math.ceil(
		(row.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
	);

	const status = getMoaValidityStatus(row, now);

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
		daysToExpiry: (status === "Expired" ? "Expired" : daysUntilExpiry) as
			| number
			| "Expired",
	};
}

export async function getMoaSignedUrl(
	id: string,
	user: AuthUser,
	ipAddress: string,
) {
	const moa = await getMoaById(id, user);
	if (!moa.storagePath) {
		throw new ApiError(404, "NO_FILE", "No file uploaded for this MOA");
	}

	const { data, error } = await supabase.storage
		.from("documents")
		.createSignedUrl(moa.storagePath, 3600);
	if (error || !data) {
		throw new ApiError(500, "URL_FAILED", "Failed to generate signed URL");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Accessed signed URL for MOA ${id}`,
		tableAffected: "moas",
		ipAddress,
	});

	return { url: data.signedUrl };
}

export async function getLinkedProjects(id: string, user: AuthUser) {
	const conditions = [eq(projects.moaId, id)];

	const scopeClause = buildProposalScopeClause(user);
	if (scopeClause) conditions.push(scopeClause);

	const [linked, [moaExists], rows] = await Promise.all([
		!canManageMoas(user)
			? isMoaLinkedToUserProject(id, user.userId)
			: Promise.resolve(true),
		db
			.select({ moaId: moas.moaId })
			.from(moas)
			.where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
			.limit(1),
		db
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
					isNull(proposalMembers.archivedAt),
				),
			)
			.leftJoin(users, eq(proposalMembers.userId, users.userId))
			.where(and(...conditions))
			.orderBy(desc(projects.createdAt)),
	]);

	if (!linked) {
		throw new ApiError(403, "FORBIDDEN", "You do not have access to this MOA");
	}

	if (!moaExists) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	return rows.map((r) => ({
		projectId: r.projectId,
		title: r.title,
		projectStatus: r.projectStatus,
		leaderName: r.leaderName,
		createdAt: r.createdAt.toISOString(),
	}));
}

// ── Mutations ──

export async function uploadMoaDocument(
	formData: FormData,
	user: AuthUser,
	ipAddress: string,
	contentLength: number,
) {
	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		throw new ApiError(403, "FORBIDDEN", "Only the Director can manage MOAs");
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

	if (!(await isPdfFile(file))) {
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
	const contentHash = await hashFileSha256(file);

	const { error: uploadError } = await supabase.storage
		.from("documents")
		.upload(storagePath, file, {
			contentType: file.type,
			upsert: false,
		});

	if (uploadError) {
		console.error("[upload] MOA document upload failed:", uploadError);
		throw new ApiError(
			400,
			"UPLOAD_FAILED",
			"We couldn't upload the MOA PDF. Please try again.",
		);
	}

	// 3. Create MOA record and its audit event atomically
	let created: typeof moas.$inferSelect;
	try {
		created = await db.transaction(async (tx) => {
			const [record] = await tx
				.insert(moas)
				.values({
					partnerId,
					storagePath,
					contentHash,
					uploadedBy: user.userId,
					sourceIp: ipAddress,
					validFrom,
					validUntil,
				})
				.returning();

			if (!record) {
				throw new ApiError(500, "INSERT_FAILED", "Failed to create MOA");
			}

			await insertAuditLog(
				{
					userId: user.userId,
					action: `Created MOA ${record.moaId}`,
					tableAffected: "moas",
					newValue: { contentHash, uploadedBy: user.userId },
					ipAddress,
				},
				tx,
			);

			await syncProjectsToMoa(tx, record, user.userId, ipAddress);
			return record;
		});
	} catch (error) {
		await supabase.storage
			.from("documents")
			.remove([storagePath])
			.catch(() => undefined);
		throw error;
	}

	if (!created) {
		await supabase.storage.from("documents").remove([storagePath]);
		throw new ApiError(500, "INSERT_FAILED", "Failed to create MOA");
	}

	return {
		moaId: created.moaId,
		partnerId: created.partnerId,
		storagePath: created.storagePath,
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

	const updated = await db.transaction(async (tx) => {
		const [existing] = await tx.select().from(moas)
			.where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
			.for("update").limit(1);
		if (!existing) throw new ApiError(404, "NOT_FOUND", "MOA not found");
		const validFrom = body.validFrom === undefined ? existing.validFrom : new Date(body.validFrom);
		const validUntil = body.validUntil === undefined ? existing.validUntil : new Date(body.validUntil);
		if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validUntil.getTime()) || validUntil <= validFrom) {
			throw new ApiError(400, "INVALID_DATES", "validUntil must be after a valid validFrom date");
		}
		if (body.partnerId !== undefined && body.partnerId !== existing.partnerId) {
			const [partner] = await tx.select({ id: partners.partnerId }).from(partners)
				.where(eq(partners.partnerId, body.partnerId)).limit(1);
			if (!partner) throw new ApiError(404, "PARTNER_NOT_FOUND", "Partner not found");
			const [linked] = await tx.select({ id: projects.projectId }).from(projects)
				.where(eq(projects.moaId, id)).limit(1);
			if (linked) throw new ApiError(409, "MOA_PARTNER_LOCKED", "The partner cannot be changed while projects use this MOA.");
		}
		const [saved] = await tx.update(moas).set({
			partnerId: body.partnerId ?? existing.partnerId,
			validFrom, validUntil, updatedAt: new Date(),
		}).where(and(eq(moas.moaId, id), isNull(moas.archivedAt))).returning();
		if (!saved) throw new ApiError(409, "UPDATE_CONFLICT", "The MOA changed. Reload and try again.");
		await insertAuditLog({
			userId: user.userId, action: `Updated MOA ${id}`, tableAffected: "moas",
			oldValue: { validFrom: existing.validFrom.toISOString(), validUntil: existing.validUntil.toISOString() },
			newValue: { validFrom: saved.validFrom.toISOString(), validUntil: saved.validUntil.toISOString() },
			ipAddress,
		}, tx);
		await syncProjectsToMoa(tx, saved, user.userId, ipAddress);
		return saved;
	});

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
	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		throw new ApiError(403, "FORBIDDEN", "Only the Director can restore MOAs");
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
