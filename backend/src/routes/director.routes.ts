import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { and, count, desc, eq, inArray, isNull, or, sql, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/audit-logs.js";
import { campuses } from "../db/schema/campuses.js";
import { departments } from "../db/schema/departments.js";
import { moas } from "../db/schema/moas.js";
import { partners } from "../db/schema/partners.js";
import { projects } from "../db/schema/projects.js";
import { proposalDocuments } from "../db/schema/proposal-documents.js";
import { proposalMembers } from "../db/schema/proposal-members.js";
import { proposalReviews } from "../db/schema/proposal-reviews.js";
import { proposals } from "../db/schema/proposals.js";
import { roles } from "../db/schema/roles.js";
import { users } from "../db/schema/users.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { PROPOSAL_STATUS, PROJECT_STATUS, ROLE_NAMES } from "../lib/types.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const HubProjectSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    leaderName: z.string(),
    leaderRank: z.string().nullable(),
    college: z.string().nullable(),
    dateSubmitted: z.string(),
    status: z.string(),
    type: z.enum(["Proposal", "Project"]),
  })
  .openapi("HubProject");

const HubProjectListSchema = z
  .object({
    items: z.array(HubProjectSchema),
    total: z.number(),
  })
  .openapi("HubProjectList");

const HubQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ param: { name: "page", in: "query" } }),
  limit: z.coerce.number().int().min(1).max(100).default(10).openapi({ param: { name: "limit", in: "query" } }),
  search: z.string().optional().openapi({ param: { name: "search", in: "query" } }),
  college: z.string().optional().openapi({ param: { name: "college", in: "query" } }),
  status: z.string().optional().openapi({ param: { name: "status", in: "query" } }),
});

const DashboardMetricSchema = z.object({
  totalProjects: z.number(),
  ongoingProjects: z.number(),
  underEvaluation: z.number(),
  completed: z.number(),
});

const ChartPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});

const ActivitySchema = z.object({
  title: z.string(),
  description: z.string(),
  time: z.string(),
});

const MoaSchema = z.object({
  name: z.string(),
  dueText: z.string(),
});

const MoaRepositoryItemSchema = z.object({
  id: z.string(),
  partnerOrganization: z.string(),
  dateSigned: z.string(),
  daysToExpiry: z.union([z.number(), z.string()]),
  status: z.enum(["Valid", "Renewal Needed", "Expired"]),
});

const MoaRepositorySchema = z.object({
  items: z.array(MoaRepositoryItemSchema),
  total: z.number(),
  metrics: z.object({
    totalMoas: z.number(),
    expiringWithin90Days: z.number(),
    activePartnerships: z.number(),
  }),
});

const FacultyInvolvementSchema = z.object({
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  academicRank: z.string().nullable(),
  college: z.string().nullable(),
  leadProjects: z.number(),
  collaboratorProjects: z.number(),
  totalInvolvement: z.number(),
});

const FacultyDirectorySchema = z.object({
  items: z.array(FacultyInvolvementSchema),
  total: z.number(),
  metrics: z.object({
    totalActiveExtension: z.number(),
    averageProjectsPerFaculty: z.number(),
    mostActiveCollege: z.object({
      name: z.string(),
      contributors: z.number(),
    }),
  }),
});

const facultyDirectoryRoute = createRoute({
  method: "get",
  path: "/director/faculty",
  tags: ["Director"],
  summary: "Get faculty directory with involvement metrics",
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1).openapi({ param: { name: "page", in: "query" } }),
      limit: z.coerce.number().int().min(1).max(100).default(10).openapi({ param: { name: "limit", in: "query" } }),
      search: z.string().optional().openapi({ param: { name: "search", in: "query" } }),
      college: z.string().optional().openapi({ param: { name: "college", in: "query" } }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: FacultyDirectorySchema } },
      description: "Faculty directory with involvement metrics",
    },
  },
});

