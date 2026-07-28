import { eq } from "drizzle-orm";
import { db } from "@/db/client.js";
import { beneficiarySectors } from "@/db/schema/beneficiary-sectors.js";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { extensionServices } from "@/db/schema/extension-services.js";
import { moas } from "@/db/schema/moas.js";
import { partners } from "@/db/schema/partners.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposalBeneficiaries } from "@/db/schema/proposal-beneficiaries.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposalExtensionServices } from "@/db/schema/proposal-extension-services.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposalSdgs } from "@/db/schema/proposal-sdgs.js";
import { proposals } from "@/db/schema/proposals.js";
import { roles } from "@/db/schema/roles.js";
import { sdgs } from "@/db/schema/sdgs.js";
import { specialOrders } from "@/db/schema/special-orders.js";
import { users } from "@/db/schema/users.js";
import {
	ROLE_NAMES,
	type AuthUser,
	PROPOSAL_STATUS,
	PROJECT_STATUS,
} from "@/lib/types.js";

export async function seedOrganization(prefix = "integration") {
	const roleRows = await db
		.insert(roles)
		.values(
			Object.values(ROLE_NAMES).map((roleName) => ({ roleName })),
		)
		.returning();
	const roleByName = new Map(roleRows.map((role) => [role.roleName, role]));

	const [mainCampus] = await db
		.insert(campuses)
		.values({ campusName: `${prefix} Main Campus`, isMainCampus: true })
		.returning();
	const [satelliteCampus] = await db
		.insert(campuses)
		.values({ campusName: `${prefix} Satellite Campus`, isMainCampus: false })
		.returning();
	const [departmentA] = await db
		.insert(departments)
		.values({
			departmentCode: `${prefix.slice(0, 3).toUpperCase()}A`,
			departmentName: `${prefix} Department A`,
		})
		.returning();
	const [departmentB] = await db
		.insert(departments)
		.values({
			departmentCode: `${prefix.slice(0, 3).toUpperCase()}B`,
			departmentName: `${prefix} Department B`,
		})
		.returning();

	return {
		roleByName,
		mainCampus,
		satelliteCampus,
		departmentA,
		departmentB,
	};
}

export async function seedAuthUser(
	organization: Awaited<ReturnType<typeof seedOrganization>>,
	options: {
		slug: string;
		roleName: string;
		campus?: typeof organization.mainCampus;
		department?: typeof organization.departmentA | null;
		firstName?: string;
		lastName?: string;
	},
): Promise<AuthUser> {
	const campus = options.campus ?? organization.mainCampus;
	const department = options.department === undefined
		? organization.departmentA
		: options.department;
	const role = organization.roleByName.get(options.roleName);
	if (!role) throw new Error(`Missing role fixture: ${options.roleName}`);

	const [row] = await db
		.insert(users)
		.values({
			roleId: role.roleId,
			campusId: campus.campusId,
			departmentId: department?.departmentId ?? null,
			firstName: options.firstName ?? options.slug,
			lastName: options.lastName ?? "Integration",
			email: `${options.slug}@integration.neust.edu.ph`,
			isActive: true,
			hasCompletedOnboarding: true,
		})
		.returning();

	return {
		userId: row.userId,
		email: row.email,
		roleId: role.roleId,
		roleName: role.roleName,
		campusId: campus.campusId,
		campusName: campus.campusName,
		isMainCampus: campus.isMainCampus,
		departmentId: department?.departmentId ?? null,
		departmentName: department?.departmentName ?? null,
		firstName: row.firstName,
		middleName: null,
		lastName: row.lastName,
		nameSuffix: null,
		academicRank: null,
		avatarUrl: null,
		isActive: true,
		hasCompletedOnboarding: true,
	};
}

