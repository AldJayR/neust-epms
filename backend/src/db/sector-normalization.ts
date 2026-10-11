import { type SQL, sql } from "drizzle-orm";

export function normalizedSectorLabel(value: SQL): SQL<string> {
	return sql`btrim(regexp_replace(${value}, '[[:space:]]+', ' ', 'g'))`;
}

/** Shared by the generated column and resolver/search parameters. */
export function normalizedSectorKey(value: SQL): SQL<string> {
	return sql`lower(${normalizedSectorLabel(value)})`;
}
