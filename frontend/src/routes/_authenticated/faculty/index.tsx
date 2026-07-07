import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { PageSkeleton } from "@/components/custom/page-skeleton";
import { FacultyDirectoryPage } from "@/features/director/faculty-directory-page";
import { RetFacultyDirectoryPage } from "@/features/ret/faculty-directory-page";
import { facultyDirectoryQueryOptions } from "@/lib/dashboard.functions";
import { isRETChair, isDeniedAccess } from "@/lib/permissions";

const facultySearchSchema = z.object({
	page: z.number().optional().default(1),
	limit: z.number().optional().default(10),
	search: z.string().optional(),
	college: z.string().optional(),
});

const FacultyPendingComponent = () => (
	<PageSkeleton
		title="Faculty Directory"
		actionText="Export Directory"
		columnWidths={["w-[320px]", "w-[200px]", "w-[150px]", "w-[150px]"]}
	/>
);

export const Route = createFileRoute("/_authenticated/faculty/")({
	validateSearch: (search) => facultySearchSchema.parse(search),
	loaderDeps: ({ search }) => ({
		page: search.page,
		limit: search.limit,
		search: search.search,
		college: search.college,
	}),
	beforeLoad: ({ context }) => {
		if (
			isDeniedAccess(context.auth.user, "Director", "RET Chair")
		) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context, deps }) => {
		await context.queryClient.ensureQueryData(
			facultyDirectoryQueryOptions({
				page: deps.page,
				limit: deps.limit,
				search: deps.search,
				college: deps.college,
			}),
		);
	},
	pendingComponent: FacultyPendingComponent,
	component: FacultyIndexPage,
});

function FacultyIndexPage() {
	const { user } = Route.useRouteContext();
	const { page, limit, search, college } = Route.useSearch();
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

	const handlePageChange = (newPage: number) => {
		navigate({
			search: (old) => ({ ...old, page: newPage }),
		});
	};

	if (isRETChair(user)) {
		return (
			<RetFacultyDirectoryPage
				user={user}
				page={page}
				limit={limit}
				search={search}
				onPageChange={handlePageChange}
				onSearchChange={handleSearch}
			/>
		);
	}

	return (
		<FacultyDirectoryPage
			user={user}
			page={page}
			limit={limit}
			search={search}
			college={college}
			onPageChange={handlePageChange}
			onSearchChange={handleSearch}
			onCollegeChange={handleCollegeChange}
		/>
	);
}
