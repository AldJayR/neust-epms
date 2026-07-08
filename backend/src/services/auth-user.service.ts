import { and, eq } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";

export const PROJECT_LEADER_ROLE = "Project Leader";

export async function isProjectLeader(
	proposalId: string,
	userId: string,
): Promise<boolean> {
	const [member] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.proposalId, proposalId),
				eq(proposalMembers.userId, userId),
				eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
			),
		)
		.limit(1);
	return !!member;
}

export async function isExtensionDirector(userId: string): Promise<boolean> {
	const [user] = await db
		.select({ userId: users.userId })
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.where(and(eq(users.userId, userId), eq(roles.roleName, "Director")))
		.limit(1);
	return !!user;
}

export async function getUserRole(
	userId: string,
): Promise<string | null> {
	const [user] = await db
		.select({ roleName: roles.roleName })
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.where(eq(users.userId, userId))
		.limit(1);
	return user?.roleName ?? null;
}
