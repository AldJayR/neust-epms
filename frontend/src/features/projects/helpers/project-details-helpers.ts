import type { ProjectMember } from "@/types/project";

export function isProjectLeader(
	currentUserId: string,
	members: ProjectMember[],
): boolean {
	return members.some(
		(member) =>
			member.userId === currentUserId && member.role === "Project Leader",
	);
}

export function canManageSpecialOrders(
	currentUserId: string,
	currentUserRole: string,
	members: ProjectMember[],
): boolean {
	return (
		currentUserRole === "Director" ||
		currentUserRole === "RET Chair" ||
		members.some((member) => member.userId === currentUserId)
	);
}

export function canUploadSpecialOrder(
	status: string,
	currentUserId: string,
	currentUserRole: string,
	members: ProjectMember[],
): boolean {
	if (status !== "Approved") return false;
	return currentUserRole === "Director" || isProjectLeader(currentUserId, members);
}

export function canReadProject(
	currentUserId: string,
	currentUserRole: string,
	members: ProjectMember[],
): boolean {
	return (
		currentUserRole === "Director" ||
		currentUserRole === "RET Chair" ||
		members.some((member) => member.userId === currentUserId)
	);
}
