import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { specialOrders } from "@/db/schema/special-orders.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import { supabase } from "@/lib/supabase.js";
import { sanitizeFilename } from "@/services/file.service.js";

const specialOrderColumns = {
	specialOrderId: specialOrders.specialOrderId,
	memberId: specialOrders.memberId,
	soNumber: specialOrders.soNumber,
	storagePath: specialOrders.storagePath,
	dateIssued: specialOrders.dateIssued,
	status: specialOrders.status,
	createdAt: specialOrders.createdAt,
	updatedAt: specialOrders.updatedAt,
	archivedAt: specialOrders.archivedAt,
};

function serializeSpecialOrder(order: {
	specialOrderId: string;
	memberId: string;
	soNumber: string;
	storagePath: string | null;
	dateIssued: Date | null;
	status: string;
	createdAt: Date;
	updatedAt: Date;
	archivedAt: Date | null;
}) {
	return {
		...order,
		dateIssued: order.dateIssued?.toISOString() ?? null,
		createdAt: order.createdAt.toISOString(),
		updatedAt: order.updatedAt.toISOString(),
		archivedAt: order.archivedAt?.toISOString() ?? null,
	};
}

export async function listSpecialOrders(query: { page: number; limit: number }) {
	const rows = await db
		.select(specialOrderColumns)
		.from(specialOrders)
		.where(isNull(specialOrders.archivedAt))
		.orderBy(desc(specialOrders.createdAt))
		.limit(query.limit)
		.offset((query.page - 1) * query.limit);

	return { items: rows.map(serializeSpecialOrder) };
}

