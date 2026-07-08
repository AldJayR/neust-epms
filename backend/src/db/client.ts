import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env.js";
import * as relations from "./relations.js";
import * as schema from "./schema/index.js";

// Transaction pooler (port 6543) does not support prepared statements
const client = postgres(env.DATABASE_URL, {
	prepare: false,
	max: env.DB_POOL_MAX,
	idle_timeout: env.DB_IDLE_TIMEOUT_MS / 1000,
	connect_timeout: env.DB_CONNECTION_TIMEOUT_MS / 1000,
});

export const db = drizzle(client, {
	schema: { ...schema, ...relations },
});
