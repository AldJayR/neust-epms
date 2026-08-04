import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { PageSkeleton } from "@/components/custom/page-skeleton";
import { FacultyDirectoryPage } from "@/features/faculty";
import { facultyDirectoryQueryOptions } from "@/features/faculty/public";
import { RetFacultyDirectoryPage } from "@/features/ret/faculty-directory-page";
import { isDeniedAccess, isRETChair } from "@/lib/permissions";

const facultySearchSchema = z.object({
	page: z.number().optional().default(1),
	limit: z.number().optional().default(10),
	search: z.string().optional(),
	college: z.string().optional(),
	departmentId: z.number().optional(),
	load: z.enum(["all", "none", "active"]).optional().default("all"),
	sort: z
		.enum(["load-desc", "load-asc", "name"])
		.optional()
		.default("load-desc"),
	trendMonths: z
		.union([z.literal(6), z.literal(12), z.literal(24)])
		.optional()
		.default(12),
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
		departmentId: search.departmentId,
		load: search.load,
		sort: search.sort,
		trendMonths: search.trendMonths,
	}),
	beforeLoad: ({ context }) => {
		if (isDeniedAccess(context.auth.user, "Director", "RET Chair")) {
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
				departmentId: deps.departmentId,
				load: deps.load,
				sort: deps.sort,
				trendMonths: deps.trendMonths,
			}),
		);
	},
	pendingComponent: FacultyPendingComponent,
	component: FacultyIndexPage,
});

function FacultyIndexPage() {
	const { user } = Route.useRouteContext();
	const {
		page,
		limit,
		search,
		college,
		departmentId,
		load,
		sort,
		trendMonths,
	} = Route.useSearch();
	const navigate = Route.useNavigate();

	const handleSearch = (newSearch: string) => {
		navigate({
			search: (old) => ({ ...old, search: newSearch || undefined, page: 1 }),
		});
	};

	const handleDepartmentChange = (newDepartmentId: number | undefined) => {
		navigate({
			search: (old) => ({
				...old,
				departmentId: newDepartmentId,
				college: undefined,
				page: 1,
			}),
		});
	};

	const handleLoadChange = (newLoad: "all" | "none" | "active") => {
		navigate({
			search: (old) => ({ ...old, load: newLoad, page: 1 }),
		});
	};

	const handleSortChange = (newSort: "load-desc" | "load-asc" | "name") => {
		navigate({
			search: (old) => ({ ...old, sort: newSort, page: 1 }),
		});
	};

	const handleTrendMonthsChange = (newTrendMonths: 6 | 12 | 24) => {
		navigate({
			search: (old) => ({ ...old, trendMonths: newTrendMonths }),
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
			departmentId={departmentId}
			load={load}
			sort={sort}
			trendMonths={trendMonths}
			onPageChange={handlePageChange}
			onSearchChange={handleSearch}
			onDepartmentChange={handleDepartmentChange}
			onLoadChange={handleLoadChange}
			onSortChange={handleSortChange}
			onTrendMonthsChange={handleTrendMonthsChange}
		/>
	);
}