export async function seedProposal(
	organization: Awaited<ReturnType<typeof seedOrganization>>,
	options: {
		title: string;
		status?: string;
		campus?: typeof organization.mainCampus;
		department?: typeof organization.departmentA;
		bypassedRetChair?: boolean;
		targetStartDate?: Date;
		targetEndDate?: Date;
	},
) {
	const [proposal] = await db
		.insert(proposals)
		.values({
			campusId: (options.campus ?? organization.mainCampus).campusId,
			departmentId: (options.department ?? organization.departmentA).departmentId,
			title: options.title,
			bannerProgram: "Integration Program",
			projectLocale: "Cabanatuan City",
			status: options.status ?? PROPOSAL_STATUS.PENDING_REVIEW,
			bypassedRetChair: options.bypassedRetChair ?? false,
			targetStartDate: options.targetStartDate,
			targetEndDate: options.targetEndDate,
		})
		.returning();
	return proposal;
}

export async function seedProposalMember(
	proposalId: string,
	userId: string,
	projectRole: string,
) {
	const [member] = await db
		.insert(proposalMembers)
		.values({ proposalId, userId, projectRole })
		.returning();
	return member;
}

export async function seedProject(
	proposalId: string,
	options: { status?: string; moaId?: string | null } = {},
) {
	const [project] = await db
		.insert(projects)
		.values({
			proposalId,
			projectStatus: options.status ?? PROJECT_STATUS.APPROVED,
			moaId: options.moaId ?? null,
		})
		.returning();
	return project;
}

export async function seedPartnerAndMoa(
	organization: Awaited<ReturnType<typeof seedOrganization>>,
	options: { slug: string; validUntil: Date },
) {
	const [partner] = await db
		.insert(partners)
		.values({
			partnerName: `${options.slug} Partner`,
			partnerType: "Community",
		})
		.returning();
	const [uploader] = await db
		.select({ userId: users.userId })
		.from(users)
		.where(eq(users.roleId, organization.roleByName.get(ROLE_NAMES.DIRECTOR)!.roleId))
		.limit(1);
	const [moa] = await db
		.insert(moas)
		.values({
			partnerId: partner.partnerId,
			validFrom: new Date("2025-01-01T00:00:00.000Z"),
			validUntil: options.validUntil,
			uploadedBy: uploader?.userId ?? null,
		})
		.returning();
	return { partner, moa };
}

export async function seedMilestone(
	projectId: string,
	reportType: string,
	dueAt: Date,
) {
	const [milestone] = await db
		.insert(projectReportingMilestones)
		.values({ projectId, reportType, dueAt })
		.returning();
	return milestone;
}

export async function seedReport(
	projectId: string,
	milestoneId: string,
	submittedById: string,
	options: { reportType: string; storagePath?: string | null; remarks?: string },
) {
	const [report] = await db
		.insert(projectReports)
		.values({
			projectId,
			milestoneId,
			submittedById,
			reportType: options.reportType,
			storagePath: options.storagePath ?? null,
			remarks: options.remarks ?? null,
		})
		.returning();
	return report;
}

export async function seedSpecialOrder(memberId: string, storagePath = "orders/member.pdf") {
	const [order] = await db
		.insert(specialOrders)
		.values({
			memberId,
			soNumber: `SO-${memberId.slice(0, 8)}`,
			storagePath,
			status: "Issued",
		})
		.returning();
	return order;
}

export async function seedProposalRelations(proposalId: string) {
	const [sector] = await db
		.insert(beneficiarySectors)
		.values({ sectorName: "Integration Beneficiaries" })
		.returning();
	const [sdg] = await db
		.insert(sdgs)
		.values({ sdgNumber: 3, sdgTitle: "Good Health and Well-Being" })
		.returning();
const [service] = await db
		.select()
		.from(extensionServices)
		.orderBy(extensionServices.extensionServiceId)
		.limit(1);
	if (!service) throw new Error("Missing extension service fixture");

	await db.insert(proposalDocuments).values({
		proposalId,
		storagePath: "proposals/integration.pdf",
		versionNum: 1,
	});
	await db.insert(proposalBeneficiaries).values({
		proposalId,
		sectorId: sector.sectorId,
	});
	await db.insert(proposalSdgs).values({ proposalId, sdgId: sdg.sdgId });
	await db.insert(proposalExtensionServices).values({
		proposalId,
		extensionServiceId: service.extensionServiceId,
	});
}
