import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { isProposalInScope } from "@/lib/scope-helpers.js";
import { supabase } from "@/lib/supabase.js";
import type { AuthUser } from "@/lib/types.js";
import {
	getAvatarExtension,
	sanitizeFilename,
} from "@/services/file.service.js";
import { hashFileSha256 } from "@/services/file-integrity.service.js";

const AVATARS_BUCKET = "avatars";

function canAccessProposalDocuments(
	user: AuthUser,
	proposal: { departmentId: number; campusId: number },
): boolean {
	return isProposalInScope(user, proposal);
}

function generateSecureStoragePath(
	proposalId: string,
	versionNum: number,
	fileName: string,
): string {
	const sanitizedFilename = sanitizeFilename(fileName);
	return `proposals/${proposalId}/v${versionNum}_${Date.now()}_${randomUUID()}_${sanitizedFilename}`;
}

async function getProposal(proposalId: string) {
	const [proposal] = await db
		.select({
			proposalId: proposals.proposalId,
			departmentId: proposals.departmentId,
			campusId: proposals.campusId,
		})
		.from(proposals)
		.where(
			and(eq(proposals.proposalId, proposalId), isNull(proposals.archivedAt)),
		)
		.limit(1);

	if (!proposal) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	return proposal;
}

export async function listProposalDocuments(
	user: AuthUser,
	proposalId: string,
	page: number,
	limit: number,
) {
	const proposal = await getProposal(proposalId);
	if (!canAccessProposalDocuments(user, proposal)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have access to documents for this proposal",
		);
	}

	const rows = await db
		.select({
			documentId: proposalDocuments.documentId,
			proposalId: proposalDocuments.proposalId,
			storagePath: proposalDocuments.storagePath,
			versionNum: proposalDocuments.versionNum,
			uploadedAt: proposalDocuments.uploadedAt,
		})
		.from(proposalDocuments)
		.where(eq(proposalDocuments.proposalId, proposalId))
		.orderBy(proposalDocuments.versionNum)
		.limit(limit)
		.offset((page - 1) * limit);

	return rows.map((row) => ({
		documentId: row.documentId,
		proposalId: row.proposalId,
		versionNum: row.versionNum,
		uploadedAt: row.uploadedAt.toISOString(),
	}));
}

export async function uploadProposalDocument(
	user: AuthUser,
	proposalId: string,
	file: File,
	ipAddress: string,
) {
	const nextVersion = await db.transaction(async (tx) => {
		const result = await tx.execute(sql`
			SELECT COALESCE(MAX(version_num), 0) + 1 AS max_ver
			FROM (
				SELECT version_num
				FROM proposal_documents
				WHERE proposal_id = ${proposalId}
				FOR UPDATE
			) locked
		`);
		return Number(result[0]?.max_ver ?? 1);
	});

	const storagePath = generateSecureStoragePath(
		proposalId,
		nextVersion,
		file.name,
	);
	const contentHash = await hashFileSha256(file);
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

	let doc: typeof proposalDocuments.$inferSelect;
	try {
		doc = await db.transaction(async (tx) => {
			const [inserted] = await tx
				.insert(proposalDocuments)
				.values({
					proposalId,
					storagePath,
					versionNum: nextVersion,
					contentHash,
					uploadedBy: user.userId,
					sourceIp: ipAddress,
				})
				.returning();

			if (!inserted) {
				throw new ApiError(500, "INSERT_FAILED", "Failed to record document");
			}

			await insertAuditLog(
				{
					userId: user.userId,
					action: `Uploaded document v${nextVersion} for proposal ${proposalId}`,
					tableAffected: "proposal_documents",
					newValue: { contentHash, uploadedBy: user.userId },
					ipAddress,
				},
				tx,
			);

			return inserted;
		});
	} catch (error) {
		try {
			await supabase.storage.from("documents").remove([storagePath]);
		} catch {}
		throw error;
	}

	return {
		documentId: doc.documentId,
		storagePath: doc.storagePath,
		versionNum: doc.versionNum,
	};
}

export async function ensureUploadProposalDocumentAccess(
	user: AuthUser,
	proposalId: string,
) {
	const proposal = await getProposal(proposalId);
	if (!canAccessProposalDocuments(user, proposal)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have permission to upload documents for this proposal",
		);
	}
}

export async function getDocumentSignedUrl(
	user: AuthUser,
	proposalId: string,
	documentId: string,
	ipAddress: string,
) {
	const proposal = await getProposal(proposalId);
	if (!canAccessProposalDocuments(user, proposal)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have access to documents for this proposal",
		);
	}

	const [doc] = await db
		.select({
			documentId: proposalDocuments.documentId,
			storagePath: proposalDocuments.storagePath,
		})
		.from(proposalDocuments)
		.where(
			and(
				eq(proposalDocuments.documentId, documentId),
				eq(proposalDocuments.proposalId, proposalId),
			),
		)
		.limit(1);

	if (!doc) {
		throw new ApiError(404, "NOT_FOUND", "Document not found");
	}

	const { data, error } = await supabase.storage
		.from("documents")
		.createSignedUrl(doc.storagePath, 3600);

	if (error || !data) {
		throw new ApiError(500, "URL_FAILED", "Failed to generate signed URL");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Downloaded signed URL for document ${documentId} (proposal ${proposalId})`,
		tableAffected: "proposal_documents",
		ipAddress,
	});

	return { url: data.signedUrl };
}

function getManagedAvatarPath(avatarUrl: string | null): string | null {
	if (!avatarUrl) return null;
	const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
	const markerIndex = avatarUrl.indexOf(marker);
	return markerIndex === -1
		? null
		: avatarUrl.slice(markerIndex + marker.length);
}

export async function uploadUserAvatar(
	user: AuthUser,
	file: File,
	ipAddress: string,
) {
	const extension = await getAvatarExtension(file);
	if (!extension) {
		throw new ApiError(
			422,
			"INVALID_AVATAR",
			"Avatar must be a valid JPEG, PNG, or WebP image",
		);
	}

	const [current] = await db
		.select({ avatarUrl: users.avatarUrl })
		.from(users)
		.where(eq(users.userId, user.userId))
		.limit(1);

	if (!current) {
		throw new ApiError(404, "NOT_FOUND", "User profile not found");
	}

	const storagePath = `users/${user.userId}/${randomUUID()}.${extension}`;
	const bucket = supabase.storage.from(AVATARS_BUCKET);
	const { error: uploadError } = await bucket.upload(storagePath, file, {
		contentType: file.type,
		upsert: false,
	});

	if (uploadError) {
		throw new ApiError(400, "UPLOAD_FAILED", "Unable to upload avatar");
	}

	const avatarUrl = bucket.getPublicUrl(storagePath).data.publicUrl;
	const [updated] = await db
		.update(users)
		.set({ avatarUrl, updatedAt: new Date() })
		.where(eq(users.userId, user.userId))
		.returning({ avatarUrl: users.avatarUrl });

	if (!updated) {
		await bucket.remove([storagePath]).catch(() => undefined);
		throw new ApiError(500, "UPDATE_FAILED", "Unable to update avatar");
	}

	const previousPath = getManagedAvatarPath(current.avatarUrl);
	if (previousPath && previousPath !== storagePath) {
		await bucket.remove([previousPath]).catch(() => undefined);
	}

	await insertAuditLog({
		userId: user.userId,
		action: "Updated profile avatar",
		tableAffected: "users",
		ipAddress,
	});

	return { avatarUrl };
}
