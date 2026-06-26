import { Link, useRouterState } from "@tanstack/react-router";
import {
	Activity,
	BarChart3,
	FolderKanban,
	LayoutDashboard,
	Scroll,
	Settings,
	Users,
} from "lucide-react";
import type * as React from "react";

import {
	RoleSidebar,
	type RoleSidebarGroup,
	type RoleSidebarItem,
} from "@/components/role-sidebar";
import type { AuthUser } from "@/lib/auth";
import { isDirector, isRETChair } from "@/lib/permissions";

type NavItem = {
	title: string;
	url: RoleSidebarItem["href"];
	icon: RoleSidebarItem["icon"];
};

type NavGroup = {
	title: string;
	items: NavItem[];
};

const adminNav: NavGroup[] = [
	{
		title: "Overview",
		items: [
			{
				title: "User Management",
				url: "/dashboard",
				icon: Users,
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

const directorNav: NavGroup[] = [
	{
		title: "Overview",
		items: [
			{
				title: "Dashboard",
				url: "/dashboard",
				icon: LayoutDashboard,
			},
			{
				title: "Projects",
				url: "/projects",
				icon: FolderKanban,
			},
			{
				title: "Faculty",
				url: "/faculty",
				icon: Users,
			},
			{
				title: "Memoranda of Agreements",
				url: "/moas",
				icon: Scroll,
			},
		],
	},
	{
		title: "Management",
		items: [
			{
				title: "Reports",
				url: "/reports",
				icon: BarChart3,
			},
			{
				title: "Settings",
				url: "/admin/settings",
				icon: Settings,
			},
		],
	},
];

const retNav: NavGroup[] = [
	{
		title: "Overview",
		items: [
			{
				title: "Dashboard",
				url: "/dashboard",
				icon: LayoutDashboard,
			},
			{
				title: "Project Monitoring",
				url: "/projects",
				icon: FolderKanban,
			},
			{
				title: "Faculty Directory",
				url: "/faculty",
				icon: Users,
			},
			{
				title: "Memoranda of Agreements",
				url: "/moas",
				icon: Scroll,
			},
			{
				title: "Reports",
				url: "/reports",
				icon: BarChart3,
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
	const user = useRouterState({
		select: (s) => {
			const authMatch = s.matches.find((m) => m.routeId === "/_authenticated");
			return (
				(authMatch?.context as { user: AuthUser | null } | undefined)?.user ??
				null
			);
		},
	});

	const pathname = useRouterState({
		select: (s) => s.location.pathname,
	});

	let navMain = adminNav;
	if (isDirector(user)) {
		navMain = directorNav;
	} else if (isRETChair(user)) {
		navMain = retNav;
	}

	const groups: RoleSidebarGroup[] = navMain.map((group) => ({
		title: group.title,
		items: group.items.map((item) => ({
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
							src="/images/extension-services-logo.png"
							alt="NEUST Logo"
							className="size-7"
						/>
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold text-foreground">NEUST</span>
						<span className="truncate text-xs text-foreground">
							Extension Services
						</span>
					</div>
				</>
			}
			groups={groups}
			user={user}
			fallbackFullName="Dr. A. Santos"
			fallbackRole="Director"
		/>
	);
}
