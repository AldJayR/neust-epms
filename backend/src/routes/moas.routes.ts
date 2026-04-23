import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { moas } from "../db/schema/moas.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { insertAuditLog } from "../lib/audit.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { ROLE_NAMES } from "../lib/types.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const MoaSchema = z
  .object({
    moaId: z.string(),
    partnerName: z.string(),
    partnerType: z.string(),
    storagePath: z.string().nullable(),
    validFrom: z.string(),
    validUntil: z.string(),
    isExpired: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().nullable(),
  })
  .openapi("Moa");

const MoaListSchema = z
  .object({ items: z.array(MoaSchema), total: z.number() })
  .openapi("MoaList");

const CreateMoaSchema = z
  .object({
    partnerName: z.string().min(1),
    partnerType: z.string().min(1),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime(),
  })
  .openapi("CreateMoa");

const UpdateMoaSchema = z
  .object({
    partnerName: z.string().min(1).optional(),
    partnerType: z.string().min(1).optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
  })
  .openapi("UpdateMoa");

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("MoaError");

const MessageSchema = z
  .object({ message: z.string() })
  .openapi("MoaMessage");

const ParamId = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

app.use("/*", authMiddleware);

// ── GET /moas ──
const listRoute = createRoute({
  method: "get",
  path: "/moas",
  tags: ["MOAs"],
  summary: "List all non-archived MOAs",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: MoaListSchema } },
      description: "List of MOAs",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const rows = await db
    .select()
    .from(moas)
    .where(isNull(moas.archivedAt))
    .orderBy(desc(moas.validUntil));

  const items = rows.map((r) => ({
    ...r,
    validFrom: r.validFrom.toISOString(),
    validUntil: r.validUntil.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    archivedAt: r.archivedAt?.toISOString() ?? null,
  }));

  return c.json({ items, total: items.length }, 200);
});

// ── GET /moas/:id ──
const getRoute = createRoute({
  method: "get",
  path: "/moas/{id}",
  tags: ["MOAs"],
  summary: "Get a MOA by ID",
  security: [{ Bearer: [] }],
  request: { params: ParamId },
  responses: {
    200: {
      content: { "application/json": { schema: MoaSchema } },
      description: "MOA detail",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

app.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [row] = await db
    .select()
    .from(moas)
    .where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "NOT_FOUND", "MOA not found");
  }

  return c.json(
    {
      ...row,
      validFrom: row.validFrom.toISOString(),
      validUntil: row.validUntil.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      archivedAt: row.archivedAt?.toISOString() ?? null,
    },
    200,
  );
});

// ── POST /moas ──
const createMoaRoute = createRoute({
  method: "post",
  path: "/moas",
  tags: ["MOAs"],
  summary: "Create a new MOA",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateMoaSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: MoaSchema } },
      description: "MOA created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

app.openapi(createMoaRoute, async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const validFrom = new Date(body.validFrom);
  const validUntil = new Date(body.validUntil);

  if (validUntil <= validFrom) {
    throw new ApiError(
      400,
      "INVALID_DATES",
      "validUntil must be after validFrom",
    );
  }

  const [created] = await db
    .insert(moas)
    .values({
      partnerName: body.partnerName,
      partnerType: body.partnerType,
      validFrom,
      validUntil,
      isExpired: validUntil < new Date(),
    })
    .returning();

  if (!created) {
    throw new ApiError(500, "INSERT_FAILED", "Failed to create MOA");
  }

  await insertAuditLog({
    userId: user.userId,
    action: `Created MOA ${created.moaId}`,
    tableAffected: "moas",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json(
    {
      ...created,
      validFrom: created.validFrom.toISOString(),
      validUntil: created.validUntil.toISOString(),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      archivedAt: created.archivedAt?.toISOString() ?? null,
    },
    201,
  );
});

// ── PATCH /moas/:id ──
const updateRoute = createRoute({
  method: "patch",
  path: "/moas/{id}",
  tags: ["MOAs"],
  summary: "Update a MOA",
  security: [{ Bearer: [] }],
  request: {
    params: ParamId,
    body: {
      content: { "application/json": { schema: UpdateMoaSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MoaSchema } },
      description: "MOA updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

app.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const setValues: Record<string, Date | string> = { updatedAt: new Date() };
  if (body.partnerName !== undefined)
    setValues["partnerName"] = body.partnerName;
  if (body.partnerType !== undefined)
    setValues["partnerType"] = body.partnerType;
  if (body.validFrom !== undefined)
    setValues["validFrom"] = new Date(body.validFrom);
  if (body.validUntil !== undefined)
    setValues["validUntil"] = new Date(body.validUntil);

  const [updated] = await db
    .update(moas)
    .set(setValues)
    .where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
    .returning();

  if (!updated) {
    throw new ApiError(404, "NOT_FOUND", "MOA not found");
  }

  return c.json(
    {
      ...updated,
      validFrom: updated.validFrom.toISOString(),
      validUntil: updated.validUntil.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      archivedAt: updated.archivedAt?.toISOString() ?? null,
    },
    200,
  );
});

export default app;