app.openapi(facultyDirectoryRoute, async (c) => {
  const { page, limit, search, college } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const whereConditions = [eq(users.isActive, true), eq(roles.roleName, ROLE_NAMES.FACULTY)];

  if (search) {
    whereConditions.push(
      or(
        ilike(users.firstName, `${search}%`),
        ilike(users.lastName, `${search}%`),
      )!,
    );
  }

  if (college) {
    whereConditions.push(eq(departments.departmentName, college));
  }

  const facultyQuery = db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      academicRank: users.academicRank,
      college: departments.departmentName,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .leftJoin(departments, eq(users.departmentId, departments.departmentId))
    .where(and(...whereConditions))
    .orderBy(users.lastName);

  const rows = await facultyQuery.limit(limit).offset(offset);
  const totalResult = await db.select({ value: count() }).from(users).innerJoin(roles, eq(users.roleId, roles.roleId)).where(and(...whereConditions));

  const userIds = rows.map((r) => r.userId);

  const [leadCounts, collabCounts] = await Promise.all([
    db
      .select({
        userId: proposalMembers.userId,
        value: count(),
      })
      .from(projects)
      .innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
      .innerJoin(proposalMembers, eq(proposals.proposalId, proposalMembers.proposalId))
      .where(and(inArray(proposalMembers.userId, userIds), isNull(projects.archivedAt), eq(proposalMembers.projectRole, "Project Leader")))
      .groupBy(proposalMembers.userId),
    db
      .select({
        userId: proposalMembers.userId,
        value: count(),
      })
      .from(proposalMembers)
      .where(and(inArray(proposalMembers.userId, userIds), eq(proposalMembers.projectRole, "Project Leader")))
      .groupBy(proposalMembers.userId),
  ]);

  const leadMap = new Map(leadCounts.map((r) => [r.userId, Number(r.value ?? 0)]));
  const collabMap = new Map(collabCounts.map((r) => [r.userId, Number(r.value ?? 0)]));

  const items = rows.map((row) => {
    const leadProjects = leadMap.get(row.userId) ?? 0;
    const collaboratorProjects = collabMap.get(row.userId) ?? 0;
    return {
      ...row,
      leadProjects,
      collaboratorProjects,
      totalInvolvement: leadProjects + collaboratorProjects,
    };
  });

  const [totalFaculty] = await db
    .select({ value: count() })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(eq(users.isActive, true));

  const [totalProjects] = await db
    .select({ value: count() })
    .from(projects)
    .where(isNull(projects.archivedAt));

  const [mostActiveCollege] = await db
    .select({
      name: departments.departmentName,
      contributors: count(),
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .innerJoin(departments, eq(users.departmentId, departments.departmentId))
    .where(and(eq(users.isActive, true), eq(roles.roleName, ROLE_NAMES.FACULTY)))
    .groupBy(departments.departmentName)
    .orderBy(desc(count()))
    .limit(1);

  return c.json({
    items,
    total: Number(totalResult[0]?.value ?? 0),
    metrics: {
      totalActiveExtension: Number(totalFaculty?.value ?? 0),
      averageProjectsPerFaculty: Number(totalFaculty?.value ? (Number(totalProjects?.value) / Number(totalFaculty?.value)).toFixed(1) : 0),
      mostActiveCollege: {
        name: mostActiveCollege?.name ?? "N/A",
        contributors: Number(mostActiveCollege?.contributors ?? 0),
      },
    },
  }, 200);
});

const moaRepositoryRoute = createRoute({
  method: "get",
  path: "/director/moas",
  tags: ["Director"],
  summary: "Get MOA repository with metrics",
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1).openapi({ param: { name: "page", in: "query" } }),
      limit: z.coerce.number().int().min(1).max(100).default(10).openapi({ param: { name: "limit", in: "query" } }),
      search: z.string().optional().openapi({ param: { name: "search", in: "query" } }),
      status: z.string().optional().openapi({ param: { name: "status", in: "query" } }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: MoaRepositorySchema } },
      description: "MOA repository with metrics",
    },
  },
});

