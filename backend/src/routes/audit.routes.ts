import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/audit-logs.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { ROLE_NAMES } from "../lib/types.js";

const app = new OpenAPIHono<AuthEnv>();

// ── Schemas ──
const AuditLogSchema = z
  .object({
    logId: z.string().uuid(),
    userId: z.string().uuid(),
    action: z.string(),
    tableAffected: z.string(),
    ipAddress: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("AuditLog");

const AuditLogListSchema = z
  .object({ items: z.array(AuditLogSchema), total: z.number() })
  .openapi("AuditLogList");

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({
    param: { name: "page", in: "query" },
  }),
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
});

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("AuditError");

app.use("/*", authMiddleware);

// ── GET /audit-logs ──
const listRoute = createRoute({
  method: "get",
  path: "/audit-logs",
  tags: ["Audit"],
  summary: "List audit logs (Super Admin only)",
  security: [{ Bearer: [] }],
  request: { query: PaginationQuery },
  responses: {
    200: {
      content: { "application/json": { schema: AuditLogListSchema } },
      description: "Paginated audit logs",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const user = c.get("user");

  if (user.roleName !== ROLE_NAMES.SUPER_ADMIN) {
    return c.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Only Super Admin can view audit logs",
        },
      },
      403,
    );
  }

  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const items = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return c.json({ items, total: items.length }, 200);
});

export default app;
