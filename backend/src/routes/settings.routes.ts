import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { systemSettings } from "../db/schema/system-settings.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { insertAuditLog } from "../lib/audit.js";
import {
  cacheEnabled,
  settingsListCache,
  type SettingListCacheValue,
} from "../lib/cache.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { ROLE_NAMES } from "../lib/types.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const SettingSchema = z
  .object({
    settingKey: z.string(),
    settingValue: z.string().nullable(),
    updatedAt: z.string(),
  })
  .openapi("SystemSetting");

const SettingListSchema = z
  .object({ items: z.array(SettingSchema) })
  .openapi("SystemSettingList");

const UpsertSettingSchema = z
  .object({
    settingKey: z.string().min(1),
    settingValue: z.string(),
  })
  .openapi("UpsertSetting");

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("SettingError");

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({
    param: { name: "page", in: "query" },
  }),
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
});

app.use("/*", authMiddleware);

// ── GET /settings ──
const listRoute = createRoute({
  method: "get",
  path: "/settings",
  tags: ["Settings"],
  summary: "List all system settings",
  security: [{ Bearer: [] }],
  request: { query: PaginationQuery },
  responses: {
    200: {
      content: { "application/json": { schema: SettingListSchema } },
      description: "All settings",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;
  const cacheKey = `settings:list:${page}:${limit}`;

  if (cacheEnabled) {
    const cached = settingsListCache.get(cacheKey);
    if (cached) {
      return c.json(cached, 200);
    }
  }

  const rows = await db
    .select()
    .from(systemSettings)
    .orderBy(systemSettings.settingKey)
    .limit(limit)
    .offset(offset);
  const items = rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
  }));
  const payload: SettingListCacheValue = { items };

  if (cacheEnabled) {
    settingsListCache.set(cacheKey, payload);
  }

  return c.json(payload, 200);
});

// ── PUT /settings ──
const upsertRoute = createRoute({
  method: "put",
  path: "/settings",
  tags: ["Settings"],
  summary: "Create or update a system setting (Super Admin only)",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: UpsertSettingSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SettingSchema } },
      description: "Setting upserted",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

app.openapi(upsertRoute, async (c) => {
  const user = c.get("user");

  if (user.roleName !== ROLE_NAMES.SUPER_ADMIN) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Only Super Admin can modify settings",
    );
  }

  const body = c.req.valid("json");

  const [result] = await db
    .insert(systemSettings)
    .values({
      settingKey: body.settingKey,
      settingValue: body.settingValue,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettings.settingKey,
      set: {
        settingValue: body.settingValue,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!result) {
    throw new ApiError(500, "UPSERT_FAILED", "Failed to upsert setting");
  }

  await insertAuditLog({
    userId: user.userId,
    action: `Upserted setting "${body.settingKey}"`,
    tableAffected: "system_settings",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  if (cacheEnabled) {
    settingsListCache.clear();
  }

  return c.json(
    { ...result, updatedAt: result.updatedAt.toISOString() },
    200,
  );
});

export default app;