app.openapi(moaRepositoryRoute, async (c) => {
  const { page, limit, search, status } = c.req.valid("query");
  const offset = (page - 1) * limit;
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const whereConditions = [isNull(moas.archivedAt)];

  if (search) {
    whereConditions.push(ilike(partners.partnerName, `${search}%`));
  }

  if (status) {
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    switch (status) {
      case "Valid":
        whereConditions.push(
          and(
            sql`${moas.validUntil} > ${now}`,
            sql`${moas.validUntil} > ${thirtyDaysFromNow}`,
          )!,
        );
        break;
      case "Renewal Needed":
        whereConditions.push(
          and(
            sql`${moas.validUntil} > ${now}`,
            sql`${moas.validUntil} <= ${thirtyDaysFromNow}`,
          )!,
        );
        break;
      case "Expired":
        whereConditions.push(sql`${moas.validUntil} <= ${now}`);
        break;
    }
  }

  const query = db
    .select({
      moaId: moas.moaId,
      partnerName: partners.partnerName,
      validFrom: moas.validFrom,
      validUntil: moas.validUntil,
    })
    .from(moas)
    .innerJoin(partners, eq(moas.partnerId, partners.partnerId))
    .where(and(...whereConditions))
    .orderBy(desc(moas.validUntil));

  const rows = await query.limit(limit).offset(offset);
  const totalResult = await db.select({ value: count() }).from(moas).innerJoin(partners, eq(moas.partnerId, partners.partnerId)).where(and(...whereConditions));

  const [totalMoasCount, expiringSoonCount, activeCount] = await Promise.all([
    db.select({ value: count() }).from(moas).where(isNull(moas.archivedAt)),
    db.select({ value: count() }).from(moas).where(
      and(
        isNull(moas.archivedAt),
        sql`${moas.validUntil} > ${now}`,
        sql`${moas.validUntil} <= ${ninetyDaysFromNow}`,
      ),
    ),
    db.select({ value: count() }).from(moas).where(
      and(
        isNull(moas.archivedAt),
        sql`${moas.validUntil} > ${now}`,
      ),
    ),
  ]);

  const items = rows.map((r) => {
    const daysUntilExpiry = Math.ceil((r.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    
    let moaStatus: "Valid" | "Renewal Needed" | "Expired" = "Valid";
    if (r.validUntil < now) {
      moaStatus = "Expired";
    } else if (daysUntilExpiry <= 30) {
      moaStatus = "Renewal Needed";
    }

    return {
      id: r.moaId,
      partnerOrganization: r.partnerName,
      dateSigned: r.validFrom.toISOString(),
      daysToExpiry: daysUntilExpiry < 0 ? "Expired" : daysUntilExpiry,
      status: moaStatus,
    };
  });

  return c.json({
    items,
    total: Number(totalResult[0]?.value ?? 0),
    metrics: {
      totalMoas: Number(totalMoasCount[0]?.value ?? 0),
      expiringWithin90Days: Number(expiringSoonCount[0]?.value ?? 0),
      activePartnerships: Number(activeCount[0]?.value ?? 0),
    },
  }, 200);
});

const DirectorDashboardSchema = z.object({
  metrics: DashboardMetricSchema,
  chartData: z.array(ChartPointSchema),
  recentActivities: z.array(ActivitySchema),
  expiringMoas: z.array(MoaSchema),
});

app.use("/director/*", authMiddleware);
app.use("/director/*", async (c, next) => {
  const user = c.get("user");
  const path = c.req.path;

  // Match /director/projects/{proposalId} (uuid)
  const isProjectDetails = /\/director\/projects\/[a-f0-9-]{36}$/i.test(path);

  if (isProjectDetails) {
    if (
      user.roleName === ROLE_NAMES.SUPER_ADMIN ||
      user.roleName === ROLE_NAMES.DIRECTOR ||
      user.roleName === ROLE_NAMES.RET_CHAIR
    ) {
      await next();
      return;
    }
	} else {
    if (
      user.roleName === ROLE_NAMES.SUPER_ADMIN ||
      user.roleName === ROLE_NAMES.DIRECTOR ||
      user.roleName === ROLE_NAMES.RET_CHAIR
    ) {
      await next();
      return;
    }
  }

  throw new ApiError(
    403,
    "FORBIDDEN",
    `This action requires one of: ${isProjectDetails ? "Super Admin, Director, RET Chair" : "Super Admin, Director, RET Chair"}`
  );
});

function formatRelativeTime(date: Date, now: Date) {
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 2) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  if (diffHours >= 1) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  if (diffMinutes >= 1) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  return "Just now";
}

function activityTitle(action: string, tableAffected: string) {
  const lowerAction = action.toLowerCase();

  if (lowerAction.includes("bulk approved") || lowerAction.includes("approved") || tableAffected === "projects") {
    return "Project Approved";
  }

  if (lowerAction.includes("submitted") || tableAffected === "proposals") {
    return "New Proposal Submitted";
  }

  return "Review Pending";
}

const dashboardRoute = createRoute({
  method: "get",
  path: "/director/dashboard",
  tags: ["Director"],
  summary: "Get director dashboard summary",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: DirectorDashboardSchema } },
      description: "Director dashboard summary",
    },
  },
});

