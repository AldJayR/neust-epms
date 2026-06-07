import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { FacultyDirectoryPage } from "@/features/director/faculty-directory-page";
import { facultyDirectoryQueryOptions } from "@/lib/director.functions";

const facultySearchSchema = z.object({
	search: z.string().optional(),
	college: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/faculty/")({
	validateSearch: (search) => facultySearchSchema.parse(search),
	beforeLoad: ({ context }) => {
		if (
			context.auth.user?.roleName !== "Director" &&
			context.auth.user?.roleName !== "Super Admin"
		) {
			throw redirect({ to: "/dashboard" });
		}
	},
	loaderDeps: ({ search }) => ({
		search: search.search,
		college: search.college,
	}),
	loader: async ({ context, deps }) => {
		await context.queryClient.ensureQueryData(
			facultyDirectoryQueryOptions({
				search: deps.search,
				college: deps.college,
			}),
		);
	},
	component: FacultyIndexPage,
});

function FacultyIndexPage() {
	const { user } = Route.useRouteContext();
	const { search, college } = Route.useSearch();
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

	return (
		<FacultyDirectoryPage
			user={user}
			search={search}
			college={college}
			onSearchChange={handleSearch}
			onCollegeChange={handleCollegeChange}
		/>
	);
}
