import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { specialOrders } from "../db/schema/special-orders.js";
import { proposalMembers } from "../db/schema/proposal-members.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { insertAuditLog } from "../lib/audit.js";
import { ApiError } from "../lib/errors.js";

const app = new OpenAPIHono<AuthEnv>();

// ── Schemas ──
const SpecialOrderSchema = z
  .object({
    specialOrderId: z.string().uuid(),
    memberId: z.string().uuid(),
    soNumber: z.string(),
    storagePath: z.string().nullable(),
    dateIssued: z.string().nullable(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().nullable(),
  })
  .openapi("SpecialOrder");

const SpecialOrderListSchema = z
  .object({ items: z.array(SpecialOrderSchema) })
  .openapi("SpecialOrderList");

const CreateSpecialOrderSchema = z
  .object({
    memberId: z.string().uuid(),
    soNumber: z.string().min(1),
    dateIssued: z.string().datetime().optional(),
  })
  .openapi("CreateSpecialOrder");

const UpdateSpecialOrderSchema = z
  .object({
    status: z.string().min(1).optional(),
    dateIssued: z.string().datetime().optional(),
  })
  .openapi("UpdateSpecialOrder");

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("SOError");

const MessageSchema = z
  .object({ message: z.string() })
  .openapi("SOMessage");

const ParamId = z.object({
  id: z.string().uuid().openapi({ param: { name: "id", in: "path" } }),
});

app.use("/*", authMiddleware);

// ── GET /special-orders ──
const listRoute = createRoute({
  method: "get",
  path: "/special-orders",
  tags: ["Special Orders"],
  summary: "List all non-archived special orders",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: SpecialOrderListSchema } },
      description: "List of special orders",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const rows = await db
    .select()
    .from(specialOrders)
    .where(isNull(specialOrders.archivedAt));

  const items = rows.map((r) => ({
    ...r,
    dateIssued: r.dateIssued?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    archivedAt: r.archivedAt?.toISOString() ?? null,
  }));

  return c.json({ items }, 200);
});

// ── POST /special-orders ──
const createRoute_ = createRoute({
  method: "post",
  path: "/special-orders",
  tags: ["Special Orders"],
  summary: "Create a special order linked to a proposal member (EC-03)",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateSpecialOrderSchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SpecialOrderSchema } },
      description: "Special order created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Member not found",
    },
  },
});

app.openapi(createRoute_, async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  // EC-03: Verify the member exists (must be in proposal_members)
  const [member] = await db
    .select()
    .from(proposalMembers)
    .where(eq(proposalMembers.memberId, body.memberId))
    .limit(1);

  if (!member) {
    throw new ApiError(
      404,
      "MEMBER_NOT_FOUND",
      "Proposal member not found — special orders must link to proposal_members (EC-03)",
    );
  }

  const [created] = await db
    .insert(specialOrders)
    .values({
      memberId: body.memberId,
      soNumber: body.soNumber,
      dateIssued: body.dateIssued ? new Date(body.dateIssued) : null,
    })
    .returning();

  if (!created) {
    throw new ApiError(500, "INSERT_FAILED", "Failed to create special order");
  }

  await insertAuditLog({
    userId: user.userId,
    action: `Created special order ${created.specialOrderId} for member ${body.memberId}`,
    tableAffected: "special_orders",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json(
    {
      ...created,
      dateIssued: created.dateIssued?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      archivedAt: created.archivedAt?.toISOString() ?? null,
    },
    201,
  );
});

// ── PATCH /special-orders/:id ──
const updateRoute = createRoute({
  method: "patch",
  path: "/special-orders/{id}",
  tags: ["Special Orders"],
  summary: "Update a special order",
  security: [{ Bearer: [] }],
  request: {
    params: ParamId,
    body: {
      content: {
        "application/json": { schema: UpdateSpecialOrderSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SpecialOrderSchema } },
      description: "Updated",
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

  const [updated] = await db
    .update(specialOrders)
    .set({
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.dateIssued !== undefined
        ? { dateIssued: new Date(body.dateIssued) }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(specialOrders.specialOrderId, id),
        isNull(specialOrders.archivedAt),
      ),
    )
    .returning();

  if (!updated) {
    throw new ApiError(404, "NOT_FOUND", "Special order not found");
  }

  return c.json(
    {
      ...updated,
      dateIssued: updated.dateIssued?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      archivedAt: updated.archivedAt?.toISOString() ?? null,
    },
    200,
  );
});

export default app;
