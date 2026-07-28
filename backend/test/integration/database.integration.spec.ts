import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { proposals } from "@/db/schema/proposals.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";

describe("PostgreSQL integration harness", () => {
	it("applies migrations and persists a relational proposal record", async () => {
		const [{ roleId }] = await db
			.insert(roles)
			.values({ roleName: "Faculty" })
			.returning({ roleId: roles.roleId });
		const [{ campusId }] = await db
			.insert(campuses)
			.values({ campusName: "Integration Main", isMainCampus: true })
			.returning({ campusId: campuses.campusId });
		const [{ departmentId }] = await db
			.insert(departments)
			.values({
				departmentCode: "INT",
				departmentName: "Integration Department",
			})
			.returning({ departmentId: departments.departmentId });

		await db.insert(users).values({
			roleId,
			campusId,
			departmentId,
			firstName: "Integration",
			lastName: "User",
			email: "integration-user@neust.edu.ph",
		});
		await db.insert(proposals).values({
			campusId,
			departmentId,
			title: "Integration Proposal",
			bannerProgram: "Integration Testing",
			projectLocale: "Cabanatuan City",
		});

		const [result] = await db
			.select({
				title: proposals.title,
				campusName: campuses.campusName,
				departmentName: departments.departmentName,
			})
			.from(proposals)
			.innerJoin(campuses, eq(proposals.campusId, campuses.campusId))
			.innerJoin(
				departments,
				eq(proposals.departmentId, departments.departmentId),
			)
			.where(
				and(
					eq(proposals.title, "Integration Proposal"),
					eq(campuses.campusName, "Integration Main"),
				),
			)
			.limit(1);

		expect(result).toEqual({
			title: "Integration Proposal",
			campusName: "Integration Main",
			departmentName: "Integration Department",
		});
	});

	it("persists sanitized audit values through the real database", async () => {
		const [{ roleId }] = await db
			.insert(roles)
			.values({ roleName: "Super Admin" })
			.returning({ roleId: roles.roleId });
		const [{ campusId }] = await db
			.insert(campuses)
			.values({ campusName: "Audit Integration Main" })
			.returning({ campusId: campuses.campusId });
		const [{ userId }] = await db
			.insert(users)
			.values({
				roleId,
				campusId,
				firstName: "Audit",
				lastName: "User",
				email: "audit-integration@neust.edu.ph",
			})
			.returning({ userId: users.userId });

		await insertAuditLog({
			userId,
			action: "Integration test",
			tableAffected: "users",
			oldValue: { email: "private@example.com", status: "Pending" },
		});

		const [log] = await db
			.select({ oldValue: auditLogs.oldValue })
			.from(auditLogs)
			.where(eq(auditLogs.userId, userId))
			.limit(1);

		expect(log?.oldValue).toEqual({
			email: "[REDACTED]",
			status: "Pending",
		});
	});
});
