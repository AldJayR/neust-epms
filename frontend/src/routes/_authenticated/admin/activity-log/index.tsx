import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/activity-log/")({
	beforeLoad: ({ context }) => {
		if (context.auth.user?.roleName !== "Super Admin") {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	component: () => (
		<div className="flex flex-col gap-4">
			<h1 className="text-2xl font-semibold text-[#11215a]">Activity Log</h1>
			<p className="text-muted-foreground">This page is under construction.</p>
		</div>
	),
});