const projectHubRoute = createRoute({
  method: "get",
  path: "/director/hub/projects",
  tags: ["Director"],
  summary: "Get unified project hub list (Proposals + Projects)",
  security: [{ Bearer: [] }],
  request: { query: HubQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: HubProjectListSchema } },
      description: "Unified project hub list",
    },
  },
});

app.openapi(projectHubRoute, async (c) => {
  const { page, limit, search, college, status } = c.req.valid("query");
  const offset = (page - 1) * limit;
  const user = c.get("user");

  const whereConditions = [
    isNull(proposals.archivedAt),
    or(
      eq(proposals.status, PROPOSAL_STATUS.ENDORSED),
      eq(proposals.status, PROPOSAL_STATUS.APPROVED),
      eq(proposals.status, PROPOSAL_STATUS.RETURNED),
      eq(proposals.status, PROPOSAL_STATUS.REJECTED),
    ),
  ];

  if (user.roleName === ROLE_NAMES.RET_CHAIR) {
    if (user.isMainCampus && user.departmentId !== null) {
      whereConditions.push(eq(proposals.departmentId, user.departmentId));
    } else {
      whereConditions.push(eq(proposals.campusId, user.campusId));
    }
  }

  if (search) {
    whereConditions.push(
      or(
        ilike(proposals.title, `${search}%`),
        ilike(users.firstName, `${search}%`),
        ilike(users.lastName, `${search}%`),
      )!,
    );
  }

  if (college) {
    whereConditions.push(eq(departments.departmentName, college));
  }

  if (status) {
    if (Object.values(PROJECT_STATUS).includes(status as any)) {
      whereConditions.push(eq(projects.projectStatus, status));
    } else {
      whereConditions.push(eq(proposals.status, status));
    }
  }

  const leaderMembersSubquery = db
    .select({
      proposalId: proposalMembers.proposalId,
      userId: proposalMembers.userId,
    })
    .from(proposalMembers)
    .where(eq(proposalMembers.projectRole, "Project Leader"))
    .as("leader_members");

  const query = db
    .select({
      id: proposals.proposalId,
      title: proposals.title,
      leaderFirstName: users.firstName,
      leaderLastName: users.lastName,
      leaderRank: users.academicRank,
      college: departments.departmentName,
      dateSubmitted: proposals.createdAt,
      proposalStatus: proposals.status,
      projectStatus: projects.projectStatus,
    })
    .from(proposals)
    .innerJoin(leaderMembersSubquery, eq(proposals.proposalId, leaderMembersSubquery.proposalId))
    .innerJoin(users, eq(leaderMembersSubquery.userId, users.userId))
    .leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
    .leftJoin(projects, eq(proposals.proposalId, projects.proposalId))
    .where(and(...whereConditions))
    .orderBy(desc(proposals.createdAt));

  const totalResult = await db
    .select({ value: count() })
    .from(proposals)
    .innerJoin(leaderMembersSubquery, eq(proposals.proposalId, leaderMembersSubquery.proposalId))
    .innerJoin(users, eq(leaderMembersSubquery.userId, users.userId))
    .leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
    .leftJoin(projects, eq(proposals.proposalId, projects.proposalId))
    .where(and(...whereConditions));

  const rows = await query.limit(limit).offset(offset);

  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    leaderName: `${r.leaderFirstName} ${r.leaderLastName}`,
    leaderRank: r.leaderRank,
    college: r.college,
    dateSubmitted: r.dateSubmitted.toISOString(),
    status: r.projectStatus || r.proposalStatus,
    type: (r.projectStatus ? "Project" : "Proposal") as "Project" | "Proposal",
  }));

  return c.json({ items, total: Number(totalResult[0]?.value ?? 0) }, 200);
});

