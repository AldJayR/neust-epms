import { and } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { MOCK_USERS } from "../../../test/helpers.js";
import {
	buildOverdueReportConditions,
	buildReportObligationScope,
} from "./action-center.service.js";

describe("getActionItemsForRole", () => {
	it("scopes faculty report obligations to projects they lead", async () => {
		const query = new PgDialect().sqlToQuery(
			buildReportObligationScope(MOCK_USERS.faculty.userId),
		);

		expect(query.sql).toContain('"proposal_members"."project_role"');
		expect(query.params).toContain(MOCK_USERS.faculty.userId);
		expect(query.params).toContain("Project Leader");
	});

	it("counts only incomplete reporting milestones on active or overdue projects", () => {
		const conditions = buildOverdueReportConditions(
			new Date("2026-01-15T00:00:00.000Z"),
		);
		const query = new PgDialect().sqlToQuery(and(...conditions)!);

		expect(query.sql).toContain('"project_reporting_milestones"."completed_at" is null');
		expect(query.params).toContain("Ongoing");
		expect(query.params).toContain("Overdue");
		expect(query.params).toContain("2026-01-15T00:00:00.000Z");
	});
});
