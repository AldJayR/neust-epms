import { and, eq } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import type { AuthUser } from "@/lib/types.js";
import {
	isProjectLeader,
	PROJECT_LEADER_ROLE,
} from "@/services/auth-user.service.js";
import type { z } from "@hono/zod-openapi";
import type { MemberSchema, AddMemberSchema } from "./members.schema.js";

type Member = z.infer<typeof MemberSchema>;

export async function listMembers(
	proposalId: string,
	query: { page: number; limit: number },
): Promise<{ items: Member[] }> {
	const { page, limit } = query;
	const offset = (page - 1) * limit;

	const rows = await db
		.select({
			memberId: proposalMembers.memberId,
			proposalId: proposalMembers.proposalId,
			userId: proposalMembers.userId,
			projectRole: proposalMembers.projectRole,
			addedAt: proposalMembers.addedAt,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.proposalId, proposalId))
		.orderBy(proposalMembers.addedAt)
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) => ({
		...r,
		addedAt: r.addedAt.toISOString(),
	}));

	return { items };
}

export async function addMember(
	authUser: AuthUser,
	proposalId: string,
	body: z.infer<typeof AddMemberSchema>,
	ipAddress: string,
): Promise<Member> {
	const created = await db.transaction(async (tx) => {
		const [proposal] = await tx
			.select({ proposalId: proposals.proposalId })
			.from(proposals)
			.where(eq(proposals.proposalId, proposalId))
			.limit(1);

		if (!proposal) {
			throw new ApiError(404, "NOT_FOUND", "Proposal not found");
		}

		if (!(await isProjectLeader(proposalId, authUser.userId))) {
			throw new ApiError(
				403,
				"NOT_LEADER",
				"Only the project leader can add members",
			);
		}

		const [targetUser] = await tx
			.select({ userId: users.userId })
			.from(users)
			.where(eq(users.userId, body.userId))
			.limit(1);

		if (!targetUser) {
			throw new ApiError(404, "USER_NOT_FOUND", "Target user not found");
		}

		const [existingMember] = await tx
			.select({ memberId: proposalMembers.memberId })
			.from(proposalMembers)
			.where(
				and(
					eq(proposalMembers.proposalId, proposalId),
					eq(proposalMembers.userId, body.userId),
				),
			)
			.limit(1);

		if (existingMember) {
			throw new ApiError(409, "DUPLICATE", "User is already a member");
		}

		if (body.projectRole === PROJECT_LEADER_ROLE) {
			const [existingLeader] = await tx
				.select({ memberId: proposalMembers.memberId })
				.from(proposalMembers)
				.where(
					and(
						eq(proposalMembers.proposalId, proposalId),
						eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
					),
				)
				.limit(1);

			if (existingLeader) {
				throw new ApiError(
					409,
					"DUPLICATE_LEADER",
					"A proposal can only have one project leader",
				);
			}
		}

		const [createdMember] = await tx
			.insert(proposalMembers)
			.values({
				proposalId,
				userId: body.userId,
				projectRole: body.projectRole,
			})
			.returning();

		if (!createdMember) {
			throw new ApiError(500, "INSERT_FAILED", "Failed to add member");
		}

		await insertAuditLog(
			{
				userId: authUser.userId,
				action: `Added member ${body.userId} to proposal ${proposalId}`,
				tableAffected: "proposal_members",
				ipAddress,
			},
			tx,
		);

		return createdMember;
	});

	return { ...created, addedAt: created.addedAt.toISOString() };
}

export async function removeMember(
	authUser: AuthUser,
	proposalId: string,
	memberId: string,
	ipAddress: string,
): Promise<void> {
	await db.transaction(async (tx) => {
		const [proposal] = await tx
			.select({ proposalId: proposals.proposalId })
			.from(proposals)
			.where(eq(proposals.proposalId, proposalId))
			.limit(1);

		if (!proposal) {
			throw new ApiError(404, "NOT_FOUND", "Proposal not found");
		}

		if (!(await isProjectLeader(proposalId, authUser.userId))) {
			throw new ApiError(
				403,
				"NOT_LEADER",
				"Only the project leader can remove members",
			);
		}

		const [deleted] = await tx
			.delete(proposalMembers)
			.where(
				and(
					eq(proposalMembers.memberId, memberId),
					eq(proposalMembers.proposalId, proposalId),
				),
			)
			.returning();

		if (!deleted) {
			throw new ApiError(404, "MEMBER_NOT_FOUND", "Member not found");
		}

		await insertAuditLog(
			{
				userId: authUser.userId,
				action: `Removed member ${memberId} from proposal ${proposalId}`,
				tableAffected: "proposal_members",
				ipAddress,
			},
			tx,
		);
	});
}
