import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, isNull, desc, or, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { proposals } from "../db/schema/proposals.js";
import { proposalDepartments } from "../db/schema/proposal-departments.js";
import { proposalBeneficiaries } from "../db/schema/proposal-beneficiaries.js";
import { proposalSdgs } from "../db/schema/proposal-sdgs.js";
import { proposalReviews } from "../db/schema/proposal-reviews.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { insertAuditLog } from "../lib/audit.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import {
  ROLE_NAMES,
  PROPOSAL_STATUS,
  REVIEW_STAGE,
  REVIEW_DECISION,
} from "../lib/types.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const ProposalSchema = z
  .object({
    proposalId: z.string().uuid(),
    projectLeaderId: z.string().uuid(),
    campusId: z.number(),
    departmentId: z.number(),
    title: z.string(),
    bannerProgram: z.string(),
    projectLocale: z.string(),
    extensionCategory: z.string(),
    extensionAgenda: z.string(),
    budgetPartner: z.string().nullable(),
    budgetNeust: z.string().nullable(),
    currentStatus: z.string(),
    revisionNum: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().nullable(),
  })
  .openapi("Proposal");

const ProposalListSchema = z
  .object({ items: z.array(ProposalSchema), total: z.number() })
  .openapi("ProposalList");

const CreateProposalSchema = z
  .object({
    campusId: z.number().int().positive(),
    departmentId: z.number().int().positive(),
    title: z.string().min(1),
    bannerProgram: z.string().min(1),
    projectLocale: z.string().min(1),
    extensionCategory: z.string().min(1),
    extensionAgenda: z.string().min(1),
    budgetPartner: z.coerce.number().nonnegative().finite().optional(),
    budgetNeust: z.coerce.number().nonnegative().finite().optional(),
    departmentIds: z.array(z.number().int().positive()).optional(),
    sectorIds: z.array(z.number().int().positive()).optional(),
    sdgIds: z.array(z.number().int().positive()).optional(),
  })
  .openapi("CreateProposal");

const UpdateProposalSchema = z
  .object({
    title: z.string().min(1).optional(),
    bannerProgram: z.string().min(1).optional(),
    projectLocale: z.string().min(1).optional(),
    extensionCategory: z.string().min(1).optional(),
    extensionAgenda: z.string().min(1).optional(),
    budgetPartner: z.coerce.number().nonnegative().finite().optional(),
    budgetNeust: z.coerce.number().nonnegative().finite().optional(),
  })
  .openapi("UpdateProposal");

const ReviewProposalSchema = z
  .object({
    decision: z.enum([
      REVIEW_DECISION.ENDORSED,
      REVIEW_DECISION.APPROVED,
      REVIEW_DECISION.RETURNED,
      REVIEW_DECISION.REJECTED,
    ]),
    comments: z.string().optional(),
  })
  .openapi("ReviewProposal");

const ParamId = z.object({
  id: z.string().uuid().openapi({ param: { name: "id", in: "path" } }),
});

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
  .openapi("ProposalError");

const MessageSchema = z
  .object({ message: z.string() })
  .openapi("ProposalMessage");

// All proposal routes require auth
app.use("/*", authMiddleware);

// ── GET /proposals ──
const listRoute = createRoute({
  method: "get",
  path: "/proposals",
  tags: ["Proposals"],
  summary: "List all non-archived proposals",
  security: [{ Bearer: [] }],
  request: { query: PaginationQuery },
  responses: {
    200: {
      content: { "application/json": { schema: ProposalListSchema } },
      description: "List of proposals",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const user = c.get("user");
  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const whereConditions: SQL[] = [isNull(proposals.archivedAt)];
  
  if (user.roleName === ROLE_NAMES.FACULTY || user.roleName === ROLE_NAMES.RET_CHAIR) {
    if (user.departmentId) {
      whereConditions.push(
        or(
          eq(proposals.projectLeaderId, user.userId),
          eq(proposals.departmentId, user.departmentId)
        )
      );
    } else {
      whereConditions.push(
        or(
          eq(proposals.projectLeaderId, user.userId),
          eq(proposals.campusId, user.campusId)
        )
      );
    }
  }

  const rows = await db
    .select()
    .from(proposals)
    .where(and(...whereConditions))
    .orderBy(desc(proposals.createdAt))
    .limit(limit)
    .offset(offset);

  const items = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    archivedAt: r.archivedAt?.toISOString() ?? null,
  }));

  return c.json({ items, total: items.length }, 200);
});

