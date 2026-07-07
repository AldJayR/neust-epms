import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsPage } from "@/features/admin/settings-page";
import { SettingsSkeleton } from "@/components/custom/settings-skeleton";
import { isDeniedAccess } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/settings/")({
	beforeLoad: ({ context }) => {
		if (isDeniedAccess(context.auth.user, "Super Admin")) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	pendingComponent: SettingsSkeleton,
	component: SettingsPage,
});
