import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ProjectHubPage } from "@/features/director/project-hub-page";
import { projectHubQueryOptions } from "@/lib/director.functions";

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
	loader: async ({ context, deps }) => {
		if (context.auth.user?.roleName !== "Director" && context.auth.user?.roleName !== "Super Admin") {
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
	const { user } = Route.useRouteContext();
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

	if (user.roleName === "Director" || user.roleName === "Super Admin") {
		return (
			<ProjectHubPage
				user={user}
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

	return (
		<div className="p-8">
			<h1 className="text-2xl font-semibold">Projects</h1>
			<p className="text-muted-foreground text-sm">Welcome to the projects page.</p>
		</div>
	);
}