// ── GET /proposals/:id ──
const getRoute = createRoute({
  method: "get",
  path: "/proposals/{id}",
  tags: ["Proposals"],
  summary: "Get a proposal by ID",
  security: [{ Bearer: [] }],
  request: { params: ParamId },
  responses: {
    200: {
      content: { "application/json": { schema: ProposalSchema } },
      description: "Proposal detail",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

app.openapi(getRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const whereConditions: SQL[] = [eq(proposals.proposalId, id), isNull(proposals.archivedAt)];

  if (user.roleName === ROLE_NAMES.FACULTY || user.roleName === ROLE_NAMES.RET_CHAIR) {
    if (user.departmentId) {
      whereConditions.push(
        or(
          eq(proposals.projectLeaderId, user.userId),
          eq(proposals.departmentId, user.departmentId)
        )
      );
    } else {
      whereConditions.push(
        or(
          eq(proposals.projectLeaderId, user.userId),
          eq(proposals.campusId, user.campusId)
        )
      );
    }
  }

  const [row] = await db
    .select()
    .from(proposals)
    .where(and(...whereConditions))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }

  return c.json(
    {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      archivedAt: row.archivedAt?.toISOString() ?? null,
    },
    200,
  );
});

// ── POST /proposals ──
const createProposalRoute = createRoute({
  method: "post",
  path: "/proposals",
  tags: ["Proposals"],
  summary: "Create a new proposal with optional departments, beneficiaries, and SDGs",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateProposalSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ProposalSchema } },
      description: "Proposal created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

app.openapi(createProposalRoute, async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const created = await db.transaction(async (tx) => {
    const [proposal] = await tx
      .insert(proposals)
      .values({
        projectLeaderId: user.userId,
        campusId: body.campusId,
        departmentId: body.departmentId,
        title: body.title,
        bannerProgram: body.bannerProgram,
        projectLocale: body.projectLocale,
        extensionCategory: body.extensionCategory,
        extensionAgenda: body.extensionAgenda,
        budgetPartner: (body.budgetPartner ?? 0).toFixed(2),
        budgetNeust: (body.budgetNeust ?? 0).toFixed(2),
      })
      .returning();

    if (!proposal) {
      throw new ApiError(500, "INSERT_FAILED", "Failed to create proposal");
    }

    // Insert collaborating departments
    if (body.departmentIds && body.departmentIds.length > 0) {
      await tx.insert(proposalDepartments).values(
        body.departmentIds.map((deptId) => ({
          proposalId: proposal.proposalId,
          departmentId: deptId,
        })),
      );
    }

    // Insert beneficiary sectors
    if (body.sectorIds && body.sectorIds.length > 0) {
      await tx.insert(proposalBeneficiaries).values(
        body.sectorIds.map((sectorId) => ({
          proposalId: proposal.proposalId,
          sectorId,
        })),
      );
    }

    // Insert SDG alignments
    if (body.sdgIds && body.sdgIds.length > 0) {
      await tx.insert(proposalSdgs).values(
        body.sdgIds.map((sdgId) => ({
          proposalId: proposal.proposalId,
          sdgId,
        })),
      );
    }

    return proposal;
  });

  await insertAuditLog({
    userId: user.userId,
    action: `Created proposal ${created.proposalId}`,
    tableAffected: "proposals",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json(
    {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      archivedAt: created.archivedAt?.toISOString() ?? null,
    },
    201,
  );
});

// ── PATCH /proposals/:id ──
const updateRoute = createRoute({
  method: "patch",
  path: "/proposals/{id}",
  tags: ["Proposals"],
  summary: "Update a proposal (Draft or Returned only)",
  security: [{ Bearer: [] }],
  request: {
    params: ParamId,
    body: {
      content: { "application/json": { schema: UpdateProposalSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ProposalSchema } },
      description: "Proposal updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

app.openapi(updateRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }

  if (
    existing.currentStatus !== PROPOSAL_STATUS.DRAFT &&
    existing.currentStatus !== PROPOSAL_STATUS.RETURNED
  ) {
    throw new ApiError(
      400,
      "INVALID_STATUS",
      "Only Draft or Returned proposals can be updated",
    );
  }

  if (existing.projectLeaderId !== user.userId) {
    throw new ApiError(
      403,
      "NOT_LEADER",
      "Only the project leader can update a proposal",
    );
  }

  const updateValues = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.bannerProgram !== undefined
      ? { bannerProgram: body.bannerProgram }
      : {}),
    ...(body.projectLocale !== undefined
      ? { projectLocale: body.projectLocale }
      : {}),
    ...(body.extensionCategory !== undefined
      ? { extensionCategory: body.extensionCategory }
      : {}),
    ...(body.extensionAgenda !== undefined
      ? { extensionAgenda: body.extensionAgenda }
      : {}),
    ...(body.budgetPartner !== undefined
      ? { budgetPartner: body.budgetPartner.toFixed(2) }
      : {}),
    ...(body.budgetNeust !== undefined
      ? { budgetNeust: body.budgetNeust.toFixed(2) }
      : {}),
    updatedAt: new Date(),
  };

  const [updated] = await db
    .update(proposals)
    .set(updateValues)
    .where(eq(proposals.proposalId, id))
    .returning();

  if (!updated) {
    throw new ApiError(500, "UPDATE_FAILED", "Failed to update proposal");
  }

  return c.json(
    {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      archivedAt: updated.archivedAt?.toISOString() ?? null,
    },
    200,
  );
});

// ── POST /proposals/:id/submit ──
const submitRoute = createRoute({
  method: "post",
  path: "/proposals/{id}/submit",
  tags: ["Proposals"],
  summary: "Submit a draft proposal for endorsement",
  security: [{ Bearer: [] }],
  request: { params: ParamId },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Proposal submitted",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid state transition",
    },
  },
});

app.openapi(submitRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const [existing] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }

  if (
    existing.currentStatus !== PROPOSAL_STATUS.DRAFT &&
    existing.currentStatus !== PROPOSAL_STATUS.RETURNED
  ) {
    throw new ApiError(
      400,
      "INVALID_STATUS",
      "Only Draft or Returned proposals can be submitted",
    );
  }

  if (existing.projectLeaderId !== user.userId) {
    throw new ApiError(403, "NOT_LEADER", "Only the project leader can submit");
  }

  await db
    .update(proposals)
    .set({
      currentStatus: PROPOSAL_STATUS.SUBMITTED,
      updatedAt: new Date(),
    })
    .where(eq(proposals.proposalId, id));

  await insertAuditLog({
    userId: user.userId,
    action: `Submitted proposal ${id}`,
    tableAffected: "proposals",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json({ message: "Proposal submitted for endorsement" }, 200);
});

// ── POST /proposals/:id/review ──
const reviewRoute = createRoute({
  method: "post",
  path: "/proposals/{id}/review",
  tags: ["Proposals"],
  summary: "Endorse or Approve a proposal (RET Chair / Director)",
  description:
    "EC-01: Prevents conflict of interest. EC-05: Stacked rejections preserved.",
  security: [{ Bearer: [] }],
  request: {
    params: ParamId,
    body: {
      content: { "application/json": { schema: ReviewProposalSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Review recorded",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid transition",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Conflict of interest or wrong role",
    },
  },
});

app.openapi(reviewRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }

  // EC-01: Conflict of interest — reviewer cannot be the project leader
  if (existing.projectLeaderId === user.userId) {
    throw new ApiError(
      403,
      "CONFLICT_OF_INTEREST",
      "You cannot review your own proposal (EC-01)",
    );
  }

  // Determine the review stage and validate role/status
  let reviewStage: string;
  let newStatus: string;

  if (
    user.roleName === ROLE_NAMES.RET_CHAIR &&
    existing.currentStatus === PROPOSAL_STATUS.SUBMITTED
  ) {
    reviewStage = REVIEW_STAGE.ENDORSEMENT;
    if (body.decision === REVIEW_DECISION.ENDORSED) {
      newStatus = PROPOSAL_STATUS.ENDORSED;
    } else if (body.decision === REVIEW_DECISION.RETURNED) {
      newStatus = PROPOSAL_STATUS.RETURNED;
    } else if (body.decision === REVIEW_DECISION.REJECTED) {
      newStatus = PROPOSAL_STATUS.REJECTED;
    } else {
      throw new ApiError(
        400,
        "INVALID_DECISION",
        "RET Chair can only Endorse, Return, or Reject at this stage",
      );
    }
  } else if (
    user.roleName === ROLE_NAMES.DIRECTOR &&
    existing.currentStatus === PROPOSAL_STATUS.ENDORSED
  ) {
    // SYS-REQ-02.3: Director can only approve after endorsement
    reviewStage = REVIEW_STAGE.APPROVAL;
    if (body.decision === REVIEW_DECISION.APPROVED) {
      newStatus = PROPOSAL_STATUS.APPROVED;
    } else if (body.decision === REVIEW_DECISION.RETURNED) {
      newStatus = PROPOSAL_STATUS.RETURNED;
    } else if (body.decision === REVIEW_DECISION.REJECTED) {
      newStatus = PROPOSAL_STATUS.REJECTED;
    } else {
      throw new ApiError(
        400,
        "INVALID_DECISION",
        "Director can only Approve, Return, or Reject at this stage",
      );
    }
  } else {
    throw new ApiError(
      400,
      "INVALID_STATE",
      "Cannot review proposal in its current state with your role",
    );
  }

  // EC-04: When returned, increment revision number (docs are preserved)
  const revisionIncrement =
    newStatus === PROPOSAL_STATUS.RETURNED ? 1 : 0;

  await db.transaction(async (tx) => {
    // EC-05: Always insert a new review entry (never overwrite)
    await tx.insert(proposalReviews).values({
      proposalId: id,
      reviewerId: user.userId,
      reviewStage,
      decision: body.decision,
      comments: body.comments ?? null,
    });

    await tx
      .update(proposals)
      .set({
        currentStatus: newStatus,
        revisionNum: existing.revisionNum + revisionIncrement,
        updatedAt: new Date(),
      })
      .where(eq(proposals.proposalId, id));
  });

  await insertAuditLog({
    userId: user.userId,
    action: `Reviewed proposal ${id}: ${body.decision}`,
    tableAffected: "proposal_reviews",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json({ message: `Proposal ${body.decision.toLowerCase()}` }, 200);
});

// ── DELETE /proposals/:id (soft delete) ──
const archiveRoute = createRoute({
  method: "delete",
  path: "/proposals/{id}",
  tags: ["Proposals"],
  summary: "Archive a proposal (soft delete per RA 9470)",
  security: [{ Bearer: [] }],
  request: { params: ParamId },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Proposal archived",
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

  const [existing] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }

  await db
    .update(proposals)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(proposals.proposalId, id));

  await insertAuditLog({
    userId: user.userId,
    action: `Archived proposal ${id}`,
    tableAffected: "proposals",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json({ message: "Proposal archived" }, 200);
});

export default app;
