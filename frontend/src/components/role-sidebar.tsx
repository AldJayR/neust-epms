import * as React from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight, LogOut, type LucideIcon } from "lucide-react";

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
	SidebarGroupContent,
	SidebarGroupLabel,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/lib/auth";
import type { ComponentProps, ReactNode } from "react";

export type RoleSidebarItem = {
	title: string;
	icon: LucideIcon;
	href?: LinkProps["to"];
	active?: boolean;
};

export type RoleSidebarGroup = {
	title: string;
	items: RoleSidebarItem[];
};

export interface RoleSidebarProps extends ComponentProps<typeof Sidebar> {
	headerRender: ReactNode;
	headerContent: ReactNode;
	groups: RoleSidebarGroup[];
	user?: AuthUser | null;
	fallbackFullName: string;
	fallbackRole: string;
}

export function RoleSidebar({
	headerRender,
	headerContent,
	groups,
	user,
	fallbackFullName,
	fallbackRole,
	...props
}: RoleSidebarProps) {
	const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "JD";
	const fullName = user ? `${user.firstName} ${user.lastName}` : fallbackFullName;
	const roleLabel = user ? user.roleName : fallbackRole;

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" render={headerRender}>
							{headerContent}
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{groups.map((group) => (
					<SidebarGroup key={group.title}>
						<SidebarGroupLabel className="text-[#0a0a0a] opacity-70">
							{group.title}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{group.items.map((item) => (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											render={item.href ? <Link to={item.href} /> : undefined}
											tooltip={item.title}
											isActive={item.active}
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
										{roleLabel}
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
											<span className="truncate text-xs">{roleLabel}</span>
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
