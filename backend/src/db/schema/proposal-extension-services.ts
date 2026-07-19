import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	primaryKey,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { extensionServices } from "./extension-services.js";
import { proposals } from "./proposals.js";

/**
 * Junction table: proposals <-> extension services (many-to-many).
 */
export const proposalExtensionServices = pgTable(
	"proposal_extension_services",
	{
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => proposals.proposalId),
		extensionServiceId: integer("extension_service_id")
			.notNull()
			.references(() => extensionServices.extensionServiceId),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.proposalId, table.extensionServiceId] }),
		proposalIdx: index("proposal_extension_services_proposal_id_idx").on(
			table.proposalId,
		),
		serviceIdx: index("proposal_extension_services_service_id_idx").on(
			table.extensionServiceId,
		),
		activeProposalIdx: index(
			"proposal_extension_services_active_proposal_id_idx",
		)
			.on(table.proposalId)
			.where(sql`${table.archivedAt} IS NULL`),
	}),
);