export async function createSpecialOrder(
	user: AuthUser,
	body: { memberId: string; soNumber: string; dateIssued?: string | undefined },
	ipAddress: string,
) {
	const [member] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(proposalMembers)
		.where(eq(proposalMembers.memberId, body.memberId))
		.limit(1);

	if (!member) {
		throw new ApiError(
			404,
			"MEMBER_NOT_FOUND",
			"Proposal member not found — special orders must link to proposal_members (EC-03)",
		);
	}

	const [created] = await db
		.insert(specialOrders)
		.values({
			memberId: body.memberId,
			soNumber: body.soNumber,
			dateIssued: body.dateIssued ? new Date(body.dateIssued) : null,
		})
		.returning();

	if (!created) {
		throw new ApiError(500, "INSERT_FAILED", "Failed to create special order");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Created special order ${created.specialOrderId} for member ${body.memberId}`,
		tableAffected: "special_orders",
		ipAddress,
	});

	return serializeSpecialOrder(created);
}

export async function updateSpecialOrder(
	id: string,
	body: { status?: string | undefined; dateIssued?: string | undefined },
) {
	const [updated] = await db
		.update(specialOrders)
		.set({
			...(body.status !== undefined ? { status: body.status } : {}),
			...(body.dateIssued !== undefined
				? { dateIssued: new Date(body.dateIssued) }
				: {}),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(specialOrders.specialOrderId, id),
				isNull(specialOrders.archivedAt),
			),
		)
		.returning();

	if (!updated) {
		throw new ApiError(404, "NOT_FOUND", "Special order not found");
	}

	return serializeSpecialOrder(updated);
}

export async function uploadSpecialOrder(
	user: AuthUser,
	file: File,
	memberId: string,
	soNumber: string,
	ipAddress: string,
) {
	const [member] = await db
		.select({
			memberId: proposalMembers.memberId,
			proposalId: proposalMembers.proposalId,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.memberId, memberId))
		.limit(1);

	if (!member) {
		throw new ApiError(404, "MEMBER_NOT_FOUND", "Proposal member not found");
	}

	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		const [leader] = await db
			.select({ userId: proposalMembers.userId })
			.from(proposalMembers)
			.where(
				and(
					eq(proposalMembers.proposalId, member.proposalId),
					eq(proposalMembers.userId, user.userId),
					eq(proposalMembers.projectRole, "Project Leader"),
				),
			)
			.limit(1);

		if (!leader) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"You must be the Director or Project Leader to upload special orders",
			);
		}
	}

	const storagePath = `special-orders/${memberId}/${Date.now()}_${randomUUID()}_${sanitizeFilename(file.name)}`;
	const { error: uploadError } = await supabase.storage
		.from("documents")
		.upload(storagePath, file, { contentType: file.type, upsert: false });

	if (uploadError) {
		throw new ApiError(
			400,
			"UPLOAD_FAILED",
			`Supabase storage upload failed: ${uploadError.message}`,
		);
	}

	const [existing] = await db
		.select(specialOrderColumns)
		.from(specialOrders)
		.where(
			and(
				eq(specialOrders.memberId, memberId),
				isNull(specialOrders.archivedAt),
			),
		)
		.limit(1);

	let record;
	let isNew = false;
	try {
		if (existing) {
			const [updated] = await db
				.update(specialOrders)
				.set({ storagePath, soNumber, updatedAt: new Date() })
				.where(eq(specialOrders.specialOrderId, existing.specialOrderId))
				.returning();
			if (!updated) {
				throw new ApiError(500, "UPDATE_FAILED", "Failed to update special order");
			}
			record = updated;
		} else {
			const [inserted] = await db
				.insert(specialOrders)
				.values({ memberId, soNumber, storagePath })
				.returning();
			if (!inserted) {
				throw new ApiError(500, "INSERT_FAILED", "Failed to create special order");
			}
			record = inserted;
			isNew = true;
		}
	} catch (error: unknown) {
		const err = error as Record<string, unknown> & { code?: string };
		if (err?.code === "23505") {
			throw new ApiError(
				409,
				"DUPLICATE_SO_NUMBER",
				"A special order with this SO number already exists",
			);
		}
		try {
			await supabase.storage.from("documents").remove([storagePath]);
		} catch {}
		throw error;
	}

	await insertAuditLog({
		userId: user.userId,
		action: `${existing ? "Updated" : "Created"} special order ${record.specialOrderId} for member ${memberId}`,
		tableAffected: "special_orders",
		ipAddress,
	});

	return { record: serializeSpecialOrder(record), isNew };
}

export async function getSpecialOrderSignedUrl(
	user: AuthUser,
	id: string,
	ipAddress: string,
) {
	const [order] = await db
		.select(specialOrderColumns)
		.from(specialOrders)
		.where(
			and(
				eq(specialOrders.specialOrderId, id),
				isNull(specialOrders.archivedAt),
			),
		)
		.limit(1);

	if (!order) {
		throw new ApiError(404, "NOT_FOUND", "Special order not found");
	}

	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		const [member] = await db
			.select({
				memberId: proposalMembers.memberId,
				proposalId: proposalMembers.proposalId,
				userId: proposalMembers.userId,
			})
			.from(proposalMembers)
			.where(eq(proposalMembers.memberId, order.memberId))
			.limit(1);

		if (!member) {
			throw new ApiError(404, "MEMBER_NOT_FOUND", "Proposal member not found");
		}

		const isMember = member.userId === user.userId;
		let isProjectLeader = false;
		if (!isMember) {
			const [leader] = await db
				.select({ userId: proposalMembers.userId })
				.from(proposalMembers)
				.where(
					and(
						eq(proposalMembers.proposalId, member.proposalId),
						eq(proposalMembers.userId, user.userId),
						eq(proposalMembers.projectRole, "Project Leader"),
					),
				)
				.limit(1);
			isProjectLeader = !!leader;
		}

		if (!isMember && !isProjectLeader) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"You must be the Director, Project Leader, or the member to access this file",
			);
		}
	}

	if (!order.storagePath) {
		throw new ApiError(404, "NO_FILE", "No file uploaded for this special order");
	}

	const { data, error } = await supabase.storage
		.from("documents")
		.createSignedUrl(order.storagePath, 3600);
	if (error || !data) {
		throw new ApiError(500, "URL_FAILED", "Failed to generate signed URL");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Accessed signed URL for special order ${id}`,
		tableAffected: "special_orders",
		ipAddress,
	});

	return { url: data.signedUrl };
}
