import { createHash, randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { reportAttachments } from "@/db/schema/report-attachments.js";
import { finalizeTerminalPackage } from "@/modules/reports/terminal-package.js";
import { closeProject } from "@/modules/projects/projects.service.js";
import { createReport } from "@/modules/reports/reports.service.js";
import { PROJECT_STATUS, PROPOSAL_STATUS, REPORT_TYPE, ROLE_NAMES } from "@/lib/types.js";
import {
	seedAuthUser,
	seedMilestone,
	seedOrganization,
	seedProject,
	seedProposal,
	seedProposalMember,
	seedReport,
} from "./fixtures.js";

const storage = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/supabase.js", () => ({ supabase: { storage: { from: () => storage } } }));
vi.mock("@/lib/notification.helpers.js", () => ({
	createNotification: vi.fn().mockResolvedValue(undefined),
	getUserIdsByRole: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => {
	storage.upload.mockReset().mockResolvedValue({ error: null });
	storage.remove.mockReset().mockResolvedValue({ error: null });
});

function signedFile(content = "%PDF-1.4\nsigned terminal report") {
	return new File([content], "signed-terminal.pdf", { type: "application/pdf" });
}

describe("report and project closure integration", () => {
	it("creates a report draft only for an active project member", async () => {
		const organization = await seedOrganization("report-draft");
		const leader = await seedAuthUser(organization, {
			slug: "report-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const outsider = await seedAuthUser(organization, {
			slug: "report-outsider",
			roleName: ROLE_NAMES.FACULTY,
		});
		const proposal = await seedProposal(organization, {
			title: "Report Draft Proposal",
			status: PROPOSAL_STATUS.APPROVED,
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
		});
		const milestone = await seedMilestone(
			project.projectId,
			REPORT_TYPE.PROGRESS,
			new Date("2099-06-01T00:00:00.000Z"),
		);

		const report = await createReport(
			leader,
			{ milestoneId: milestone.milestoneId, reportType: REPORT_TYPE.PROGRESS },
			"127.0.0.1",
		);

		expect(report).toMatchObject({
			reportId: expect.any(String),
			projectId: project.projectId,
			reportType: REPORT_TYPE.PROGRESS,
			storagePath: null,
		});
		await expect(
			createReport(
				outsider,
				{ milestoneId: milestone.milestoneId, reportType: REPORT_TYPE.PROGRESS },
				"127.0.0.1",
			),
		).rejects.toMatchObject({ code: "NOT_MEMBER" });
	});

	it("requires a complete unified terminal package before Director closure", async () => {
		const organization = await seedOrganization("report-close");
		const leader = await seedAuthUser(organization, {
			slug: "close-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const director = await seedAuthUser(organization, {
			slug: "close-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Closure Proposal",
			status: PROPOSAL_STATUS.APPROVED,
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
		});
		const closureMilestone = await seedMilestone(
			project.projectId,
			"Terminal Report",
			new Date("2099-12-01T00:00:00.000Z"),
		);

		const report = await seedReport(project.projectId, closureMilestone.milestoneId, leader.userId, {
			reportType: REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL,
			storagePath: "reports/terminal.pdf",
		});
		await expect(
			closeProject(project.projectId, director, signedFile(), "127.0.0.1"),
		).rejects.toMatchObject({ code: "INVALID_STATE" });

		await db.update(projectReports).set({ traineeCount: 0 }).where(eq(projectReports.reportId, report.reportId));
		await db.insert(reportAttachments).values({ reportId: report.reportId, attachmentType: "Evaluation Forms", storagePath: "reports/evaluation.pdf" });
		await db.transaction((tx) => finalizeTerminalPackage(tx, report.reportId, leader, "127.0.0.1"));

		const [pending] = await db.select().from(projects).where(eq(projects.projectId, project.projectId));
		expect(pending.projectStatus).toBe(PROJECT_STATUS.PENDING_CLOSURE);
		expect(pending.signedTerminalReportDocPath).toBeNull();
		await expect(closeProject(project.projectId, director, undefined as never, "127.0.0.1"))
			.rejects.toMatchObject({ code: "MISSING_SIGNED_TERMINAL_REPORT" });
		await expect(closeProject(project.projectId, leader, signedFile(), "127.0.0.1"))
			.rejects.toMatchObject({ code: "FORBIDDEN" });

		// An audit failure must roll back the file reference, completion date, and closed state.
		await expect(closeProject(project.projectId, { ...director, userId: randomUUID() }, signedFile(), "127.0.0.1"))
			.rejects.toThrow();
		const [rolledBack] = await db.select().from(projects).where(eq(projects.projectId, project.projectId));
		expect(rolledBack).toMatchObject({
			projectStatus: PROJECT_STATUS.PENDING_CLOSURE,
			actualEndDate: null,
			signedTerminalReportDocPath: null,
			signedTerminalReportHash: null,
		});

		const attempts = await Promise.allSettled([
			closeProject(project.projectId, director, signedFile(), "127.0.0.1"),
			closeProject(project.projectId, director, signedFile(), "127.0.0.1"),
		]);
		expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
		expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);

		const [savedProject] = await db
			.select()
			.from(projects)
			.where(eq(projects.projectId, project.projectId));
		const [auditCount] = await db
			.select({ value: count() })
			.from(auditLogs)
			.where(eq(auditLogs.userId, director.userId));

		expect(savedProject?.projectStatus).toBe(PROJECT_STATUS.CLOSED);
		expect(savedProject?.actualEndDate).toBeInstanceOf(Date);
		expect(savedProject?.signedTerminalReportDocPath).toContain(`projects/${project.projectId}/signed-terminal-report_`);
		expect(savedProject?.signedTerminalReportHash).toBe(createHash("sha256").update("%PDF-1.4\nsigned terminal report").digest("hex"));
		expect(Number(auditCount?.value)).toBe(1);
		expect(storage.remove).toHaveBeenCalled();
		expect(storage.remove.mock.calls.flat(2)).not.toContain(savedProject.signedTerminalReportDocPath);
		const [savedReport] = await db.select().from(projectReports).where(eq(projectReports.reportId, report.reportId));
		expect(savedReport.storagePath).toBe("reports/terminal.pdf");
	}, 90_000);
});
