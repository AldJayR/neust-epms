import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { and, count, desc, eq, isNull, or, sql, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/audit-logs.js";
import { campuses } from "../db/schema/campuses.js";
import { departments } from "../db/schema/departments.js";
import { moas } from "../db/schema/moas.js";
import { projects } from "../db/schema/projects.js";
import { proposals } from "../db/schema/proposals.js";
import { roles } from "../db/schema/roles.js";
import { users } from "../db/schema/users.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { installApiErrorHandler } from "../lib/errors.js";
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
  status: z.enum(["Valid", "Renewal Needed", "Expired", "Terminated"]),
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

  const whereConditions = [isNull(users.archivedAt), eq(roles.roleName, ROLE_NAMES.FACULTY)];

  if (search) {
    whereConditions.push(
      or(
        ilike(users.firstName, `%${search}%`),
        ilike(users.lastName, `%${search}%`),
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

  const items = await Promise.all(
    rows.map(async (row) => {
      const [leadCount] = await db
        .select({ value: count() })
        .from(projects)
        .where(and(eq(projects.projectLeaderId, row.userId), isNull(projects.archivedAt)));

      // Note: Collaborator count would involve checking proposal_members
      // For now, we'll return a placeholder or implement a basic count
      const collaboratorCount = 0; 

      return {
        ...row,
        leadProjects: Number(leadCount?.value ?? 0),
        collaboratorProjects: collaboratorCount,
        totalInvolvement: Number(leadCount?.value ?? 0) + collaboratorCount,
      };
    }),
  );

  const [totalFaculty] = await db
    .select({ value: count() })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(isNull(users.archivedAt));

  const [totalProjects] = await db
    .select({ value: count() })
    .from(projects)
    .where(isNull(projects.archivedAt));

  return c.json({
    items,
    total: Number(totalResult[0]?.value ?? 0),
    metrics: {
      totalActiveExtension: Number(totalFaculty[0]?.value ?? 0),
      averageProjectsPerFaculty: Number(totalFaculty[0]?.value ? (Number(totalProjects[0]?.value) / Number(totalFaculty[0]?.value)).toFixed(1) : 0),
      mostActiveCollege: {
        name: "College of Agriculture", // Placeholder for actual aggregation
        contributors: 142,
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
    whereConditions.push(ilike(moas.partnerName, `%${search}%`));
  }

  // Note: Status filtering logic would go here if needed, 
  // but for now we'll return all and let frontend handle it or implement basic mapping
  // Real implementation would calculate status based on validUntil

  const query = db
    .select()
    .from(moas)
    .where(and(...whereConditions))
    .orderBy(desc(moas.validUntil));

  const rows = await query.limit(limit).offset(offset);
  const totalResult = await db.select({ value: count() }).from(moas).where(and(...whereConditions));

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
    
    let moaStatus: "Valid" | "Renewal Needed" | "Expired" | "Terminated" = "Valid";
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
app.use("/director/*", requireRole(ROLE_NAMES.SUPER_ADMIN, ROLE_NAMES.DIRECTOR));

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

  const whereConditions = [
    isNull(proposals.archivedAt),
    or(
      eq(proposals.currentStatus, PROPOSAL_STATUS.ENDORSED),
      eq(proposals.currentStatus, PROPOSAL_STATUS.APPROVED),
      eq(proposals.currentStatus, PROPOSAL_STATUS.RETURNED),
      eq(proposals.currentStatus, PROPOSAL_STATUS.REJECTED),
    ),
  ];

  if (search) {
    whereConditions.push(
      or(
        ilike(proposals.title, `%${search}%`),
        ilike(users.firstName, `%${search}%`),
        ilike(users.lastName, `%${search}%`),
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
      whereConditions.push(eq(proposals.currentStatus, status));
    }
  }

  const query = db
    .select({
      id: proposals.proposalId,
      title: proposals.title,
      leaderFirstName: users.firstName,
      leaderLastName: users.lastName,
      leaderRank: users.academicRank,
      college: departments.departmentName,
      dateSubmitted: proposals.createdAt,
      proposalStatus: proposals.currentStatus,
      projectStatus: projects.projectStatus,
    })
    .from(proposals)
    .innerJoin(users, eq(proposals.projectLeaderId, users.userId))
    .leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
    .leftJoin(projects, eq(proposals.proposalId, projects.proposalId))
    .where(and(...whereConditions))
    .orderBy(desc(proposals.createdAt));

  const totalResult = await db
    .select({ value: count() })
    .from(proposals)
    .innerJoin(users, eq(proposals.projectLeaderId, users.userId))
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
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [totalProjectsResult, ongoingProjectsResult, completedProjectsResult, underEvaluationResult] = await Promise.all([
    db.select({ value: count() }).from(projects).where(isNull(projects.archivedAt)),
    db.select({ value: count() }).from(projects).where(and(isNull(projects.archivedAt), eq(projects.projectStatus, PROJECT_STATUS.ONGOING))),
    db.select({ value: count() }).from(projects).where(and(isNull(projects.archivedAt), eq(projects.projectStatus, PROJECT_STATUS.COMPLETED))),
    db.select({ value: count() }).from(proposals).where(
      and(
        isNull(proposals.archivedAt),
        or(
          eq(proposals.currentStatus, PROPOSAL_STATUS.SUBMITTED),
          eq(proposals.currentStatus, PROPOSAL_STATUS.ENDORSED),
        ),
      ),
    ),
  ]);

  const chartRows = await db
    .select({
      label: campuses.campusName,
      value: count(),
    })
    .from(proposals)
    .innerJoin(campuses, eq(proposals.campusId, campuses.campusId))
    .where(isNull(proposals.archivedAt))
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
    .leftJoin(roles, eq(users.roleId, roles.roleId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(3);

  const expiringMoaRows = await db
    .select({
      partnerName: moas.partnerName,
      validUntil: moas.validUntil,
    })
    .from(moas)
    .where(
      and(
        isNull(moas.archivedAt),
        sql`${moas.validUntil} > ${now}`,
        sql`${moas.validUntil} <= ${twoWeeksFromNow}`,
      ),
    )
    .orderBy(moas.validUntil)
    .limit(2);

  return c.json(
    {
      metrics: {
        totalProjects: Number(totalProjectsResult[0]?.value ?? 0),
        ongoingProjects: Number(ongoingProjectsResult[0]?.value ?? 0),
        underEvaluation: Number(underEvaluationResult[0]?.value ?? 0),
        completed: Number(completedProjectsResult[0]?.value ?? 0),
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

export default app;
