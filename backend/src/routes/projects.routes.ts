import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, isNull, or, inArray, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { projects } from "../db/schema/projects.js";
import { proposals } from "../db/schema/proposals.js";
import { moas } from "../db/schema/moas.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { insertAuditLog } from "../lib/audit.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { PROPOSAL_STATUS, PROJECT_STATUS, ROLE_NAMES } from "../lib/types.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const ProjectSchema = z
  .object({
    projectId: z.string().uuid(),
    proposalId: z.string().uuid(),
    moaId: z.string().uuid().nullable(),
    startDate: z.string().nullable(),
    targetEnd: z.string().nullable(),
    projectStatus: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().nullable(),
  })
  .openapi("Project");

const ProjectListSchema = z
  .object({ items: z.array(ProjectSchema), total: z.number() })
  .openapi("ProjectList");

const CreateProjectSchema = z
  .object({
    proposalId: z.string(),
    startDate: z.string().datetime().optional(),
    targetEnd: z.string().datetime().optional(),
  })
  .openapi("CreateProject");

const LinkMoaSchema = z
  .object({ moaId: z.string() })
  .openapi("LinkMoa");

const TransitionSchema = z
  .object({ status: z.enum(["Ongoing", "Completed"]) })
  .openapi("TransitionProject");

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("ProjectError");

const MessageSchema = z
  .object({ message: z.string() })
  .openapi("ProjectMessage");

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

app.use("/*", authMiddleware);

// ── GET /projects ──
const listRoute = createRoute({
  method: "get",
  path: "/projects",
  tags: ["Projects"],
  summary: "List all non-archived projects",
  security: [{ Bearer: [] }],
  request: { query: PaginationQuery },
  responses: {
    200: {
      content: { "application/json": { schema: ProjectListSchema } },
      description: "Project list",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const user = c.get("user");
  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const proposalConditions: SQL[] = [isNull(proposals.archivedAt)];
  
  if (user.roleName === ROLE_NAMES.FACULTY || user.roleName === ROLE_NAMES.RET_CHAIR) {
    if (user.departmentId) {
      proposalConditions.push(
        or(
          eq(proposals.projectLeaderId, user.userId),
          eq(proposals.departmentId, user.departmentId)
        )
      );
    } else {
      proposalConditions.push(
        or(
          eq(proposals.projectLeaderId, user.userId),
          eq(proposals.campusId, user.campusId)
        )
      );
    }
  }

  const allowedProposals = db
    .select({ proposalId: proposals.proposalId })
    .from(proposals)
    .where(and(...proposalConditions));

  const rows = await db
    .select()
    .from(projects)
    .where(and(isNull(projects.archivedAt), inArray(projects.proposalId, allowedProposals)))
    .limit(limit)
    .offset(offset);

  const items = rows.map((r) => ({
    ...r,
    startDate: r.startDate?.toISOString() ?? null,
    targetEnd: r.targetEnd?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    archivedAt: r.archivedAt?.toISOString() ?? null,
  }));

  return c.json({ items, total: items.length }, 200);
});

// ── POST /projects ──
const createProjectRoute = createRoute({
  method: "post",
  path: "/projects",
  tags: ["Projects"],
  summary: "Create a project from an approved proposal",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateProjectSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ProjectSchema } },
      description: "Project created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

app.openapi(createProjectRoute, async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  // Verify proposal is approved
  const [proposal] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.proposalId, body.proposalId))
    .limit(1);

  if (!proposal) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }

  if (proposal.currentStatus !== PROPOSAL_STATUS.APPROVED) {
    throw new ApiError(
      400,
      "NOT_APPROVED",
      "Only approved proposals can become projects",
    );
  }

  // Check if a project already exists for this proposal (1:1)
  const [existing] = await db
    .select()
    .from(projects)
    .where(eq(projects.proposalId, body.proposalId))
    .limit(1);

  if (existing) {
    throw new ApiError(
      409,
      "DUPLICATE",
      "A project already exists for this proposal",
    );
  }

  const [created] = await db
    .insert(projects)
    .values({
      proposalId: body.proposalId,
      startDate: body.startDate ? new Date(body.startDate) : null,
      targetEnd: body.targetEnd ? new Date(body.targetEnd) : null,
    })
    .returning();

  if (!created) {
    throw new ApiError(500, "INSERT_FAILED", "Failed to create project");
  }

  await insertAuditLog({
    userId: user.userId,
    action: `Created project ${created.projectId} from proposal ${body.proposalId}`,
    tableAffected: "projects",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json(
    {
      ...created,
      startDate: created.startDate?.toISOString() ?? null,
      targetEnd: created.targetEnd?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      archivedAt: created.archivedAt?.toISOString() ?? null,
    },
    201,
  );
});

