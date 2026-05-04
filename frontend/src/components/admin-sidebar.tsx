import * as React from "react";
import { Activity, ChevronRight, LogOut, Settings, Users } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/lib/auth";

const navMain = [
	{
		title: "Dashboard",
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

export function AdminSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const routerState = useRouterState();
	const authenticatedMatch = routerState.matches.find(
		(m) => m.routeId === "/_authenticated",
	);
	const user = authenticatedMatch?.context
		? (authenticatedMatch.context as { user: AuthUser | null }).user
		: null;

	const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "JD";
	const fullName = user
		? `${user.firstName} ${user.lastName}`
		: "Engr. J. Dela Cruz";
	const emailOrRole = user ? user.roleName : "MIS Faculty";
	const pathname = routerState.location.pathname;

	const isNavItemActive = (url: string) => {
		if (url === "/dashboard") {
			return pathname === "/dashboard";
		}

		return pathname === url || pathname.startsWith(`${url}/`);
	};

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							render={<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />}
						>
							<div className="flex aspect-square size-8 items-center justify-center">
								<img
									src="https://www.figma.com/api/mcp/asset/90ecf408-1ada-46b9-91dc-9ebc2c099802"
									alt="NEUST Logo"
									className="size-7"
								/>
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold text-[#0a0a0a]">
									NEUST
								</span>
								<span className="truncate text-xs text-[#0a0a0a]">
									Extension Services
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{navMain.map((group) => (
					<SidebarGroup key={group.title}>
						<SidebarGroupLabel className="text-[#0a0a0a] opacity-70">
							{group.title}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{group.items.map((item) => (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											render={<Link to={item.url} />}
											tooltip={item.title}
											isActive={isNavItemActive(item.url)}
											className="hover:bg-[#f5f5f5] active:bg-[#f5f5f5]"
										>
											<item.icon className="size-4" />
											<span className="text-[#0a0a0a]">{item.title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<SidebarMenuButton
								size="lg"
								render={<DropdownMenuTrigger />}
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage src="" alt={fullName} />
									<AvatarFallback className="rounded-lg">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold text-[#0a0a0a]">
										{fullName}
									</span>
									<span className="truncate text-xs text-[#0a0a0a]">
										{emailOrRole}
									</span>
								</div>
								<ChevronRight className="ml-auto size-4" />
							</SidebarMenuButton>
							<DropdownMenuContent
								className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
								side="bottom"
								align="end"
								sideOffset={4}
							>
								<DropdownMenuLabel className="p-0 font-normal">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage src="" alt={fullName} />
											<AvatarFallback className="rounded-lg">
												{initials}
											</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-semibold">{fullName}</span>
											<span className="truncate text-xs">{emailOrRole}</span>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<LogOut className="mr-2 size-4" />
									Log out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
