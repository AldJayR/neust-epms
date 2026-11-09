import { createHash } from "node:crypto";
import "dotenv/config";
import { and, eq, ilike, inArray } from "drizzle-orm";
import { db, pool } from "@/db/client.js";
import { bannerPrograms } from "@/db/schema/banner-programs.js";
import { beneficiarySectors } from "@/db/schema/beneficiary-sectors.js";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { extensionServices } from "@/db/schema/extension-services.js";
import { moas } from "@/db/schema/moas.js";
import { partners } from "@/db/schema/partners.js";
import { projectMilestones } from "@/db/schema/project-milestones.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projects } from "@/db/schema/projects.js";
import { proposalBeneficiaries } from "@/db/schema/proposal-beneficiaries.js";
import { proposalDepartments } from "@/db/schema/proposal-departments.js";
import { proposalExtensionServices } from "@/db/schema/proposal-extension-services.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposalSdgs } from "@/db/schema/proposal-sdgs.js";
import { proposals } from "@/db/schema/proposals.js";
import { roles } from "@/db/schema/roles.js";
import { sdgs } from "@/db/schema/sdgs.js";
import { users } from "@/db/schema/users.js";
import { ROLE_NAMES } from "@/lib/types.js";

function demoUuid(key: string) {
	const hash = createHash("sha256").update(key).digest("hex");
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function date(value: string) {
	return new Date(`${value}T08:00:00.000Z`);
}

const demoUsers = [
	{
		key: "maria",
		firstName: "Maria",
		middleName: "L.",
		lastName: "Santos",
		email: "maria.santos@demo.neust.edu.ph",
		campusName: "Sumacab Campus",
		departmentCode: "CICT",
		academicRank: "Assistant Professor III",
	},
	{
		key: "paulo",
		firstName: "Paulo",
		middleName: "R.",
		lastName: "Garcia",
		email: "paulo.garcia@demo.neust.edu.ph",
		campusName: "General Tinio Street Campus",
		departmentCode: "CICT",
		academicRank: "Instructor II",
	},
	{
		key: "grace",
		firstName: "Grace",
		middleName: "M.",
		lastName: "Mendoza",
		email: "grace.mendoza@demo.neust.edu.ph",
		campusName: "Sumacab Campus",
		departmentCode: "CAS",
		academicRank: "Associate Professor I",
	},
	{
		key: "liza",
		firstName: "Liza",
		middleName: "A.",
		lastName: "Navarro",
		email: "liza.navarro@demo.neust.edu.ph",
		campusName: "Gabaldon Campus",
		departmentCode: "CAS",
		academicRank: "Instructor III",
	},
	{
		key: "ana",
		firstName: "Ana",
		middleName: "C.",
		lastName: "Reyes",
		email: "ana.reyes@demo.neust.edu.ph",
		campusName: "General Tinio Street Campus",
		departmentCode: "CMBT",
		academicRank: "Assistant Professor II",
	},
	{
		key: "mark",
		firstName: "Mark",
		middleName: "D.",
		lastName: "Villanueva",
		email: "mark.villanueva@demo.neust.edu.ph",
		campusName: "General Tinio Street Campus",
		departmentCode: "COED",
		academicRank: "Assistant Professor I",
	},
	{
		key: "juan",
		firstName: "Juan",
		middleName: "P.",
		lastName: "Dela Cruz",
		email: "juan.delacruz@demo.neust.edu.ph",
		campusName: "General Tinio Street Campus",
		departmentCode: "COE",
		academicRank: "Instructor I",
	},
] as const;

const demoBannerPrograms = [
	{
		key: "itCares",
		campusName: "Sumacab Campus",
		departmentCode: "CICT",
		programCode: "IT CARES",
		programName:
			"IT CARES - Information Technology for Community Outreach, Academic, and Research Collaboration in Education and Support Services to the Community",
	},
	{
		key: "cses",
		campusName: "Sumacab Campus",
		departmentCode: "CAS",
		programCode: "CSES",
		programName: "Community Science and Environmental Stewardship Program",
	},
	{
		key: "gcep",
		campusName: "Gabaldon Campus",
		departmentCode: "CAS",
		programCode: "GCEP",
		programName: "Gabaldon Coastal and Environmental Protection Program",
	},
	{
		key: "kkp",
		campusName: "General Tinio Street Campus",
		departmentCode: "CMBT",
		programCode: "KKP",
		programName: "Kabuhayan at Kaalaman Program",
	},
	{
		key: "bmlsp",
		campusName: "General Tinio Street Campus",
		departmentCode: "COED",
		programCode: "BMLSP",
		programName: "Batang Matatag Learning Support Program",
	},
	{
		key: "bdhp",
		campusName: "General Tinio Street Campus",
		departmentCode: "CICT",
		programCode: "BDHP",
		programName: "Barangay Digital Health Program",
	},
] as const;

const demoPartners = [
	{
		key: "sanJuan",
		partnerName: "Barangay San Juan Council",
		partnerType: "Local Government Unit",
	},
	{
		key: "sumacabFarmers",
		partnerName: "Sumacab Farmers Association",
		partnerType: "Community Organization",
	},
	{
		key: "gtCooperative",
		partnerName: "General Tinio Community Cooperative",
		partnerType: "Cooperative",
	},
] as const;

const demoMoas = [
	{
		key: "sanJuan",
		partnerKey: "sanJuan",
		validFrom: "2025-01-15",
		validUntil: "2028-01-14",
	},
	{
		key: "sumacabFarmers",
		partnerKey: "sumacabFarmers",
		validFrom: "2025-03-01",
		validUntil: "2028-02-29",
	},
	{
		key: "gtCooperative",
		partnerKey: "gtCooperative",
		validFrom: "2025-06-01",
		validUntil: "2028-05-31",
	},
] as const;

const demoProposals = [
	{
		key: "digitalLiteracy",
		title:
			"Community-Based Digital Literacy and Cybersecurity Program for Barangay San Juan",
		status: "Institutionally Approved",
		campusName: "Sumacab Campus",
		departmentCode: "CICT",
		bannerKey: "itCares",
		projectLocale: "Barangay San Juan, Cabanatuan City",
		budgetPartner: "85000.00",
		budgetNeust: "120000.00",
		targetStartDate: "2026-01-10",
		targetEndDate: "2027-01-09",
		createdAt: "2025-10-06",
		institutionalApprovedAt: "2026-01-05",
		project: {
			status: "Ongoing",
			moaKey: "sanJuan",
			createdAt: "2026-01-08",
		},
		members: [
			{
				userKey: "maria",
				projectRole: "Project Leader",
				specificRole: "Program Manager",
			},
			{
				userKey: "paulo",
				projectRole: "Team Leader",
				specificRole: "ICT Training Coordinator",
			},
			{
				userKey: "ana",
				projectRole: "Project Member",
				specificRole: "Monitoring and Evaluation Officer",
			},
		],
		sectors: ["Out-of-School Youth", "Women"],
		sdgNumbers: [4, 10],
		services: ["Capacity-Building", "Technical Assistance"],
		reportingMilestones: [
			{
				title: "Month 3 Progress Report",
				reportType: "Progress",
				dueAt: "2026-04-30",
				completedAt: "2026-04-24",
			},
			{
				title: "Month 6 Progress Report",
				reportType: "Progress",
				dueAt: "2026-07-31",
				completedAt: "2026-07-28",
			},
			{
				title: "Month 9 Progress Report",
				reportType: "Progress",
				dueAt: "2026-10-31",
				completedAt: null,
			},
			{
				title: "Terminal Report",
				reportType: "Terminal Report",
				dueAt: "2027-01-09",
				completedAt: null,
			},
		],
	},
	{
		key: "waterQuality",
		title:
			"Water Quality Monitoring and Safe Water Handling Training for Sumacab Farmers",
		status: "Institutionally Approved",
		campusName: "Sumacab Campus",
		departmentCode: "CAS",
		bannerKey: "cses",
		projectLocale: "Sumacab East, Cabanatuan City",
		budgetPartner: "65000.00",
		budgetNeust: "95000.00",
		targetStartDate: "2026-02-01",
		targetEndDate: "2027-01-31",
		createdAt: "2025-11-03",
		institutionalApprovedAt: "2026-01-27",
		project: {
			status: "Ongoing",
			moaKey: "sumacabFarmers",
			createdAt: "2026-01-30",
		},
		members: [
			{
				userKey: "grace",
				projectRole: "Project Leader",
				specificRole: "Project Director",
			},
			{
				userKey: "liza",
				projectRole: "Team Leader",
				specificRole: "Water Quality Specialist",
			},
			{
				userKey: "maria",
				projectRole: "Project Member",
				specificRole: "Community Engagement Officer",
			},
		],
		sectors: ["Farmers", "Barangay Health Workers"],
		sdgNumbers: [6, 11],
		services: ["Technical Assistance", "Consultancy Services"],
		reportingMilestones: [
			{
				title: "Month 3 Progress Report",
				reportType: "Progress",
				dueAt: "2026-05-31",
				completedAt: "2026-05-27",
			},
			{
				title: "Month 6 Progress Report",
				reportType: "Progress",
				dueAt: "2026-08-31",
				completedAt: "2026-08-26",
			},
			{
				title: "Month 9 Progress Report",
				reportType: "Progress",
				dueAt: "2026-11-30",
				completedAt: null,
			},
			{
				title: "Terminal Report",
				reportType: "Terminal Report",
				dueAt: "2027-01-31",
				completedAt: null,
			},
		],
	},
	{
		key: "coastalCleanup",
		title:
			"Coastal Clean-Up and Solid Waste Segregation Training for Gabaldon Fisherfolk",
		status: "Institutionally Approved",
		campusName: "Gabaldon Campus",
		departmentCode: "CAS",
		bannerKey: "gcep",
		projectLocale: "Coastal Barangays, Gabaldon",
		budgetPartner: "72000.00",
		budgetNeust: "88000.00",
		targetStartDate: "2025-11-15",
		targetEndDate: "2026-08-31",
		createdAt: "2025-08-12",
		institutionalApprovedAt: "2025-11-03",
		project: {
			status: "Overdue",
			moaKey: "sanJuan",
			createdAt: "2025-11-10",
		},
		members: [
			{
				userKey: "liza",
				projectRole: "Project Leader",
				specificRole: "Project Manager",
			},
			{
				userKey: "grace",
				projectRole: "Team Leader",
				specificRole: "Environmental Science Lead",
			},
			{
				userKey: "juan",
				projectRole: "Project Member",
				specificRole: "Field Operations Officer",
			},
		],
		sectors: ["Fisherfolk", "Women"],
		sdgNumbers: [13, 14],
		services: ["Capacity-Building", "Technical Assistance"],
		reportingMilestones: [
			{
				title: "Month 3 Progress Report",
				reportType: "Progress",
				dueAt: "2026-02-28",
				completedAt: null,
			},
			{
				title: "Month 6 Progress Report",
				reportType: "Progress",
				dueAt: "2026-05-31",
				completedAt: null,
			},
			{
				title: "Terminal Report",
				reportType: "Terminal Report",
				dueAt: "2026-08-31",
				completedAt: null,
			},
		],
	},
	{
		key: "livelihood",
		title:
			"Livelihood and Financial Literacy Program for Women in General Tinio",
		status: "Institutionally Approved",
		campusName: "General Tinio Street Campus",
		departmentCode: "CMBT",
		bannerKey: "kkp",
		projectLocale: "Barangay Poblacion, General Tinio",
		budgetPartner: "125000.00",
		budgetNeust: "140000.00",
		targetStartDate: "2025-10-01",
		targetEndDate: "2026-10-31",
		createdAt: "2025-07-18",
		institutionalApprovedAt: "2025-09-22",
		project: {
			status: "Pending Completion",
			moaKey: "gtCooperative",
			createdAt: "2025-09-26",
		},
		members: [
			{
				userKey: "ana",
				projectRole: "Project Leader",
				specificRole: "Project Director",
			},
			{
				userKey: "mark",
				projectRole: "Team Leader",
				specificRole: "Livelihood Training Lead",
			},
			{
				userKey: "maria",
				projectRole: "Project Member",
				specificRole: "Financial Literacy Trainer",
			},
		],
		sectors: ["Women", "Persons with Disabilities"],
		sdgNumbers: [1, 8],
		services: ["Capacity-Building", "Consultancy Services"],
		reportingMilestones: [
			{
				title: "Month 3 Progress Report",
				reportType: "Progress",
				dueAt: "2025-12-31",
				completedAt: "2025-12-20",
			},
			{
				title: "Month 6 Progress Report",
				reportType: "Progress",
				dueAt: "2026-03-31",
				completedAt: "2026-03-25",
			},
			{
				title: "Month 9 Progress Report",
				reportType: "Progress",
				dueAt: "2026-06-30",
				completedAt: "2026-06-27",
			},
			{
				title: "Project Closure Report",
				reportType: "Project Closure",
				dueAt: "2026-10-31",
				completedAt: null,
			},
		],
	},
	{
		key: "stemTutoring",
		title:
			"STEM Tutoring and Robotics Workshop for Senior High School Students",
		status: "Institutionally Approved",
		campusName: "General Tinio Street Campus",
		departmentCode: "COED",
		bannerKey: "bmlsp",
		projectLocale: "General Tinio National High School",
		budgetPartner: "55000.00",
		budgetNeust: "76000.00",
		targetStartDate: "2026-01-15",
		targetEndDate: "2026-09-30",
		createdAt: "2025-10-15",
		institutionalApprovedAt: "2026-01-09",
		project: {
			status: "Completed",
			moaKey: "gtCooperative",
			createdAt: "2026-01-12",
			actualEndDate: "2026-09-28",
		},
		members: [
			{
				userKey: "mark",
				projectRole: "Project Leader",
				specificRole: "Program Coordinator",
			},
			{
				userKey: "juan",
				projectRole: "Team Leader",
				specificRole: "Robotics Facilitator",
			},
			{
				userKey: "grace",
				projectRole: "Project Member",
				specificRole: "Learning Assessment Officer",
			},
		],
		sectors: ["Out-of-School Youth", "Women"],
		sdgNumbers: [4, 9],
		services: ["Capacity-Building", "Technical Assistance"],
		reportingMilestones: [
			{
				title: "Month 3 Progress Report",
				reportType: "Progress",
				dueAt: "2026-04-30",
				completedAt: "2026-04-25",
			},
			{
				title: "Month 6 Progress Report",
				reportType: "Progress",
				dueAt: "2026-07-31",
				completedAt: "2026-07-24",
			},
			{
				title: "Terminal Report",
				reportType: "Terminal Report",
				dueAt: "2026-09-30",
				completedAt: "2026-09-28",
			},
		],
	},
	{
		key: "recordsDigitization",
		title:
			"Barangay Records Digitization and Staff Training for Barangay San Juan",
		status: "Endorsed",
		campusName: "General Tinio Street Campus",
		departmentCode: "CICT",
		bannerKey: "bdhp",
		projectLocale: "Barangay San Juan, Cabanatuan City",
		budgetPartner: "48000.00",
		budgetNeust: "62000.00",
		targetStartDate: "2026-12-01",
		targetEndDate: "2027-11-30",
		createdAt: "2026-09-14",
		institutionalApprovedAt: null,
		project: null,
		members: [
			{
				userKey: "paulo",
				projectRole: "Project Leader",
				specificRole: "Project Manager",
			},
			{
				userKey: "maria",
				projectRole: "Team Leader",
				specificRole: "Records Management Lead",
			},
			{
				userKey: "ana",
				projectRole: "Project Member",
				specificRole: "Training Officer",
			},
		],
		sectors: ["Barangay Health Workers", "Senior Citizens"],
		sdgNumbers: [10, 16],
		services: ["Capacity-Building", "Technical Assistance"],
		reportingMilestones: [],
	},
	{
		key: "healthInformation",
		title: "Barangay Health Information System Planning for Rural Health Unit",
		status: "Pending Review",
		campusName: "General Tinio Street Campus",
		departmentCode: "CICT",
		bannerKey: "bdhp",
		projectLocale: "Rural Health Unit, General Tinio",
		budgetPartner: "39000.00",
		budgetNeust: "58000.00",
		targetStartDate: "2027-01-15",
		targetEndDate: "2028-01-14",
		createdAt: "2026-10-21",
		institutionalApprovedAt: null,
		project: null,
		members: [
			{
				userKey: "paulo",
				projectRole: "Project Leader",
				specificRole: "Project Manager",
			},
			{
				userKey: "maria",
				projectRole: "Project Member",
				specificRole: "Health Information Analyst",
			},
		],
		sectors: ["Barangay Health Workers", "Women"],
		sdgNumbers: [3, 10],
		services: ["Technical Assistance"],
		reportingMilestones: [],
	},
] as const;

const sectorNames = [
	"Barangay Health Workers",
	"Farmers",
	"Fisherfolk",
	"Out-of-School Youth",
	"Persons with Disabilities",
	"Senior Citizens",
	"Women",
];

async function main() {
	console.log("Seeding demo data...");

	for (const roleName of Object.values(ROLE_NAMES)) {
		await db.insert(roles).values({ roleName }).onConflictDoNothing();
	}

	const roleRows = await db.select().from(roles);
	const roleMap = new Map(roleRows.map((role) => [role.roleName, role.roleId]));
	const facultyRoleId = roleMap.get(ROLE_NAMES.FACULTY);
	if (!facultyRoleId) throw new Error("Faculty role not found");

	const campusRows = await db.select().from(campuses);
	const campusMap = new Map(
		campusRows.map((campus) => [campus.campusName, campus.campusId]),
	);
	const departmentRows = await db.select().from(departments);
	const departmentMap = new Map(
		departmentRows.map((department) => [
			department.departmentCode,
			department.departmentId,
		]),
	);

	const campusId = (name: string) => {
		const id = campusMap.get(name);
		if (!id) throw new Error(`Missing campus: ${name}`);
		return id;
	};
	const departmentId = (code: string) => {
		const id = departmentMap.get(code);
		if (!id) throw new Error(`Missing department: ${code}`);
		return id;
	};

	const userIds = new Map<string, string>();
	for (const demoUser of demoUsers) {
		const userId = demoUuid(`user:${demoUser.key}`);
		userIds.set(demoUser.key, userId);
		await db
			.insert(users)
			.values({
				userId,
				roleId: facultyRoleId,
				campusId: campusId(demoUser.campusName),
				departmentId: departmentId(demoUser.departmentCode),
				firstName: demoUser.firstName,
				middleName: demoUser.middleName,
				lastName: demoUser.lastName,
				email: demoUser.email,
				academicRank: demoUser.academicRank,
				isActive: true,
				hasCompletedOnboarding: true,
			})
			.onConflictDoUpdate({
				target: users.userId,
				set: {
					roleId: facultyRoleId,
					campusId: campusId(demoUser.campusName),
					departmentId: departmentId(demoUser.departmentCode),
					firstName: demoUser.firstName,
					middleName: demoUser.middleName,
					lastName: demoUser.lastName,
					email: demoUser.email,
					academicRank: demoUser.academicRank,
					isActive: true,
					hasCompletedOnboarding: true,
				},
			});
	}

	const bannerProgramIds = new Map<string, number>();
	for (const program of demoBannerPrograms) {
		const scopeCampusId = campusId(program.campusName);
		const scopeDepartmentId = departmentId(program.departmentCode);
		const [existing] = await db
			.select({ id: bannerPrograms.bannerProgramId })
			.from(bannerPrograms)
			.where(
				and(
					eq(bannerPrograms.campusId, scopeCampusId),
					eq(bannerPrograms.departmentId, scopeDepartmentId),
					ilike(bannerPrograms.programName, program.programName),
				),
			)
			.limit(1);

		let programId = existing?.id;
		if (!programId) {
			const [created] = await db
				.insert(bannerPrograms)
				.values({
					programCode: program.programCode,
					programName: program.programName,
					campusId: scopeCampusId,
					departmentId: scopeDepartmentId,
					isActive: true,
				})
				.onConflictDoNothing()
				.returning({ id: bannerPrograms.bannerProgramId });
			programId = created?.id;
		}
		if (!programId) {
			const [created] = await db
				.select({ id: bannerPrograms.bannerProgramId })
				.from(bannerPrograms)
				.where(
					and(
						eq(bannerPrograms.campusId, scopeCampusId),
						eq(bannerPrograms.departmentId, scopeDepartmentId),
						ilike(bannerPrograms.programName, program.programName),
					),
				)
				.limit(1);
			programId = created?.id;
		}
		if (!programId)
			throw new Error(`Failed to seed banner program: ${program.programName}`);
		bannerProgramIds.set(program.key, programId);
	}

	const serviceRows = await db
		.select()
		.from(extensionServices)
		.where(
			inArray(extensionServices.serviceName, [
				"Capacity-Building",
				"Technical Assistance",
				"Consultancy Services",
			]),
		);
	const serviceMap = new Map(
		serviceRows.map((service) => [
			service.serviceName,
			service.extensionServiceId,
		]),
	);

	const sdgRows = await db.select().from(sdgs);
	const sdgMap = new Map(sdgRows.map((sdg) => [sdg.sdgNumber, sdg.sdgId]));

	for (const sectorName of sectorNames) {
		await db
			.insert(beneficiarySectors)
			.values({ sectorName })
			.onConflictDoNothing();
	}
	const sectorRows = await db
		.select()
		.from(beneficiarySectors)
		.where(inArray(beneficiarySectors.sectorName, sectorNames));
	const sectorMap = new Map(
		sectorRows.map((sector) => [sector.sectorName, sector.sectorId]),
	);

	const partnerIds = new Map<string, string>();
	for (const partner of demoPartners) {
		const partnerId = demoUuid(`partner:${partner.key}`);
		partnerIds.set(partner.key, partnerId);
		await db
			.insert(partners)
			.values({
				partnerId,
				partnerName: partner.partnerName,
				partnerType: partner.partnerType,
			})
			.onConflictDoUpdate({
				target: partners.partnerId,
				set: {
					partnerName: partner.partnerName,
					partnerType: partner.partnerType,
				},
			});
	}

	const moaIds = new Map<string, string>();
	for (const moa of demoMoas) {
		const moaId = demoUuid(`moa:${moa.key}`);
		moaIds.set(moa.key, moaId);
		const partnerId = partnerIds.get(moa.partnerKey);
		if (!partnerId) throw new Error(`Missing partner: ${moa.partnerKey}`);
		await db
			.insert(moas)
			.values({
				moaId,
				partnerId,
				validFrom: date(moa.validFrom),
				validUntil: date(moa.validUntil),
			})
			.onConflictDoUpdate({
				target: moas.moaId,
				set: {
					partnerId,
					validFrom: date(moa.validFrom),
					validUntil: date(moa.validUntil),
					archivedAt: null,
				},
			});
	}

	for (const proposal of demoProposals) {
		const proposalId = demoUuid(`proposal:${proposal.key}`);
		const proposalCampusId = campusId(proposal.campusName);
		const proposalDepartmentId = departmentId(proposal.departmentCode);
		const bannerProgramId = bannerProgramIds.get(proposal.bannerKey);
		if (!bannerProgramId) {
			throw new Error(`Missing banner program: ${proposal.bannerKey}`);
		}
		const bannerProgram = demoBannerPrograms.find(
			(program) => program.key === proposal.bannerKey,
		);
		if (!bannerProgram) {
			throw new Error(`Missing banner program metadata: ${proposal.bannerKey}`);
		}

		await db
			.insert(proposals)
			.values({
				proposalId,
				campusId: proposalCampusId,
				departmentId: proposalDepartmentId,
				title: proposal.title,
				bannerProgramId,
				bannerProgram: bannerProgram.programName,
				projectLocale: proposal.projectLocale,
				budgetPartner: proposal.budgetPartner,
				budgetNeust: proposal.budgetNeust,
				status: proposal.status,
				targetStartDate: date(proposal.targetStartDate),
				targetEndDate: date(proposal.targetEndDate),
				institutionalApprovedAt: proposal.institutionalApprovedAt
					? date(proposal.institutionalApprovedAt)
					: null,
				createdAt: date(proposal.createdAt),
				updatedAt: date(proposal.createdAt),
			})
			.onConflictDoUpdate({
				target: proposals.proposalId,
				set: {
					campusId: proposalCampusId,
					departmentId: proposalDepartmentId,
					title: proposal.title,
					bannerProgramId,
					bannerProgram: bannerProgram.programName,
					projectLocale: proposal.projectLocale,
					budgetPartner: proposal.budgetPartner,
					budgetNeust: proposal.budgetNeust,
					status: proposal.status,
					targetStartDate: date(proposal.targetStartDate),
					targetEndDate: date(proposal.targetEndDate),
					institutionalApprovedAt: proposal.institutionalApprovedAt
						? date(proposal.institutionalApprovedAt)
						: null,
					updatedAt: new Date(),
					archivedAt: null,
				},
			});

		await db
			.insert(proposalDepartments)
			.values([
				{ proposalId, departmentId: proposalDepartmentId },
				...(proposal.key === "digitalLiteracy"
					? [{ proposalId, departmentId: departmentId("COED") }]
					: []),
			])
			.onConflictDoNothing();

		for (const member of proposal.members) {
			const memberUserId = userIds.get(member.userKey);
			if (!memberUserId) throw new Error(`Missing user: ${member.userKey}`);
			await db
				.insert(proposalMembers)
				.values({
					proposalId,
					userId: memberUserId,
					projectRole: member.projectRole,
					specificRole: member.specificRole,
				})
				.onConflictDoUpdate({
					target: [proposalMembers.proposalId, proposalMembers.userId],
					set: {
						projectRole: member.projectRole,
						specificRole: member.specificRole,
						archivedAt: null,
					},
				});
		}

		for (const sectorName of proposal.sectors) {
			const sectorId = sectorMap.get(sectorName);
			if (!sectorId) throw new Error(`Missing sector: ${sectorName}`);
			await db
				.insert(proposalBeneficiaries)
				.values({
					proposalId,
					sectorId,
					enteredLabels: [sectorName],
				})
				.onConflictDoNothing();
		}

		for (const sdgNumber of proposal.sdgNumbers) {
			const sdgId = sdgMap.get(sdgNumber);
			if (!sdgId) throw new Error(`Missing SDG: ${sdgNumber}`);
			await db
				.insert(proposalSdgs)
				.values({ proposalId, sdgId })
				.onConflictDoNothing();
		}

		for (const serviceName of proposal.services) {
			const serviceId = serviceMap.get(serviceName);
			if (!serviceId)
				throw new Error(`Missing extension service: ${serviceName}`);
			await db
				.insert(proposalExtensionServices)
				.values({ proposalId, extensionServiceId: serviceId })
				.onConflictDoNothing();
		}

		const proposalMilestones = [
			{
				kind: "proposal_approved" as const,
				occurredAt: proposal.institutionalApprovedAt,
			},
			...(proposal.project
				? [
						{
							kind: "project_activated" as const,
							occurredAt: proposal.project.createdAt,
						},
					]
				: []),
			...(proposal.project?.status === "Completed"
				? [
						{
							kind: "project_completed" as const,
							occurredAt: proposal.project.actualEndDate,
						},
					]
				: []),
		];

		for (const milestone of proposalMilestones) {
			if (!milestone.occurredAt) continue;
			await db
				.insert(projectMilestones)
				.values({
					proposalId,
					kind: milestone.kind,
					actorId: userIds.get(proposal.members[0].userKey),
					sourceKey: `demo:${proposal.key}:${milestone.kind}`,
					occurredAt: date(milestone.occurredAt),
				})
				.onConflictDoUpdate({
					target: projectMilestones.sourceKey,
					set: {
						proposalId,
						kind: milestone.kind,
						actorId: userIds.get(proposal.members[0].userKey),
						occurredAt: date(milestone.occurredAt),
					},
				});
		}

		if (!proposal.project) continue;

		const projectId = demoUuid(`project:${proposal.key}`);
		const moaId = moaIds.get(proposal.project.moaKey);
		if (!moaId) throw new Error(`Missing MOA: ${proposal.project.moaKey}`);
		await db
			.insert(projects)
			.values({
				projectId,
				proposalId,
				moaId,
				projectStatus: proposal.project.status,
				actualEndDate:
					"actualEndDate" in proposal.project
						? date(proposal.project.actualEndDate)
						: null,
				createdAt: date(proposal.project.createdAt),
				updatedAt: date(proposal.project.createdAt),
			})
			.onConflictDoUpdate({
				target: projects.projectId,
				set: {
					proposalId,
					moaId,
					projectStatus: proposal.project.status,
					actualEndDate:
						"actualEndDate" in proposal.project
							? date(proposal.project.actualEndDate)
							: null,
					updatedAt: new Date(),
					archivedAt: null,
				},
			});

		for (const [index, milestone] of proposal.reportingMilestones.entries()) {
			const isProgress = milestone.reportType === "Progress";
			await db
				.insert(projectReportingMilestones)
				.values({
					milestoneId: demoUuid(`reporting-milestone:${proposal.key}:${index}`),
					projectId,
					title: milestone.title,
					milestoneType: isProgress ? "Progress" : "Closure",
					reportType: milestone.reportType,
					dueAt: date(milestone.dueAt),
					completedAt: milestone.completedAt
						? date(milestone.completedAt)
						: null,
				})
				.onConflictDoUpdate({
					target: projectReportingMilestones.milestoneId,
					set: {
						projectId,
						title: milestone.title,
						milestoneType: isProgress ? "Progress" : "Closure",
						reportType: milestone.reportType,
						dueAt: date(milestone.dueAt),
						completedAt: milestone.completedAt
							? date(milestone.completedAt)
							: null,
					},
				});
		}
	}

	console.log("Demo seed complete.");
	console.log(
		`Demo proposals: ${demoProposals.length}; demo faculty accounts: ${demoUsers.length}.`,
	);
	console.log(
		"Demo users have no Supabase authentication accounts and cannot sign in.",
	);
}

main()
	.catch((error) => {
		console.error("Demo seeding failed.");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
