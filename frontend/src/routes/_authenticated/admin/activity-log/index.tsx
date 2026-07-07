import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ActivityLogPage } from "@/features/admin/activity-log-page";
import { isDeniedAccess } from "@/lib/permissions";

const searchSchema = z.object({
	page: z.number().int().min(1).catch(1),
	limit: z.number().int().min(1).max(100).catch(10),
	search: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/admin/activity-log/")({
	validateSearch: (search) => searchSchema.parse(search),
	beforeLoad: ({ context }) => {
		if (isDeniedAccess(context.auth.user, "Super Admin")) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	component: ActivityLogComponent,
});

function ActivityLogComponent() {
	const { page, limit, search } = Route.useSearch();
	const navigate = useNavigate();

	return (
		<ActivityLogPage
			page={page}
			limit={limit}
			search={search}
			onSearch={(newSearch) =>
				navigate({
					to: ".",
					search: (prev) => ({ ...prev, search: newSearch, page: 1 }),
				})
			}
			onPageChange={(newPage) =>
				navigate({
					to: ".",
					search: (prev) => ({ ...prev, page: newPage }),
				})
			}
		/>
	);
}
