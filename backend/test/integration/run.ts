import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function main(): Promise<void> {
	const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
	if (!databaseUrl) {
		throw new Error(
			"Set INTEGRATION_DATABASE_URL to a dedicated local PostgreSQL database before running integration tests",
		);
	}

	const applicationUrl = process.env.DATABASE_URL;
	if (!applicationUrl) {
		throw new Error(
			"DATABASE_URL must be set so integration tests can verify they are not targeting the application database",
		);
	}

	const integrationTarget = normalizeDatabaseTarget(databaseUrl, true);
	const applicationTarget = normalizeDatabaseTarget(applicationUrl, false);

	if (integrationTarget === applicationTarget) {
		throw new Error(
			"INTEGRATION_DATABASE_URL must not be the application's DATABASE_URL",
		);
	}

	await applyMigrations(databaseUrl);
	process.exitCode = await runVitest(databaseUrl);
}

async function applyMigrations(databaseUrl: string): Promise<void> {
	const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
	try {
		await migrate(drizzle(client), {
			migrationsFolder: path.join(backendRoot, "drizzle"),
		});
	} finally {
		await client.end();
	}
}

async function runVitest(databaseUrl: string): Promise<number> {
	const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
	const child = spawn(
		command,
		["exec", "vitest", "run", "--config", "vitest.integration.config.ts"],
		{
			cwd: backendRoot,
			env: {
				...process.env,
				DATABASE_URL: databaseUrl,
				INTEGRATION_DATABASE_URL: databaseUrl,
				DB_POOL_MAX: "5",
				DB_IDLE_TIMEOUT_MS: "1000",
				DB_CONNECTION_TIMEOUT_MS: "5000",
				SUPABASE_URL: "http://127.0.0.1:54321",
				SUPABASE_ANON_KEY: "integration-anon-key",
				SUPABASE_SERVICE_ROLE_KEY: "integration-service-role-key",
				SENTRY_DSN: "",
				RESEND_API_KEY: "",
				RESEND_FROM: "integration@neust.edu.ph",
				CORS_ORIGINS: "http://localhost:3001",
				NODE_ENV: "test",
				PORT: "3000",
			},
			stdio: "inherit",
			shell: process.platform === "win32",
			windowsHide: true,
		},
	);

	return new Promise((resolve, reject) => {
		child.once("error", reject);
		child.once("exit", (code) => resolve(code ?? 1));
	});
}

function normalizeDatabaseTarget(
	databaseUrl: string,
	requireLocal: boolean,
): string {
	const parsed = new URL(databaseUrl);
	const host = parsed.hostname.toLowerCase();
	const normalizedHost = host === "localhost" ? "127.0.0.1" : host;
	if (requireLocal && !new Set(["127.0.0.1", "::1"]).has(normalizedHost)) {
		throw new Error(
			"INTEGRATION_DATABASE_URL must point to a local PostgreSQL server",
		);
	}

	return `${normalizedHost}:${parsed.port || "5432"}/${parsed.pathname.replace(/^\/+/, "")}`;
}

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
