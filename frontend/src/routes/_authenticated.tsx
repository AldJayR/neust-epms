import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context, location }) => {
		if (!context.auth.isAuthenticated) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}

		// Pass the authenticated user down to all child routes
		return {
			user: context.auth.user!,
		};
	},
	component: () => <Outlet />,
});
