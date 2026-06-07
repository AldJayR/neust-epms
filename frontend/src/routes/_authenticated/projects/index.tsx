import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ProjectHubPage } from "@/features/director/project-hub-page";
import { projectHubQueryOptions } from "@/lib/director.functions";

const projectsSearchSchema = z.object({
	search: z.string().optional(),
	college: z.string().optional(),
	status: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/projects/")({
	validateSearch: (search) => projectsSearchSchema.parse(search),
	beforeLoad: ({ context }) => {
		if (context.auth.user?.roleName === "Super Admin") {
			throw redirect({ to: "/dashboard" });
		}
	},
	loaderDeps: ({ search }) => ({
		search: search.search,
		college: search.college,
		status: search.status,
	}),
	loader: async ({ context, deps }) => {
		if (
			context.auth.user?.roleName !== "Director" &&
			context.auth.user?.roleName !== "Super Admin"
		) {
			return null;
		}

		await context.queryClient.ensureQueryData(
			projectHubQueryOptions({
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
	const { search, college, status } = Route.useSearch();
	const navigate = Route.useNavigate();

	const handleSearch = (newSearch: string) => {
		navigate({
			search: (old) => ({ ...old, search: newSearch || undefined }),
		});
	};

	const handleCollegeChange = (newCollege: string) => {
		navigate({
			search: (old) => ({ ...old, college: newCollege || undefined }),
		});
	};

	const handleStatusChange = (newStatus: string) => {
		navigate({
			search: (old) => ({ ...old, status: newStatus || undefined }),
		});
	};

	const handleProjectClick = (projectId: string) => {
		navigate({
			to: "/projects/$projectId",
			params: { projectId },
		});
	};

	if (user?.roleName === "Director" || user?.roleName === "Super Admin") {
		return (
			<ProjectHubPage
				search={search}
				college={college}
				status={status}
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
