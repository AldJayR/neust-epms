import * as React from "react";
import { Activity, FolderKanban, Settings, Users } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

import { RoleSidebar, type RoleSidebarGroup, type RoleSidebarItem } from "@/components/role-sidebar";
import type { AuthUser } from "@/lib/auth";

const navMain: {
	title: string;
	items: {
		title: string;
		url: RoleSidebarItem["href"];
		icon: RoleSidebarItem["icon"];
	}[];
}[] = [
	{
		title: "Dashboard",
		items: [
			{
				title: "User Management",
				url: "/dashboard",
				icon: Users,
			},
			{
				title: "Projects",
				// @ts-expect-error - Route ID not yet in generated tree
				url: "/projects",
				icon: FolderKanban,
			},
			{
				title: "Activity Log",
				url: "/admin/activity-log",
				icon: Activity,
			},
		],
	},
	{
		title: "Management",
		items: [
			{
				title: "Settings",
				url: "/admin/settings",
				icon: Settings,
			},
		],
	},
];

export function AppSidebar({
	...props
}: React.ComponentProps<typeof RoleSidebar>) {
	const routerState = useRouterState();
	const authenticatedMatch = routerState.matches.find(
		(m) => m.routeId === "/_authenticated",
	);
	const user = authenticatedMatch?.context
		? (authenticatedMatch.context as { user: AuthUser | null }).user
		: null;

	const pathname = routerState.location.pathname;

	const groups: RoleSidebarGroup[] = navMain.map((group) => ({
		title: group.title,
		items: group.items
			.filter((item) => !(user?.roleName === "Super Admin" && item.title === "Projects"))
			.map((item) => ({
				title: item.title,
				href: item.url,
				icon: item.icon,
				active:
					item.url === "/dashboard"
						? pathname === "/dashboard"
						: pathname === item.url || pathname.startsWith(`${item.url ?? ""}/`),
			})),
	}));

	return (
		<RoleSidebar
			{...props}
			headerRender={<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />}
			headerContent={
				<>
					<div className="flex aspect-square size-8 items-center justify-center">
						<img
							src="https://www.figma.com/api/mcp/asset/90ecf408-1ada-46b9-91dc-9ebc2c099802"
							alt="NEUST Logo"
							className="size-7"
						/>
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold text-[#0a0a0a]">NEUST</span>
						<span className="truncate text-xs text-[#0a0a0a]">Extension Services</span>
					</div>
				</>
			}
			groups={groups}
			user={user}
			fallbackFullName="Engr. J. Dela Cruz"
			fallbackRole="MIS Faculty"
		/>
	);
}
