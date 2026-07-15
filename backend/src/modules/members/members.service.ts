import type { z } from "@hono/zod-openapi";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import {
	assertProposalAccess,
	getProposalAccess,
} from "@/lib/proposal-access.js";
import { buildProposalScope } from "@/lib/scope-helpers.js";
import type { AuthUser } from "@/lib/types.js";
import {
	isProjectLeader,
	PROJECT_LEADER_ROLE,
} from "@/services/auth-user.service.js";
import type { AddMemberSchema, MemberSchema } from "./members.schema.js";

type Member = z.infer<typeof MemberSchema>;

export async function listMembers(
	authUser: AuthUser,
	proposalId: string,
	query: { page: number; limit: number },
): Promise<{ items: Member[] }> {
	await getProposalAccess(authUser, proposalId);
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
		.innerJoin(proposals, eq(proposalMembers.proposalId, proposals.proposalId))
		.where(
			and(
				eq(proposalMembers.proposalId, proposalId),
				isNull(proposalMembers.archivedAt),
				...buildProposalScope(authUser),
			),
		)
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
			.select({
				proposalId: proposals.proposalId,
				campusId: proposals.campusId,
				departmentId: proposals.departmentId,
				archivedAt: proposals.archivedAt,
			})
			.from(proposals)
			.where(eq(proposals.proposalId, proposalId))
			.limit(1);

		if (!proposal) {
			throw new ApiError(404, "NOT_FOUND", "Proposal not found");
		}

		assertProposalAccess(authUser, proposal);

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
			.select({
				memberId: proposalMembers.memberId,
				archivedAt: proposalMembers.archivedAt,
			})
			.from(proposalMembers)
			.where(
				and(
					eq(proposalMembers.proposalId, proposalId),
					eq(proposalMembers.userId, body.userId),
				),
			)
			.limit(1);

		if (existingMember && !existingMember.archivedAt) {
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
						isNull(proposalMembers.archivedAt),
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

		if (existingMember) {
			const [reactivatedMember] = await tx
				.update(proposalMembers)
				.set({ projectRole: body.projectRole, archivedAt: null })
				.where(eq(proposalMembers.memberId, existingMember.memberId))
				.returning();

			if (!reactivatedMember) {
				throw new ApiError(500, "UPDATE_FAILED", "Failed to restore member");
			}

			await insertAuditLog(
				{
					userId: authUser.userId,
					action: `Restored member ${existingMember.memberId} on proposal ${proposalId}`,
					tableAffected: "proposal_members",
					newValue: { archivedAt: null, projectRole: body.projectRole },
					ipAddress,
				},
				tx,
			);

			return reactivatedMember;
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
			.select({
				proposalId: proposals.proposalId,
				campusId: proposals.campusId,
				departmentId: proposals.departmentId,
				archivedAt: proposals.archivedAt,
			})
			.from(proposals)
			.where(eq(proposals.proposalId, proposalId))
			.limit(1);

		if (!proposal) {
			throw new ApiError(404, "NOT_FOUND", "Proposal not found");
		}
		assertProposalAccess(authUser, proposal);

		if (!(await isProjectLeader(proposalId, authUser.userId))) {
			throw new ApiError(
				403,
				"NOT_LEADER",
				"Only the project leader can remove members",
			);
		}

		const [archived] = await tx
			.update(proposalMembers)
			.set({ archivedAt: new Date() })
			.where(
				and(
					eq(proposalMembers.memberId, memberId),
					eq(proposalMembers.proposalId, proposalId),
					isNull(proposalMembers.archivedAt),
				),
			)
			.returning();

		if (!archived) {
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
