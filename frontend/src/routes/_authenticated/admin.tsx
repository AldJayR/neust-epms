import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/features/admin/admin-shell";

export const Route = createFileRoute("/_authenticated/admin")({
	beforeLoad: ({ context }) => {
		if (context.auth.user?.roleName !== "Super Admin") {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	component: AdminLayout,
});

function AdminLayout() {
	return (
		<AdminShell>
			<Outlet />
		</AdminShell>
	);
}
