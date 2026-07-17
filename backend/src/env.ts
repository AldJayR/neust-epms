import { z } from "@hono/zod-openapi";
import "dotenv/config";
import { parseCorsOrigins } from "./lib/cors.js";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	DB_POOL_MAX: z.coerce.number().int().positive().default(20),
	DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
	DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
	SUPABASE_URL: z.string().url(),
	SUPABASE_ANON_KEY: z.string().min(1),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
	SENTRY_DSN: z.string().optional(),
	RESEND_API_KEY: z.string().optional(),
	RESEND_FROM: z.string().optional(),
	SUPABASE_USER_ID: z.string().uuid().optional(),
	ADMIN_EMAIL: z.string().email().optional(),
	CORS_ORIGINS: z.string().optional(),
	// Only trust x-forwarded-for / x-real-ip when behind a trusted reverse proxy
	TRUST_PROXY: z
		.string()
		.optional()
		.default("false")
		.transform((v) => v === "true"),
	PORT: z.coerce.number().default(3000),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("❌ Invalid environment variables:", parsed.error.format());
	process.exit(1);
}

const corsOrigins = (() => {
	try {
		return parseCorsOrigins(parsed.data.CORS_ORIGINS, parsed.data.NODE_ENV);
	} catch (error) {
		console.error("❌ Invalid CORS configuration:", error);
		process.exit(1);
	}
})();

export const env = { ...parsed.data, CORS_ORIGINS: corsOrigins };
