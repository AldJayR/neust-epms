import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ProjectHubPage } from "@/features/director/project-hub-page";
import { projectHubQueryOptions } from "@/lib/dashboard.functions";
import { requireRole, isSuperAdmin, isAdminOrDirector } from "@/lib/permissions";

const projectsSearchSchema = z.object({
	page: z.number().optional().default(1),
	limit: z.number().optional().default(10),
	search: z.string().optional(),
	college: z.string().optional(),
	status: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/projects/")({
	validateSearch: (search) => projectsSearchSchema.parse(search),
	loaderDeps: ({ search }) => ({
		page: search.page,
		limit: search.limit,
		search: search.search,
		college: search.college,
		status: search.status,
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
		if (requireRole(context.auth.user, 'Director', 'Super Admin')) {
			return null;
		}

		await context.queryClient.ensureQueryData(
			projectHubQueryOptions({
				page: deps.page,
				limit: deps.limit,
				search: deps.search,
				college: deps.college,
				status: deps.status,
			}),
		);
	},
	component: ProjectsIndexPage,
});

function ProjectsIndexPage() {
	const context = Route.useRouteContext();
	const user = context.auth.user;
	const { page, limit, search, college, status } = Route.useSearch();
	const navigate = Route.useNavigate();

	const handleSearch = (newSearch: string) => {
		navigate({
			search: (old) => ({ ...old, search: newSearch || undefined, page: 1 }),
		});
	};

	const handleCollegeChange = (newCollege: string) => {
		navigate({
			search: (old) => ({ ...old, college: newCollege || undefined, page: 1 }),
		});
	};

	const handleStatusChange = (newStatus: string) => {
		navigate({
			search: (old) => ({ ...old, status: newStatus || undefined, page: 1 }),
		});
	};

	const handlePageChange = (newPage: number) => {
		navigate({
			search: (old) => ({ ...old, page: newPage }),
		});
	};

	const handleProjectClick = (projectId: string) => {
		navigate({
			to: "/projects/$projectId",
			params: { projectId },
		});
	};

	if (isAdminOrDirector(user)) {
		return (
			<ProjectHubPage
				page={page}
				limit={limit}
				search={search}
				college={college}
				status={status}
				onPageChange={handlePageChange}
				onSearchChange={handleSearch}
				onCollegeChange={handleCollegeChange}
				onStatusChange={handleStatusChange}
				onProjectClick={handleProjectClick}
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
