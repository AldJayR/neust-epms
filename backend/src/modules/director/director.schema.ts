import { z } from "@hono/zod-openapi";

// ── Hub Schemas ──
export const HubProjectSchema = z
	.object({
		id: z.string(),
		title: z.string(),
		leaderName: z.string(),
		leaderRank: z.string().nullable(),
		college: z.string().nullable(),
		dateSubmitted: z.string(),
		lastReportDate: z.string().nullable().optional(),
		status: z.string(),
		type: z.enum(["Proposal", "Project"]),
	})
	.openapi("HubProject");

export const HubProjectListSchema = z
	.object({
		items: z.array(HubProjectSchema),
		total: z.number(),
	})
	.openapi("HubProjectList");

export const HubQuerySchema = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.openapi({ param: { name: "page", in: "query" } }),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(10)
		.openapi({ param: { name: "limit", in: "query" } }),
	search: z
		.string()
		.optional()
		.openapi({ param: { name: "search", in: "query" } }),
	college: z
		.string()
		.optional()
		.openapi({ param: { name: "college", in: "query" } }),
	status: z
		.string()
		.optional()
		.openapi({ param: { name: "status", in: "query" } }),
	myProjectsOnly: z
		.string()
		.optional()
		.openapi({ param: { name: "myProjectsOnly", in: "query" } }),
});

// ── Dashboard Schemas ──
export const DashboardMetricSchema = z.object({
	totalProjects: z.number(),
	ongoingProjects: z.number(),
	underEvaluation: z.number(),
	completed: z.number(),
	overdueProjects: z.number().optional(),
	pendingClosureProjects: z.number().optional(),
});

export const ChartPointSchema = z.object({
	label: z.string(),
	department: z.string(),
	departmentCode: z.string(),
	value: z.number(),
});

export const ActivitySchema = z.object({
	title: z.string(),
	description: z.string(),
	time: z.string(),
});

export const MoaSchema = z.object({
	name: z.string(),
	dueText: z.string(),
});

export const DirectorDashboardSchema = z.object({
	metrics: DashboardMetricSchema,
	chartData: z.array(ChartPointSchema),
	recentActivities: z.array(ActivitySchema),
	expiringMoas: z.array(MoaSchema),
});

// ── MOA Repository Schemas ──
export const MoaRepositoryItemSchema = z.object({
	id: z.string(),
	partnerOrganization: z.string(),
	dateSigned: z.string(),
	daysToExpiry: z.union([z.number(), z.string()]),
	status: z.enum(["Valid", "Renewal Needed", "Expired"]),
});

export const MoaRepositorySchema = z.object({
	items: z.array(MoaRepositoryItemSchema),
	total: z.number(),
	metrics: z.object({
		totalMoas: z.number(),
		expiringWithin90Days: z.number(),
		activePartnerships: z.number(),
	}),
});

// ── Faculty Directory Schemas ──
export const FacultyInvolvementSchema = z.object({
	userId: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	academicRank: z.string().nullable(),
	college: z.string().nullable(),
	departmentCode: z.string().nullable(),
	campusName: z.string().nullable(),
	isMainCampus: z.boolean().nullable(),
	isActive: z.boolean(),
	leadProjects: z.number(),
	collaboratorProjects: z.number(),
	totalInvolvement: z.number(),
});

export const FacultyContributorAvatarSchema = z.object({
	userId: z.string(),
	name: z.string(),
	avatarUrl: z.string().nullable(),
});

export const FacultyDirectorySchema = z.object({
	items: z.array(FacultyInvolvementSchema),
	total: z.number(),
	metrics: z.object({
		totalActiveExtension: z.number(),
		averageProjectsPerFaculty: z.number(),
		mostActiveCollege: z.object({
			name: z.string(),
			contributors: z.number(),
			contributorAvatars: z.array(FacultyContributorAvatarSchema),
		}),
	}),
});

// ── Project Details Schemas ──
export const ProjectDetailsMemberSchema = z.object({
	memberId: z.string(),
	userId: z.string(),
	name: z.string(),
	role: z.string(),
	avatarUrl: z.string().nullable().optional(),
	specialOrder: z
		.object({
			specialOrderId: z.string(),
			soNumber: z.string(),
			storagePath: z.string().nullable(),
			dateIssued: z.string().nullable(),
			status: z.string(),
		})
		.nullable()
		.optional(),
});

export const ProjectDetailsHistoryItemSchema = z.object({
	id: z.string(),
	version: z.string(),
	status: z.string(),
	actorName: z.string(),
	date: z.string(),
	comment: z.string().optional(),
});

export const ProjectDetailsAttachmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	url: z.string(),
	version: z.string(),
});

export const ProjectDetailsSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.string(),
	version: z.string(),
	metadata: z.object({
		leader: z.object({
			name: z.string(),
		}),
		department: z.string(),
		duration: z.string(),
		moaLinked: z.string(),
		sdgs: z.string().optional(),
		budget: z.object({
			total: z.number(),
			neust: z.number(),
			partner: z.number(),
		}),
	}),
	members: z.array(ProjectDetailsMemberSchema),
	history: z.array(ProjectDetailsHistoryItemSchema),
	attachments: z.array(ProjectDetailsAttachmentSchema),
});