app.openapi(dashboardRoute, async (c) => {
  const user = c.get("user");
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const projectMetricsConditions = [isNull(projects.archivedAt)];
  const underEvalConditions = [
    isNull(proposals.archivedAt),
    or(
      eq(proposals.status, PROPOSAL_STATUS.SUBMITTED),
      eq(proposals.status, PROPOSAL_STATUS.ENDORSED),
    ),
  ];

  if (user.roleName === ROLE_NAMES.RET_CHAIR) {
    if (user.isMainCampus && user.departmentId !== null) {
      projectMetricsConditions.push(eq(proposals.departmentId, user.departmentId));
      underEvalConditions.push(eq(proposals.departmentId, user.departmentId));
    } else {
      projectMetricsConditions.push(eq(proposals.campusId, user.campusId));
      underEvalConditions.push(eq(proposals.campusId, user.campusId));
    }
  }

  const [projectMetrics, underEvaluationResult] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        ongoing: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.ONGOING})`,
        completed: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.COMPLETED})`,
      })
      .from(projects)
      .innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
      .where(and(...projectMetricsConditions)),
    db.select({ value: count() }).from(proposals).where(and(...underEvalConditions)),
  ]);

  const chartConditions = [isNull(proposals.archivedAt)];
  if (user.roleName === ROLE_NAMES.RET_CHAIR) {
    if (user.isMainCampus && user.departmentId !== null) {
      chartConditions.push(eq(proposals.departmentId, user.departmentId));
    } else {
      chartConditions.push(eq(proposals.campusId, user.campusId));
    }
  }

  const chartRows = await db
    .select({
      label: campuses.campusName,
      value: count(),
    })
    .from(proposals)
    .innerJoin(campuses, eq(proposals.campusId, campuses.campusId))
    .where(and(...chartConditions))
    .groupBy(campuses.campusName);

  const recentLogRows = await db
    .select({
      action: auditLogs.action,
      tableAffected: auditLogs.tableAffected,
      createdAt: auditLogs.createdAt,
      actorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.userId, users.userId))
    .where(eq(auditLogs.userId, user.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(3);

  const expiringMoaConditions = [
    isNull(moas.archivedAt),
    sql`${moas.validUntil} > ${now}`,
    sql`${moas.validUntil} <= ${twoWeeksFromNow}`,
  ];

  if (user.roleName === ROLE_NAMES.RET_CHAIR) {
    if (user.isMainCampus && user.departmentId !== null) {
      expiringMoaConditions.push(eq(proposals.departmentId, user.departmentId));
    } else {
      expiringMoaConditions.push(eq(proposals.campusId, user.campusId));
    }
  }

  const expiringMoaRows = await db
    .select({
      partnerName: partners.partnerName,
      validUntil: moas.validUntil,
    })
    .from(moas)
    .innerJoin(partners, eq(moas.partnerId, partners.partnerId))
    .innerJoin(projects, eq(moas.moaId, projects.moaId))
    .innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
    .where(and(...expiringMoaConditions))
    .orderBy(moas.validUntil)
    .limit(2);

  return c.json(
    {
      metrics: {
        totalProjects: Number(projectMetrics[0]?.total ?? 0),
        ongoingProjects: Number(projectMetrics[0]?.ongoing ?? 0),
        underEvaluation: Number(underEvaluationResult[0]?.value ?? 0),
        completed: Number(projectMetrics[0]?.completed ?? 0),
      },
      chartData: chartRows
        .map((row) => ({ label: row.label, value: Number(row.value ?? 0) }))
        .sort((a, b) => b.value - a.value),
      recentActivities: recentLogRows.map((row) => ({
        title: activityTitle(row.action, row.tableAffected),
        description: row.action,
        time: formatRelativeTime(row.createdAt, now),
      })),
      expiringMoas: expiringMoaRows.map((row) => {
        const daysUntilExpiry = Math.max(
          0,
          Math.ceil((row.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        );

        return {
          name: row.partnerName,
          dueText:
            daysUntilExpiry === 0
              ? "Expires today"
              : `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`,
        };
      }),
    },
    200,
  );
});

// ── Project Details Endpoint ──

const ProjectDetailsMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.string(),
});

