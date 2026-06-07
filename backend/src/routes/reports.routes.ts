import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, isNull, lt, desc, count } from "drizzle-orm";
import { paginateResults } from "../lib/pagination.js";
import { db } from "../db/client.js";
import { projectReports } from "../db/schema/project-reports.js";
import { projects } from "../db/schema/projects.js";
import { proposals } from "../db/schema/proposals.js";
import { users } from "../db/schema/users.js";
import { departments } from "../db/schema/departments.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { insertAuditLog } from "../lib/audit.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const ReportSchema = z
  .object({
    reportId: z.string(),
    projectId: z.string(),
    project: z.string(),
    leader: z.string(),
    department: z.string().nullable(),
    reportType: z.string(),
    submitted: z.string(),
    storagePath: z.string().nullable(),
    remarks: z.string().nullable(),
    archivedAt: z.string().nullable(),
  })
  .openapi("ProjectReport");

const ReportListSchema = z
  .object({ items: z.array(ReportSchema), total: z.number(), nextCursor: z.string().nullable() })
  .openapi("ProjectReportList");

const CreateReportSchema = z
  .object({
    projectId: z.string(),
    reportType: z.string(),
    remarks: z.string().optional(),
    storagePath: z.string().optional(),
  })
  .openapi("CreateReport");

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("ReportError");

const MessageSchema = z
  .object({ message: z.string() })
  .openapi("ReportMessage");

const ParamId = z.object({
  id: z.string().uuid().openapi({ param: { name: "id", in: "path" } }),
});

const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
  cursor: z.string().optional().openapi({
    param: { name: "cursor", in: "query" },
  }),
});

app.use("/*", authMiddleware);

// ── GET /reports ──
const listRoute = createRoute({
  method: "get",
  path: "/reports",
  tags: ["Reports"],
  summary: "List all non-archived project reports",
  security: [{ Bearer: [] }],
  request: { query: PaginationQuery },
  responses: {
    200: {
      content: { "application/json": { schema: ReportListSchema } },
      description: "Report list",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const { limit, cursor } = c.req.valid("query");

  const baseConditions = [isNull(projectReports.archivedAt)];

  const cursorConditions = [...baseConditions];
  if (cursor) {
    cursorConditions.push(lt(projectReports.submittedAt, new Date(cursor)));
  }

  const rows = await db
    .select({
      reportId: projectReports.reportId,
      projectId: projectReports.projectId,
      projectTitle: proposals.title,
      leaderFirstName: users.firstName,
      leaderLastName: users.lastName,
      departmentName: departments.departmentName,
      reportType: projectReports.reportType,
      submittedAt: projectReports.submittedAt,
      storagePath: projectReports.storagePath,
      remarks: projectReports.remarks,
      archivedAt: projectReports.archivedAt,
    })
    .from(projectReports)
    .innerJoin(projects, eq(projectReports.projectId, projects.projectId))
    .innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
    .innerJoin(users, eq(proposals.projectLeaderId, users.userId))
    .leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
    .where(and(...cursorConditions))
    .orderBy(desc(projectReports.submittedAt))
    .limit(limit + 1);

  const { items: rawItems, nextCursor } = paginateResults(rows, limit, "submittedAt");

  const [totalRow] = await db
    .select({ value: count() })
    .from(projectReports)
    .where(and(...baseConditions));
  const total = totalRow?.value ?? 0;

  const items = rawItems.map((r) => ({
    reportId: r.reportId,
    projectId: r.projectId,
    project: r.projectTitle,
    leader: `${r.leaderFirstName} ${r.leaderLastName}`,
    department: r.departmentName,
    reportType: r.reportType,
    submitted: r.submittedAt.toISOString(),
    storagePath: r.storagePath,
    remarks: r.remarks,
    archivedAt: r.archivedAt?.toISOString() ?? null,
  }));

  return c.json({ items, total, nextCursor }, 200);
});

// ── POST /reports ──
const createReportRoute = createRoute({
  method: "post",
  path: "/reports",
  tags: ["Reports"],
  summary: "Submit a project report for a project",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateReportSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ReportSchema } },
      description: "Report created",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Project not found",
    },
  },
});

app.openapi(createReportRoute, async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  // Verify project exists
  const [project] = await db
    .select({ projectId: projects.projectId })
    .from(projects)
    .where(
      and(eq(projects.projectId, body.projectId), isNull(projects.archivedAt)),
    )
    .limit(1);

  if (!project) {
    throw new ApiError(404, "NOT_FOUND", "Project not found");
  }

  const [created] = await db
    .insert(projectReports)
    .values({
      projectId: body.projectId,
      submittedById: user.userId,
      reportType: body.reportType,
      remarks: body.remarks ?? null,
      storagePath: body.storagePath ?? null,
    })
    .returning();

  if (!created) {
    throw new ApiError(500, "INSERT_FAILED", "Failed to create report");
  }

  await insertAuditLog({
    userId: user.userId,
    action: `Submitted project report ${created.reportId} (${body.reportType}) for project ${body.projectId}`,
    tableAffected: "project_reports",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  const [enriched] = await db
    .select({
      reportId: projectReports.reportId,
      projectId: projectReports.projectId,
      projectTitle: proposals.title,
      leaderFirstName: users.firstName,
      leaderLastName: users.lastName,
      departmentName: departments.departmentName,
      reportType: projectReports.reportType,
      submittedAt: projectReports.submittedAt,
      storagePath: projectReports.storagePath,
      remarks: projectReports.remarks,
      archivedAt: projectReports.archivedAt,
    })
    .from(projectReports)
    .innerJoin(projects, eq(projectReports.projectId, projects.projectId))
    .innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
    .innerJoin(users, eq(proposals.projectLeaderId, users.userId))
    .leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
    .where(eq(projectReports.reportId, created.reportId))
    .limit(1);

  if (!enriched) {
    throw new ApiError(500, "ENRICH_FAILED", "Failed to retrieve created report");
  }

  return c.json(
    {
      reportId: enriched.reportId,
      projectId: enriched.projectId,
      project: enriched.projectTitle,
      leader: `${enriched.leaderFirstName} ${enriched.leaderLastName}`,
      department: enriched.departmentName,
      reportType: enriched.reportType,
      submitted: enriched.submittedAt.toISOString(),
      storagePath: enriched.storagePath,
      remarks: enriched.remarks,
      archivedAt: enriched.archivedAt?.toISOString() ?? null,
    },
    201,
  );
});

// ── DELETE /reports/:id (soft delete) ──
const archiveRoute = createRoute({
  method: "delete",
  path: "/reports/{id}",
  tags: ["Reports"],
  summary: "Archive a project report (soft delete)",
  security: [{ Bearer: [] }],
  request: { params: ParamId },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Report archived",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

app.openapi(archiveRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const [updated] = await db
    .update(projectReports)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(projectReports.reportId, id),
        isNull(projectReports.archivedAt),
      ),
    )
    .returning();

  if (!updated) {
    throw new ApiError(404, "NOT_FOUND", "Report not found");
  }

  await insertAuditLog({
    userId: user.userId,
    action: `Archived project report ${id}`,
    tableAffected: "project_reports",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json({ message: "Report archived" }, 200);
});

export default app;
