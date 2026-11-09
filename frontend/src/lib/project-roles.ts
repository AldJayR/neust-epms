export const PROJECT_LEADER_ROLE = "Project Leader";
export const TEAM_LEADER_ROLE = "Team Leader";
export const PROJECT_MEMBER_ROLE = "Project Member";

export const PROJECT_ROLES = [
	PROJECT_LEADER_ROLE,
	TEAM_LEADER_ROLE,
	PROJECT_MEMBER_ROLE,
] as const;

export const MEMBER_ROLE_OPTIONS = [TEAM_LEADER_ROLE, PROJECT_MEMBER_ROLE];

export type ProjectRole = (typeof PROJECT_ROLES)[number];
