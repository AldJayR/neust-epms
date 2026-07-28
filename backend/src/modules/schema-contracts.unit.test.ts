import { describe, expect, it } from "vitest";
import { AdminUsersQuerySchema, ProvisionDirectorSchema } from "./admin/admin.schema.js";
import { ActionItemSchema } from "./action-center/action-center.schema.js";
import { AuditLogSchema } from "./audit/audit.schema.js";
import { MarkReadParamsSchema, OkResponseSchema } from "./notifications/notifications.schema.js";
import { AddMemberSchema, MemberParam } from "./members/members.schema.js";
import { SignedUrlSchema as MoaSignedUrlSchema, UpdateMoaSchema } from "./moas/moas.schema.js";
import { HubProjectSchema, HubQuerySchema } from "./director/director.schema.js";
import { CreateReportSchema } from "./reports/reports.schema.js";
import { UpsertSettingSchema } from "./settings/settings.schema.js";
import { SignedUrlSchema as SpecialOrderSignedUrlSchema } from "./special-orders/special-orders.schema.js";
import { DocumentParam, PresignedUrlSchema } from "./storage/storage.schema.js";

const uuid = "123e4567-e89b-12d3-a456-426614174000";

describe("backend schema contracts", () => {
	it("enforces action-center item enums", () => {
		const result = ActionItemSchema.safeParse({
			id: "proposal-1",
			type: "proposal",
			title: "Proposal",
			status: "Pending Review",
			actionRequired: "Review",
			owner: "RET Chair",
			derivedState: "ACT",
			createdAt: "2026-01-01T00:00:00.000Z",
			urgency: "urgent",
		});

		expect(result.success).toBe(true);
		expect(ActionItemSchema.safeParse({ type: "unknown" }).success).toBe(false);
	});

	it("requires UUID identifiers in audit logs and notification parameters", () => {
		const audit = AuditLogSchema.safeParse({
			logId: uuid,
			userId: uuid,
			action: "Updated user",
			tableAffected: "users",
			oldValue: null,
			newValue: { isActive: true },
			ipAddress: null,
			createdAt: "2026-01-01T00:00:00.000Z",
			actorName: "Admin",
			actorRole: "Super Admin",
		});

		expect(audit.success).toBe(true);
		expect(MarkReadParamsSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
	});

	it("coerces administrator and director query pagination", () => {
		expect(AdminUsersQuerySchema.parse({ page: "2", pageSize: "20" })).toMatchObject({
			page: 2,
			pageSize: 20,
		});
		expect(HubQuerySchema.parse({ limit: "25" })).toMatchObject({
			page: 1,
			limit: 25,
		});
	});

	it("validates provisioning, members, and storage identifiers", () => {
		expect(
			ProvisionDirectorSchema.safeParse({
				firstName: "Director",
				lastName: "User",
				email: "director@neust.edu.ph",
				academicRank: "Professor",
			}).success,
		).toBe(true);
		expect(AddMemberSchema.safeParse({ userId: uuid, projectRole: "" }).success).toBe(false);
		expect(MemberParam.safeParse({ proposalId: uuid, memberId: uuid }).success).toBe(true);
		expect(DocumentParam.safeParse({ proposalId: uuid, documentId: "bad" }).success).toBe(false);
	});

	it("validates report, MOA, and signed URL request shapes", () => {
		expect(
			CreateReportSchema.safeParse({
				milestoneId: uuid,
				reportType: "Terminal",
			}).success,
		).toBe(true);
		expect(UpdateMoaSchema.safeParse({ validUntil: "2026-12-31T00:00:00.000Z" }).success).toBe(true);
		expect(MoaSignedUrlSchema.safeParse({ url: "https://example.com/signed" }).success).toBe(true);
		expect(SpecialOrderSignedUrlSchema.safeParse({ url: "not-a-url" }).success).toBe(false);
		expect(PresignedUrlSchema.safeParse({ url: "https://example.com/signed" }).success).toBe(true);
	});

	it("enforces settings and notification response literals", () => {
		expect(UpsertSettingSchema.safeParse({ settingKey: "", settingValue: "x" }).success).toBe(false);
		expect(OkResponseSchema.safeParse({ ok: true }).success).toBe(true);
		expect(OkResponseSchema.safeParse({ ok: false }).success).toBe(false);
	});

	it("restricts director hub records to proposal or project types", () => {
		const project = {
			id: "project-1",
			title: "Project",
			leaderName: "Faculty User",
			leaderRank: null,
			college: null,
			dateSubmitted: "2026-01-01",
			status: "Ongoing",
			type: "Project",
		};

		expect(HubProjectSchema.safeParse(project).success).toBe(true);
		expect(HubProjectSchema.safeParse({ ...project, type: "Other" }).success).toBe(false);
	});
});
