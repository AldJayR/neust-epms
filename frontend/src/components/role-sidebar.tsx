import type { useRender } from "@base-ui/react/use-render";
import { Link, type LinkProps, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Loader2, LogOut, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/lib/auth";
import { logoutFn } from "@/lib/auth.functions";

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
	headerRender?: useRender.ComponentProps<"button">["render"];
	headerContent?: ReactNode;
	groups?: RoleSidebarGroup[];
	user?: AuthUser | null;
	fallbackFullName?: string;
	fallbackRole?: string;
}

const EMPTY_GROUPS: RoleSidebarGroup[] = [];

export function RoleSidebar({
	headerRender,
	headerContent,
	groups = EMPTY_GROUPS,
	user,
	fallbackFullName = "JD",
	fallbackRole = "User",
	...props
}: RoleSidebarProps) {
	const initials = user
		? `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}` ||
			"JD"
		: "JD";
	const fullName = user
		? `${user.firstName} ${user.lastName}`
		: fallbackFullName;
	const roleLabel = user ? user.roleName : fallbackRole;

	const logout = useServerFn(logoutFn);
	const navigate = useNavigate();
	const [isLoggingOut, setIsLoggingOut] = React.useState(false);

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await logout();
			// logoutFn throws a redirect, but we'll navigate just in case
			navigate({ to: "/login" });
			setIsLoggingOut(false);
		} catch (error) {
			console.error("Logout failed:", error);
			setIsLoggingOut(false);
		}
	};

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
								<Avatar className="size-8 rounded-lg">
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
								<DropdownMenuGroup>
									<DropdownMenuLabel className="p-0 font-normal">
										<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
											<Avatar className="size-8 rounded-lg">
												<AvatarImage src="" alt={fullName} />
												<AvatarFallback className="rounded-lg">
													{initials}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-col flex-1 text-left text-sm leading-tight">
												<span className="truncate font-semibold">
													{fullName}
												</span>
												<span className="truncate text-xs">{roleLabel}</span>
											</div>
										</div>
									</DropdownMenuLabel>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={handleLogout}
									disabled={isLoggingOut}
								>
									{isLoggingOut ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : (
										<LogOut className="mr-2 size-4" />
									)}
									{isLoggingOut ? "Logging out..." : "Log out"}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
