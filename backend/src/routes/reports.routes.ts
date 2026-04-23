import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { progressReports } from "../db/schema/progress-reports.js";
import { projects } from "../db/schema/projects.js";
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
    submittedBy: z.string(),
    storagePath: z.string().nullable(),
    remarks: z.string().nullable(),
    submittedAt: z.string(),
    archivedAt: z.string().nullable(),
  })
  .openapi("ProgressReport");

const ReportListSchema = z
  .object({ items: z.array(ReportSchema), total: z.number() })
  .openapi("ProgressReportList");

const CreateReportSchema = z
  .object({
    projectId: z.string(),
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
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

app.use("/*", authMiddleware);

// ── GET /reports ──
const listRoute = createRoute({
  method: "get",
  path: "/reports",
  tags: ["Reports"],
  summary: "List all non-archived progress reports",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: ReportListSchema } },
      description: "Report list",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const rows = await db
    .select()
    .from(progressReports)
    .where(isNull(progressReports.archivedAt))
    .orderBy(desc(progressReports.submittedAt));

  const items = rows.map((r) => ({
    ...r,
    submittedAt: r.submittedAt.toISOString(),
    archivedAt: r.archivedAt?.toISOString() ?? null,
  }));

  return c.json({ items, total: items.length }, 200);
});

// ── POST /reports ──
const createReportRoute = createRoute({
  method: "post",
  path: "/reports",
  tags: ["Reports"],
  summary: "Submit a progress report for a project",
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
    .select()
    .from(projects)
    .where(
      and(eq(projects.projectId, body.projectId), isNull(projects.archivedAt)),
    )
    .limit(1);

  if (!project) {
    throw new ApiError(404, "NOT_FOUND", "Project not found");
  }

  const [created] = await db
    .insert(progressReports)
    .values({
      projectId: body.projectId,
      submittedBy: user.userId,
      remarks: body.remarks ?? null,
      storagePath: body.storagePath ?? null,
    })
    .returning();

  if (!created) {
    throw new ApiError(500, "INSERT_FAILED", "Failed to create report");
  }

  await insertAuditLog({
    userId: user.userId,
    action: `Submitted progress report ${created.reportId} for project ${body.projectId}`,
    tableAffected: "progress_reports",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json(
    {
      ...created,
      submittedAt: created.submittedAt.toISOString(),
      archivedAt: created.archivedAt?.toISOString() ?? null,
    },
    201,
  );
});

// ── DELETE /reports/:id (soft delete) ──
const archiveRoute = createRoute({
  method: "delete",
  path: "/reports/{id}",
  tags: ["Reports"],
  summary: "Archive a progress report (soft delete)",
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
    .update(progressReports)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(progressReports.reportId, id),
        isNull(progressReports.archivedAt),
      ),
    )
    .returning();

  if (!updated) {
    throw new ApiError(404, "NOT_FOUND", "Report not found");
  }

  await insertAuditLog({
    userId: user.userId,
    action: `Archived report ${id}`,
    tableAffected: "progress_reports",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json({ message: "Report archived" }, 200);
});

export default app;
