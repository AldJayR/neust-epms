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

export function canSubmitProjectReports(
	currentUserId: string,
	members: ProjectMember[],
): boolean {
	return isProjectLeader(currentUserId, members);
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
	_status: string,
	_currentUserId: string,
	_currentUserRole: string,
	_members: ProjectMember[],
): boolean {
	// DFD Process 4.1 & 7.1: Special orders are collected at proposal submission time, not in project details
	return false;
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