// ── POST /projects/:id/link-moa ──
const linkMoaRoute = createRoute({
  method: "post",
  path: "/projects/{id}/link-moa",
  tags: ["Projects"],
  summary: "Link a MOA to a project (SYS-REQ-04.1)",
  security: [{ Bearer: [] }],
  request: {
    params: ParamId,
    body: {
      content: { "application/json": { schema: LinkMoaSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "MOA linked",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "MOA expired or invalid",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

app.openapi(linkMoaRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.projectId, id), isNull(projects.archivedAt)))
    .limit(1);

  if (!project) {
    throw new ApiError(404, "NOT_FOUND", "Project not found");
  }

  const [moa] = await db
    .select()
    .from(moas)
    .where(and(eq(moas.moaId, body.moaId), isNull(moas.archivedAt)))
    .limit(1);

  if (!moa) {
    throw new ApiError(404, "MOA_NOT_FOUND", "MOA not found");
  }

  if (moa.isExpired) {
    throw new ApiError(400, "MOA_EXPIRED", "Cannot link an expired MOA");
  }

  await db
    .update(projects)
    .set({ moaId: body.moaId, updatedAt: new Date() })
    .where(eq(projects.projectId, id));

  await insertAuditLog({
    userId: user.userId,
    action: `Linked MOA ${body.moaId} to project ${id}`,
    tableAffected: "projects",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json({ message: "MOA linked to project" }, 200);
});

// ── POST /projects/:id/transition ──
const transitionRoute = createRoute({
  method: "post",
  path: "/projects/{id}/transition",
  tags: ["Projects"],
  summary: "Transition project status (requires MOA for Ongoing)",
  security: [{ Bearer: [] }],
  request: {
    params: ParamId,
    body: {
      content: { "application/json": { schema: TransitionSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Status transitioned",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid transition",
    },
  },
});

app.openapi(transitionRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.projectId, id), isNull(projects.archivedAt)))
    .limit(1);

  if (!project) {
    throw new ApiError(404, "NOT_FOUND", "Project not found");
  }

  // SYS-REQ-04.1: Require active MOA to transition to "Ongoing"
  if (body.status === PROJECT_STATUS.ONGOING) {
    if (project.projectStatus !== PROJECT_STATUS.APPROVED) {
      throw new ApiError(
        400,
        "INVALID_TRANSITION",
        "Only Approved projects can transition to Ongoing",
      );
    }

    if (!project.moaId) {
      throw new ApiError(
        400,
        "MOA_REQUIRED",
        "An active MOA must be linked before transitioning to Ongoing (SYS-REQ-04.1)",
      );
    }

    // Verify linked MOA is not expired
    const [moa] = await db
      .select()
      .from(moas)
      .where(eq(moas.moaId, project.moaId))
      .limit(1);

    if (!moa || moa.isExpired) {
      throw new ApiError(
        400,
        "MOA_EXPIRED",
        "The linked MOA is expired. Link a valid MOA first.",
      );
    }
  }

  if (body.status === PROJECT_STATUS.COMPLETED) {
    if (project.projectStatus !== PROJECT_STATUS.ONGOING) {
      throw new ApiError(
        400,
        "INVALID_TRANSITION",
        "Only Ongoing projects can be marked as Completed",
      );
    }
  }

  await db
    .update(projects)
    .set({ projectStatus: body.status, updatedAt: new Date() })
    .where(eq(projects.projectId, id));

  await insertAuditLog({
    userId: user.userId,
    action: `Transitioned project ${id} to ${body.status}`,
    tableAffected: "projects",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json(
    { message: `Project transitioned to ${body.status}` },
    200,
  );
});

export default app;
