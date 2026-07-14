import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Onboarding } from "@/components/custom/onboarding";
import { AppShell } from "@/components/layout/app-shell";
import type { AuthUser } from "../lib/auth.js";

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
			user: context.auth.user as AuthUser,
		};
	},
	loader: () => void 0,
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { user } = Route.useRouteContext();
	return (
		<AppShell>
			<Onboarding user={user} />
			<Outlet />
		</AppShell>
	);
}
