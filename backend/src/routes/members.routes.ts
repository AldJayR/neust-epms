import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { count, eq, and, gt } from "drizzle-orm";
import { paginateResults } from "../lib/pagination.js";
import { db } from "../db/client.js";
import { proposalMembers } from "../db/schema/proposal-members.js";
import { proposals } from "../db/schema/proposals.js";
import { users } from "../db/schema/users.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { insertAuditLog } from "../lib/audit.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const MemberSchema = z
  .object({
    memberId: z.string(),
    proposalId: z.string(),
    userId: z.string(),
    projectRole: z.string(),
    addedAt: z.string(),
  })
  .openapi("ProposalMember");

const MemberListSchema = z
  .object({ items: z.array(MemberSchema), total: z.number(), nextCursor: z.string().nullable() })
  .openapi("ProposalMemberList");

const AddMemberSchema = z
  .object({
    userId: z.string(),
    projectRole: z.string().min(1),
  })
  .openapi("AddMember");

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("MemberError");

const MessageSchema = z
  .object({ message: z.string() })
  .openapi("MemberMessage");

const ProposalParam = z.object({
  proposalId: z.string().uuid().openapi({
    param: { name: "proposalId", in: "path" },
  }),
});

const MemberParam = z.object({
  proposalId: z.string().uuid().openapi({
    param: { name: "proposalId", in: "path" },
  }),
  memberId: z.string().uuid().openapi({
    param: { name: "memberId", in: "path" },
  }),
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

// ── GET /proposals/:proposalId/members ──
const listMembersRoute = createRoute({
  method: "get",
  path: "/proposals/{proposalId}/members",
  tags: ["Members"],
  summary: "List members of a proposal",
  security: [{ Bearer: [] }],
  request: { params: ProposalParam, query: PaginationQuery },
  responses: {
    200: {
      content: { "application/json": { schema: MemberListSchema } },
      description: "List of members",
    },
  },
});

app.openapi(listMembersRoute, async (c) => {
  const { proposalId } = c.req.valid("param");
  const { limit, cursor } = c.req.valid("query");

  const whereConditions = [eq(proposalMembers.proposalId, proposalId)];
  if (cursor) {
    whereConditions.push(gt(proposalMembers.addedAt, new Date(cursor)));
  }

  const rows = await db
    .select({ memberId: proposalMembers.memberId, proposalId: proposalMembers.proposalId, userId: proposalMembers.userId, projectRole: proposalMembers.projectRole, addedAt: proposalMembers.addedAt })
    .from(proposalMembers)
    .where(and(...whereConditions))
    .orderBy(proposalMembers.addedAt)
    .limit(limit + 1);

  const [totalResult] = await db
    .select({ value: count() })
    .from(proposalMembers)
    .where(and(...whereConditions));

  const { items: rawItems, nextCursor } = paginateResults(rows, limit, "addedAt");

  const items = rawItems.map((r) => ({
    ...r,
    addedAt: r.addedAt.toISOString(),
  }));

  return c.json({ items, total: Number(totalResult?.value ?? 0), nextCursor }, 200);
});

// ── POST /proposals/:proposalId/members ──
const addMemberRoute = createRoute({
  method: "post",
  path: "/proposals/{proposalId}/members",
  tags: ["Members"],
  summary: "Add a member to a proposal",
  security: [{ Bearer: [] }],
  request: {
    params: ProposalParam,
    body: {
      content: { "application/json": { schema: AddMemberSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: MemberSchema } },
      description: "Member added",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Proposal or user not found",
    },
  },
});

app.openapi(addMemberRoute, async (c) => {
  const authUser = c.get("user");
  const { proposalId } = c.req.valid("param");
  const body = c.req.valid("json");

  const created = await db.transaction(async (tx) => {
    // Verify proposal exists
    const [proposal] = await tx
      .select({ projectLeaderId: proposals.projectLeaderId })
      .from(proposals)
      .where(eq(proposals.proposalId, proposalId))
      .limit(1);

    if (!proposal) {
      throw new ApiError(404, "NOT_FOUND", "Proposal not found");
    }

    // Only the project leader can add members
    if (proposal.projectLeaderId !== authUser.userId) {
      throw new ApiError(
        403,
        "NOT_LEADER",
        "Only the project leader can add members",
      );
    }

    // Verify target user exists
    const [targetUser] = await tx
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.userId, body.userId))
      .limit(1);

    if (!targetUser) {
      throw new ApiError(404, "USER_NOT_FOUND", "Target user not found");
    }

    // Prevent duplicate membership
    const [existingMember] = await tx
      .select({ memberId: proposalMembers.memberId })
      .from(proposalMembers)
      .where(
        and(
          eq(proposalMembers.proposalId, proposalId),
          eq(proposalMembers.userId, body.userId),
        ),
      )
      .limit(1);

    if (existingMember) {
      throw new ApiError(409, "DUPLICATE", "User is already a member");
    }

    const [createdMember] = await tx
      .insert(proposalMembers)
      .values({
        proposalId,
        userId: body.userId,
        projectRole: body.projectRole,
      })
      .returning();

    if (!createdMember) {
      throw new ApiError(500, "INSERT_FAILED", "Failed to add member");
    }

    await insertAuditLog({
      userId: authUser.userId,
      action: `Added member ${body.userId} to proposal ${proposalId}`,
      tableAffected: "proposal_members",
      ipAddress: c.req.header("x-forwarded-for") ?? null,
    }, tx);

    return createdMember;
  });

  return c.json(
    { ...created, addedAt: created.addedAt.toISOString() },
    201,
  );
});

// ── DELETE /proposals/:proposalId/members/:memberId ──
const removeMemberRoute = createRoute({
  method: "delete",
  path: "/proposals/{proposalId}/members/{memberId}",
  tags: ["Members"],
  summary: "Remove a member from a proposal",
  security: [{ Bearer: [] }],
  request: { params: MemberParam },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Member removed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

app.openapi(removeMemberRoute, async (c) => {
  const authUser = c.get("user");
  const { proposalId, memberId } = c.req.valid("param");

  await db.transaction(async (tx) => {
    // Verify proposal and leadership
    const [proposal] = await tx
      .select({ projectLeaderId: proposals.projectLeaderId })
      .from(proposals)
      .where(eq(proposals.proposalId, proposalId))
      .limit(1);

    if (!proposal) {
      throw new ApiError(404, "NOT_FOUND", "Proposal not found");
    }

    if (proposal.projectLeaderId !== authUser.userId) {
      throw new ApiError(
        403,
        "NOT_LEADER",
        "Only the project leader can remove members",
      );
    }

    const [deleted] = await tx
      .delete(proposalMembers)
      .where(
        and(
          eq(proposalMembers.memberId, memberId),
          eq(proposalMembers.proposalId, proposalId),
        ),
      )
      .returning();

    if (!deleted) {
      throw new ApiError(404, "MEMBER_NOT_FOUND", "Member not found");
    }

    await insertAuditLog({
      userId: authUser.userId,
      action: `Removed member ${memberId} from proposal ${proposalId}`,
      tableAffected: "proposal_members",
      ipAddress: c.req.header("x-forwarded-for") ?? null,
    }, tx);
  });

  return c.json({ message: "Member removed" }, 200);
});

export default app;
