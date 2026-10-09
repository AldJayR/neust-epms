import { OpenAPIHono } from "@hono/zod-openapi";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { proposals } from "@/db/schema/proposals.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { projects } from "@/db/schema/projects.js";
import { eq } from "drizzle-orm";
import { installApiErrorHandler } from "@/lib/errors.js";
import type { AuthEnv } from "@/middleware/auth.js";
import { getFacultyDashboard, getPeriodMetadata } from "@/modules/dashboard/dashboard.service.js";
import { getDashboardStats, getHubProjects } from "@/modules/director/director.service.js";
import { listProjects } from "@/modules/projects/projects.service.js";
import proposalRoutes from "@/modules/proposals/crud.routes.js";
import { seedAuthUser, seedOrganization, seedProject, seedProposal, seedProposalMember } from "./fixtures.js";

describe("scheduled-period dashboards", () => {
	it("includes cross-year periods, scopes metadata, and excludes undated drafts from year totals", async () => {
		const org = await seedOrganization("period-scope");
		const faculty = await seedAuthUser(org, { slug: "period-faculty", roleName: "Faculty" });
		const other = await seedAuthUser(org, { slug: "period-other", roleName: "Faculty" });
		const chair = await seedAuthUser(org, { slug: "period-chair", roleName: "RET Chair" });
		const director = await seedAuthUser(org, { slug: "period-director", roleName: "Director", department: null });
		const spanning = await seedProposal(org, { title: "Spans two years", status: "Institutionally Approved", targetStartDate: new Date("2025-11-01T00:00:00+08:00"), targetEndDate: new Date("2026-03-31T00:00:00+08:00") });
		await seedProposalMember(spanning.proposalId, faculty.userId, "Project Leader");
		await seedProject(spanning.proposalId, { status: "Ongoing" });
		const older = await seedProposal(org, { title: "Older period", targetStartDate: new Date("2024-01-01T00:00:00+08:00"), targetEndDate: new Date("2024-12-31T00:00:00+08:00") });
		await seedProposalMember(older.proposalId, faculty.userId, "Project Leader");
		const undated = await seedProposal(org, { title: "Undated draft", status: "Draft" });
		const partial = await seedProposal(org, { title: "Partial draft", status: "Draft", targetStartDate: new Date("2026-06-01T00:00:00+08:00") });
		for (const proposal of [undated, partial]) await seedProposalMember(proposal.proposalId, faculty.userId, "Project Leader");
		const otherDraft = await seedProposal(org, { title: "Another faculty's draft", status: "Draft" });
		await seedProposalMember(otherDraft.proposalId, other.userId, "Project Leader");
		const chairDraft = await seedProposal(org, { title: "Chair's draft", status: "Draft" });
		await seedProposalMember(chairDraft.proposalId, chair.userId, "Project Leader");
		const hidden = await seedProposal(org, { title: "Other department future period", department: org.departmentB, targetStartDate: new Date("2040-01-01T00:00:00+08:00"), targetEndDate: new Date("2041-01-01T00:00:00+08:00") });
		await seedProposalMember(hidden.proposalId, faculty.userId, "Project Leader");
		const archivedProposal = await seedProposal(org, { title: "Archived linked project", targetStartDate: new Date("2026-01-01T00:00:00+08:00"), targetEndDate: new Date("2026-12-31T00:00:00+08:00") });
		await seedProposalMember(archivedProposal.proposalId, faculty.userId, "Project Leader");
		const archivedProject = await seedProject(archivedProposal.proposalId);
		await db.update(projects).set({ archivedAt: new Date() }).where(eq(projects.projectId, archivedProject.projectId));

		const summary = await getFacultyDashboard(faculty, { year: 2026, page: 1, limit: 10 });
		expect(summary.items.map((item) => item.proposalId)).toEqual([spanning.proposalId]);
		expect(summary.metrics).toEqual({ totalSubmissions: 1, ongoingProjects: 1, proposals: 0 });
		expect(summary.availableYears).not.toContain(2040);
		expect((await listProjects(faculty, { year: 2025, page: 1, limit: 10 })).items).toHaveLength(1);
		const ownHub = await getHubProjects({ page: 1, limit: 10, myProjectsOnly: "true" }, chair);
		expect(ownHub.items.map((item) => item.id)).toEqual([chairDraft.proposalId]);
		expect((await getPeriodMetadata(chair)).availableYears).not.toContain(2040);
		const directorSummary = await getDashboardStats(director, 2026);
		expect(directorSummary.metrics.totalProjects).toBe(1);
		expect(directorSummary.metrics.underEvaluation).toBe(0);
		expect(directorSummary.chartMonths).toHaveLength(12);
		expect(directorSummary.chartMonths[0]).toBe("2026-01");
		expect(directorSummary.chartData.map((item) => item.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
		expect(directorSummary.chartData.every((item) => item.value === 1)).toBe(true);
		const app = new OpenAPIHono<AuthEnv>();
		app.use("*", async (c, next) => { c.set("user", chair); await next(); });
		app.route("/", proposalRoutes);
		installApiErrorHandler(app);
		const stats = await app.request("/proposals/ret/dashboard-stats?year=2026");
		expect(stats.status).toBe(200);
		expect(await stats.json()).toMatchObject({ approvedProjects: 1 });
		const table = await app.request("/proposals?year=2026&page=1&limit=10");
		expect((await table.json()).items.map((item: { proposalId: string }) => item.proposalId)).toEqual([spanning.proposalId]);
	});

	it("uses Manila boundaries and inclusive scheduled end dates", async () => {
		const org = await seedOrganization("period-boundaries");
		const faculty = await seedAuthUser(org, { slug: "boundary-faculty", roleName: "Faculty" });
		const dates = [
			["Begins on New Year", "2026-01-01", "2026-01-02"],
			["Ends on New Year", "2025-12-31", "2026-01-01"],
			["Next year", "2027-01-01", "2027-01-02"],
		] as const;
		for (const [title, start, end] of dates) {
			const proposal = await seedProposal(org, { title, targetStartDate: new Date(`${start}T00:00:00+08:00`), targetEndDate: new Date(`${end}T00:00:00+08:00`) });
			await seedProposalMember(proposal.proposalId, faculty.userId, "Project Leader");
		}
		const year = await getFacultyDashboard(faculty, { year: 2026, page: 1, limit: 10 });
		expect(year.total).toBe(2);
		expect(new Set(year.items.map((item) => item.title))).toEqual(new Set(["Begins on New Year", "Ends on New Year"]));
		expect((await getFacultyDashboard(faculty, { year: 2025, page: 1, limit: 10 })).total).toBe(1);
	});

	it("computes complete totals and paginates past the previous 100-record cap", async () => {
		const org = await seedOrganization("period-pagination");
		const faculty = await seedAuthUser(org, { slug: "pagination-faculty", roleName: "Faculty" });
		const rows = await db.insert(proposals).values(Array.from({ length: 102 }, (_, index) => ({
			campusId: org.mainCampus.campusId, departmentId: org.departmentA.departmentId, title: `Scheduled proposal ${index}`, projectLocale: "Test", status: "Draft",
			targetStartDate: new Date("2026-01-01T00:00:00+08:00"), targetEndDate: new Date("2026-12-31T00:00:00+08:00"),
		}))).returning({ proposalId: proposals.proposalId });
		await db.insert(proposalMembers).values(rows.map((row) => ({ proposalId: row.proposalId, userId: faculty.userId, projectRole: "Project Leader" })));
		const page = await getFacultyDashboard(faculty, { year: 2026, page: 11, limit: 10 });
		expect(page.metrics.totalSubmissions).toBe(102);
		expect(page.metrics.proposals).toBe(102);
		expect(page.total).toBe(102);
		expect(page.items).toHaveLength(2);
	});
});
