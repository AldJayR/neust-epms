import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { specialOrders } from "@/db/schema/special-orders.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { buildProposalScope } from "@/lib/scope-helpers.js";
import { supabase } from "@/lib/supabase.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import { sanitizeFilename } from "@/services/file.service.js";
import { hashFileSha256 } from "@/services/file-integrity.service.js";

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
		specialOrderId: order.specialOrderId,
		memberId: order.memberId,
		soNumber: order.soNumber,
		storagePath: order.storagePath,
		status: order.status,
		dateIssued: order.dateIssued?.toISOString() ?? null,
		createdAt: order.createdAt.toISOString(),
		updatedAt: order.updatedAt.toISOString(),
		archivedAt: order.archivedAt?.toISOString() ?? null,
	};
}

export async function listSpecialOrders(
	query: {
		page: number;
		limit: number;
	},
	user: AuthUser,
) {
	const rows = await db
		.select(specialOrderColumns)
		.from(specialOrders)
		.innerJoin(
			proposalMembers,
			eq(specialOrders.memberId, proposalMembers.memberId),
		)
		.innerJoin(proposals, eq(proposalMembers.proposalId, proposals.proposalId))
		.where(
			and(
				isNull(specialOrders.archivedAt),
				isNull(proposalMembers.archivedAt),
				...buildProposalScope(user),
			),
		)
		.orderBy(desc(specialOrders.createdAt))
		.limit(query.limit)
		.offset((query.page - 1) * query.limit);

	return { items: rows.map(serializeSpecialOrder) };
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
		.innerJoin(proposals, eq(proposalMembers.proposalId, proposals.proposalId))
		.where(
			and(
				eq(proposalMembers.memberId, memberId),
				isNull(proposalMembers.archivedAt),
				...buildProposalScope(user),
			),
		)
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
					isNull(proposalMembers.archivedAt),
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
	const contentHash = await hashFileSha256(file);
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

	let record: typeof specialOrders.$inferSelect;
	let isNew = false;
	try {
		const result = await db.transaction(async (tx) => {
			let nextRecord: typeof specialOrders.$inferSelect;
			let nextIsNew = false;
			if (existing) {
				const [updated] = await tx
					.update(specialOrders)
					.set({
						storagePath,
						soNumber,
						contentHash,
						uploadedBy: user.userId,
						sourceIp: ipAddress,
						updatedAt: new Date(),
					})
					.where(eq(specialOrders.specialOrderId, existing.specialOrderId))
					.returning();
				if (!updated) {
					throw new ApiError(
						500,
						"UPDATE_FAILED",
						"Failed to update special order",
					);
				}
				nextRecord = updated;
			} else {
				const [inserted] = await tx
					.insert(specialOrders)
					.values({
						memberId,
						soNumber,
						storagePath,
						contentHash,
						uploadedBy: user.userId,
						sourceIp: ipAddress,
					})
					.returning();
				if (!inserted) {
					throw new ApiError(
						500,
						"INSERT_FAILED",
						"Failed to create special order",
					);
				}
				nextRecord = inserted;
				nextIsNew = true;
			}

			await insertAuditLog(
				{
					userId: user.userId,
					action: `${existing ? "Updated" : "Created"} special order ${nextRecord.specialOrderId}`,
					tableAffected: "special_orders",
					newValue: { contentHash, uploadedBy: user.userId },
					ipAddress,
				},
				tx,
			);

			return { record: nextRecord, isNew: nextIsNew };
		});
		record = result.record;
		isNew = result.isNew;
	} catch (error: unknown) {
		const err = error as { code?: string; cause?: { code?: string } };
		try {
			await supabase.storage.from("documents").remove([storagePath]);
		} catch {}
		if (err.code === "23505" || err.cause?.code === "23505") {
			throw new ApiError(
				409,
				"DUPLICATE_SO_NUMBER",
				"A special order with this SO number already exists",
			);
		}
		throw error;
	}

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
		.innerJoin(
			proposalMembers,
			eq(specialOrders.memberId, proposalMembers.memberId),
		)
		.innerJoin(proposals, eq(proposalMembers.proposalId, proposals.proposalId))
		.where(
			and(
				eq(specialOrders.specialOrderId, id),
				isNull(specialOrders.archivedAt),
				isNull(proposalMembers.archivedAt),
				...buildProposalScope(user),
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
			.where(
				and(
					eq(proposalMembers.memberId, order.memberId),
					isNull(proposalMembers.archivedAt),
				),
			)
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
		throw new ApiError(
			404,
			"NO_FILE",
			"No file uploaded for this special order",
		);
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
