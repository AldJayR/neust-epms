import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { MOCK_USERS } from "../../../test/helpers.js";
import { buildReportObligationScope } from "./action-center.service.js";

describe("getActionItemsForRole", () => {
	it("scopes faculty report obligations to projects they lead", async () => {
		const query = new PgDialect().sqlToQuery(
			buildReportObligationScope(MOCK_USERS.faculty.userId),
		);

		expect(query.sql).toContain('"proposal_members"."project_role"');
		expect(query.params).toContain(MOCK_USERS.faculty.userId);
		expect(query.params).toContain("Project Leader");
	});
});
