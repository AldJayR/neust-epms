import type { useRender } from "@base-ui/react/use-render";
import { useQueryClient } from "@tanstack/react-query";
import { Link, type LinkProps } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	ChevronRight,
	Laptop,
	Loader2,
	LogOut,
	Moon,
	Settings,
	Sun,
	type LucideIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import * as React from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
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
import { logoutFn } from "@/features/auth";
import { clearAuthCache } from "@/lib/auth-cache";
import { useTheme } from "@/components/theme-provider";
import { SettingsDialog } from "@/components/settings-dialog";

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
	const [userOverride, setUserOverride] = React.useState<Partial<AuthUser>>({});
	const displayUser = user
		? {
				...user,
				...(userOverride.userId === user.userId ? userOverride : {}),
			}
		: null;

	const initials = displayUser
		? `${displayUser.firstName?.charAt(0) ?? ""}${displayUser.lastName?.charAt(0) ?? ""}` ||
			"JD"
		: "JD";
	const fullName = displayUser
		? `${displayUser.firstName} ${displayUser.lastName}`
		: fallbackFullName;
	const roleLabel = displayUser ? displayUser.roleName : fallbackRole;

	const logout = useServerFn(logoutFn);
	const queryClient = useQueryClient();
	const { theme, setTheme } = useTheme();
	const [isLoggingOut, setIsLoggingOut] = React.useState(false);
	const [settingsOpen, setSettingsOpen] = React.useState(false);

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			clearAuthCache(); // Clear the client-side auth cache
			queryClient.clear();
			await logout();
			// Hard navigation to avoid SSR flash during SPA redirect
			window.location.href = "/login";
		} catch {
			toast.error("Logout failed.");
			setIsLoggingOut(false);
		}
	};

	return (
		<Sidebar collapsible="icon" {...props}>
			<SettingsDialog
				key={displayUser?.userId ?? "settings"}
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				user={displayUser}
				onUserUpdated={(updatedUser) => setUserOverride(updatedUser)}
			/>
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
						<SidebarGroupLabel className="text-foreground opacity-70">
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
											className="hover:bg-muted active:bg-muted"
										>
											<item.icon className="size-4" />
											<span className="text-foreground">{item.title}</span>
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
									<AvatarImage src={displayUser?.avatarUrl ?? undefined} alt={fullName} />
									<AvatarFallback className="rounded-lg">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold text-foreground">
										{fullName}
									</span>
									<span className="truncate text-xs text-foreground">
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
												<AvatarImage src={displayUser?.avatarUrl ?? undefined} alt={fullName} />
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
								<DropdownMenuSub>
									<DropdownMenuSubTrigger>
										{theme === "light" ? (
											<Sun />
										) : theme === "dark" ? (
											<Moon />
										) : (
											<Laptop />
										)}
										Theme
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent>
										<DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
											<DropdownMenuRadioItem value="light">
												<Sun />
												Light
											</DropdownMenuRadioItem>
											<DropdownMenuRadioItem value="dark">
												<Moon />
												Dark
											</DropdownMenuRadioItem>
											<DropdownMenuRadioItem value="system">
												<Laptop />
												System
											</DropdownMenuRadioItem>
										</DropdownMenuRadioGroup>
									</DropdownMenuSubContent>
								</DropdownMenuSub>
								<DropdownMenuItem onClick={() => setSettingsOpen(true)}>
									<Settings className="mr-2 size-4" />
									Settings
								</DropdownMenuItem>
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
