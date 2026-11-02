import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { PageSkeleton } from "@/components/custom/page-skeleton";
import { directorDashboardQueryOptions } from "@/features/dashboard";
import { FacultyProjectHubPage } from "@/features/faculty/faculty-project-hub-page";
import {
	facultyProjectsQueryOptions,
	facultyProposalsQueryOptions,
} from "@/features/faculty/public";
import { ProjectHubPage } from "@/features/projects";
import { projectHubQueryOptions } from "@/features/projects/public";
import { ProjectMonitoringPage } from "@/features/ret/project-monitoring-page";
import { dashboardReturnSchema } from "@/lib/director-dashboard-state";
import {
	isDeniedAccess,
	isDirector,
	isRETChair,
	isSuperAdmin,
} from "@/lib/permissions";

const projectsSearchSchema = z.object({
	dashboard: dashboardReturnSchema,
	year: z.number().int().min(2000).max(2200).optional(),
	campusId: z.number().int().positive().optional(),
	departmentId: z.number().int().nonnegative().optional(),
	kind: z.enum(["projects", "submitted"]).optional(),
	page: z.number().optional().default(1),
	limit: z.number().optional().default(10),
	search: z.string().optional(),
	college: z.string().optional(),
	status: z.string().optional(),
	myProjectsOnly: z.boolean().optional(),
});

const ProjectsPendingComponent = () => {
	const context = Route.useRouteContext();
	const user = context.auth?.user;

	if (isDirector(user) || user?.roleName === "Faculty") {
		return (
			<PageSkeleton
				title="Project Hub"
				actionText="Start New Project Proposal"
				columnWidths={["w-[350px]", "w-[200px]", "w-[180px]", "w-[150px]"]}
			/>
		);
	}

	return (
		<PageSkeleton
			title="Project Monitoring"
			actionText="Add New Project"
			columnWidths={["w-[350px]", "w-[180px]", "w-[150px]"]}
		/>
	);
};

export const Route = createFileRoute("/_authenticated/projects/")({
	validateSearch: (search) => projectsSearchSchema.parse(search),
	loaderDeps: ({ search }) => ({
		year: search.year,
		campusId: search.campusId,
		departmentId: search.departmentId,
		kind: search.kind,
		page: search.page,
		limit: search.limit,
		search: search.search,
		college: search.college,
		status: search.status,
		myProjectsOnly: search.myProjectsOnly,
	}),
	beforeLoad: ({ context }) => {
		if (isSuperAdmin(context.auth.user)) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context, deps }) => {
		const user = context.auth.user;
		if (!user) return null;

		if (user.roleName === "Faculty") {
			await Promise.all([
				context.queryClient.ensureQueryData(facultyProjectsQueryOptions()),
				context.queryClient.ensureQueryData(facultyProposalsQueryOptions()),
			]);
			return null;
		}

		if (isDeniedAccess(user, "Director", "RET Chair")) {
			return null;
		}

		await Promise.all([
			context.queryClient.ensureQueryData(
				projectHubQueryOptions({
					year: deps.year,
					campusId: deps.campusId,
					departmentId: deps.departmentId,
					kind: deps.kind,
					page: deps.page,
					limit: deps.limit,
					search: deps.search,
					college: deps.college,
					status: deps.status,
					myProjectsOnly: deps.myProjectsOnly ? "true" : undefined,
				}),
			),
			context.queryClient.ensureQueryData(directorDashboardQueryOptions()),
		]);
	},
	pendingComponent: ProjectsPendingComponent,
	component: ProjectsIndexPage,
});

function ProjectsIndexPage() {
	const context = Route.useRouteContext();
	const user = context.auth.user;
	const { page, limit, search, college, status, myProjectsOnly } =
		Route.useSearch();
	const { year, campusId, departmentId, kind, dashboard } = Route.useSearch();
	const navigate = Route.useNavigate();

	const handleSearch = (newSearch: string) => {
		navigate({
			search: (old) => ({ ...old, search: newSearch || undefined, page: 1 }),
		});
	};

	const handleCollegeChange = (newCollege: string) => {
		navigate({
			search: (old) => ({
				...old,
				college:
					newCollege === "Unassigned" ? undefined : newCollege || undefined,
				departmentId: newCollege === "Unassigned" ? 0 : undefined,
				page: 1,
			}),
		});
	};

	const handleStatusChange = (newStatus: string) => {
		navigate({
			search: (old) => ({ ...old, status: newStatus || undefined, page: 1 }),
		});
	};

	const handleMyProjectsOnlyChange = (newMyProjectsOnly: boolean) => {
		navigate({
			search: (old) => ({
				...old,
				myProjectsOnly: newMyProjectsOnly || undefined,
				page: 1,
			}),
		});
	};

	const handlePageChange = (newPage: number) => {
		navigate({
			search: (old) => ({ ...old, page: newPage }),
		});
	};

	if (!user) {
		return null;
	}

	if (user.roleName === "Faculty") {
		return <FacultyProjectHubPage user={user} />;
	}

	if (isDirector(user)) {
		return (
			<ProjectHubPage
				dashboardContext={dashboard}
				scope={{ year, campusId, departmentId, kind }}
				page={page}
				limit={limit}
				search={search}
				college={college}
				status={status}
				onPageChange={handlePageChange}
				onSearchChange={handleSearch}
				onCollegeChange={handleCollegeChange}
				onStatusChange={handleStatusChange}
			/>
		);
	}

	if (isRETChair(user)) {
		return (
			<ProjectMonitoringPage
				user={user}
				page={page}
				limit={limit}
				search={search}
				status={status}
				myProjectsOnly={myProjectsOnly}
				onPageChange={handlePageChange}
				onSearchChange={handleSearch}
				onStatusChange={handleStatusChange}
				onMyProjectsOnlyChange={handleMyProjectsOnlyChange}
			/>
		);
	}

	return (
		<div className="p-8">
			<h1 className="text-2xl font-semibold">Projects</h1>
			<p className="text-muted-foreground text-sm">
				Welcome to the projects page.
			</p>
		</div>
	);
}