const ProjectDetailsHistoryItemSchema = z.object({
  id: z.string(),
  version: z.string(),
  status: z.string(),
  actorName: z.string(),
  date: z.string(),
  comment: z.string().optional(),
});

const ProjectDetailsAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  version: z.string(),
});

const ProjectDetailsSchema = z.object({
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

const projectDetailsRoute = createRoute({
  method: "get",
  path: "/director/projects/{proposalId}",
  tags: ["Director"],
  summary: "Get project details by proposal ID",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      proposalId: z.string().openapi({ param: { name: "proposalId", in: "path" } }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ProjectDetailsSchema } },
      description: "Project details",
    },
    404: {
      description: "Project not found",
    },
  },
});

app.openapi(projectDetailsRoute, async (c) => {
  const { proposalId } = c.req.valid("param");

  const leaderMembers = db
    .select({
      proposalId: proposalMembers.proposalId,
      userId: proposalMembers.userId,
    })
    .from(proposalMembers)
    .where(eq(proposalMembers.projectRole, "Project Leader"))
    .as("leader_members");

  const [row] = await db
    .select({
      proposalId: proposals.proposalId,
      campusId: proposals.campusId,
      departmentId: proposals.departmentId,
      title: proposals.title,
      status: proposals.status,
      revisionNum: proposals.revisionNum,
      budgetNeust: proposals.budgetNeust,
      budgetPartner: proposals.budgetPartner,
      leaderFirstName: users.firstName,
      leaderLastName: users.lastName,
      departmentName: departments.departmentName,
      projectStatus: projects.projectStatus,
      startDate: projects.startDate,
      targetEnd: projects.targetEnd,
      moaPartner: partners.partnerName,
    })
    .from(proposals)
    .innerJoin(leaderMembers, eq(proposals.proposalId, leaderMembers.proposalId))
    .innerJoin(users, eq(leaderMembers.userId, users.userId))
    .innerJoin(departments, eq(proposals.departmentId, departments.departmentId))
    .leftJoin(projects, eq(proposals.proposalId, projects.proposalId))
    .leftJoin(moas, eq(projects.moaId, moas.moaId))
    .leftJoin(partners, eq(moas.partnerId, partners.partnerId))
    .where(eq(proposals.proposalId, proposalId));

  if (!row) {
    return c.json({ error: { message: "Project not found" } }, 404);
  }

  // Security check for RET Chair
  const user = c.get("user");
  if (user.roleName === ROLE_NAMES.RET_CHAIR) {
    const [userCampus] = await db
      .select({ isMainCampus: campuses.isMainCampus })
      .from(campuses)
      .where(eq(campuses.campusId, user.campusId))
      .limit(1);
    const isMainCampus = userCampus?.isMainCampus ?? false;

    if (isMainCampus && user.departmentId !== null) {
      if (row.departmentId !== user.departmentId) {
        throw new ApiError(403, "FORBIDDEN", "You do not have access to this proposal");
      }
    } else {
      if (row.campusId !== user.campusId) {
        throw new ApiError(403, "FORBIDDEN", "You do not have access to this proposal");
      }
    }
  }

  const [memberRows, documentRows, reviewRows] = await Promise.all([
    db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        role: proposalMembers.projectRole,
      })
      .from(proposalMembers)
      .innerJoin(users, eq(proposalMembers.userId, users.userId))
      .where(eq(proposalMembers.proposalId, proposalId)),

    db
      .select({
        documentId: proposalDocuments.documentId,
        versionNum: proposalDocuments.versionNum,
        storagePath: proposalDocuments.storagePath,
        uploadedAt: proposalDocuments.uploadedAt,
      })
      .from(proposalDocuments)
      .where(eq(proposalDocuments.proposalId, proposalId))
      .orderBy(desc(proposalDocuments.versionNum)),

    db
      .select({
        reviewId: proposalReviews.reviewId,
        decision: proposalReviews.decision,
        comments: proposalReviews.comments,
        reviewedAt: proposalReviews.reviewedAt,
        reviewerFirstName: users.firstName,
        reviewerLastName: users.lastName,
      })
      .from(proposalReviews)
      .innerJoin(users, eq(proposalReviews.reviewerId, users.userId))
      .where(eq(proposalReviews.proposalId, proposalId))
      .orderBy(desc(proposalReviews.reviewedAt)),
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let duration = "Not yet started";
  if (row.startDate && row.targetEnd) {
    duration = `${months[row.startDate.getMonth()]} ${row.startDate.getFullYear()} - ${months[row.targetEnd.getMonth()]} ${row.targetEnd.getFullYear()}`;
  }

  const budgetNeust = Number(row.budgetNeust ?? 0);
  const budgetPartner = Number(row.budgetPartner ?? 0);

  const members = memberRows.map((m) => ({
    userId: m.userId,
    name: `${m.firstName} ${m.lastName}`,
    role: m.role,
  }));

  const history: Array<{
    id: string;
    version: string;
    status: string;
    actorName: string;
    date: string;
    comment?: string;
  }> = [];

  documentRows.forEach((doc) => {
    history.push({
      id: doc.documentId,
      version: `v${doc.versionNum}`,
      status: doc.versionNum === documentRows[0]?.versionNum ? "Current" : "Previous",
      actorName: "System",
      date: doc.uploadedAt.toISOString(),
    });
  });

  reviewRows.forEach((review) => {
    history.push({
      id: review.reviewId,
      version: `v${row.revisionNum}`,
      status: review.decision === "Returned" ? "Returned" : review.decision === "Approved" ? "Approved" : review.decision,
      actorName: `${review.reviewerFirstName} ${review.reviewerLastName}`,
      date: review.reviewedAt.toISOString(),
      ...(review.comments ? { comment: review.comments } : {}),
    });
  });

  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const attachments = documentRows.map((doc) => ({
    id: doc.documentId,
    name: doc.storagePath.split("/").pop() || doc.storagePath,
    type: (doc.storagePath.split(".").pop()?.toUpperCase()) || "FILE",
    url: doc.storagePath,
    version: `v${doc.versionNum}`,
  }));

  const status = row.projectStatus || row.status;

  return c.json({
    id: row.proposalId,
    title: row.title,
    status,
    version: `v${row.revisionNum}`,
    metadata: {
      leader: {
        name: "N/A",
      },
      department: row.departmentName,
      duration,
      moaLinked: row.moaPartner || "None",
      budget: {
        total: budgetNeust + budgetPartner,
        neust: budgetNeust,
        partner: budgetPartner,
      },
    },
    members,
    history,
    attachments,
  }, 200);
});

export default app;
