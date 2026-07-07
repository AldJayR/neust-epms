import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isDeniedAccess } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin")({
	beforeLoad: ({ context }) => {
		if (isDeniedAccess(context.auth.user, "Super Admin")) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	component: AdminLayout,
});

function AdminLayout() {
	return <Outlet />;
}
