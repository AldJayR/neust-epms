import postgres from "postgres";
import { afterAll, beforeEach } from "vitest";
import { pool } from "@/db/client.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;

if (!databaseUrl || process.env.DATABASE_URL !== databaseUrl) {
	throw new Error(
		"Integration tests require the disposable INTEGRATION_DATABASE_URL set by test/integration/run.ts",
	);
}

const cleanupClient = postgres(databaseUrl, { max: 1, onnotice: () => {} });

beforeEach(async () => {
	const tableRows = await cleanupClient<{ quotedName: string }[]>`
		SELECT quote_ident(table_name) AS "quotedName"
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_type = 'BASE TABLE'
			AND table_name <> '__drizzle_migrations'
	`;
	if (tableRows.length > 0) {
		await cleanupClient.unsafe(
			`TRUNCATE TABLE ${tableRows.map((row) => row.quotedName).join(", ")} RESTART IDENTITY CASCADE`,
		);
	}
	await cleanupClient`
		INSERT INTO extension_services (service_name)
		VALUES ('Capacity-Building'), ('Technical Assistance'), ('Consultancy Services')
		ON CONFLICT (service_name) DO NOTHING
	`;
});

afterAll(async () => {
	await cleanupClient.end();
	await pool.end();
});
