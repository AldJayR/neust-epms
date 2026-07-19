import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

/**
 * Fixed list of extension services offered to project beneficiaries.
 */
export const extensionServices = pgTable("extension_services", {
	extensionServiceId: serial("extension_service_id").primaryKey(),
	serviceName: varchar("service_name", { length: 100 }).notNull().unique(),
});
