import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ActivityLogPage } from "@/features/admin/activity-log-page";

const searchSchema = z.object({
	search: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/admin/activity-log/")({
	validateSearch: (search) => searchSchema.parse(search),
	beforeLoad: ({ context }) => {
		if (context.auth.user?.roleName !== "Super Admin") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: ActivityLogComponent,
});

function ActivityLogComponent() {
	const { search } = Route.useSearch();
	const navigate = useNavigate();

	return (
		<ActivityLogPage
			search={search}
			onSearch={(newSearch) =>
				navigate({
					to: ".",
					search: (prev) => ({ ...prev, search: newSearch }),
				})
			}
		/>
	);
}
