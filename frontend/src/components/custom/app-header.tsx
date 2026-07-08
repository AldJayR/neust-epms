import { useRouteContext } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { GlobalSearch } from "./global-search";
import { NotificationDropdown } from "./notification-dropdown";
import type { AuthUser } from "@/lib/auth";

export function AppHeader() {
	const { user } = useRouteContext({ from: "/_authenticated" }) as {
		user: AuthUser;
	};

	return (
		<header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
			<div className="flex flex-1 items-center gap-3">
				<SidebarTrigger />
				<Separator
					orientation="vertical"
					className="h-4 data-vertical:self-center"
				/>
				<GlobalSearch user={user} />
			</div>
			<div className="flex items-center gap-4">
				<NotificationDropdown />
			</div>
		</header>
	);
}
