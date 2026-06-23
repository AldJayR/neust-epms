import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
	return (
		<header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
			<div className="flex flex-1 items-center gap-3">
				<SidebarTrigger />
				<Separator
					orientation="vertical"
					className="h-4 data-vertical:self-center"
				/>
				<div className="relative w-full max-w-[212px]">
					<Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Type to search…"
						aria-label="Search"
						className="h-8 w-full rounded-lg bg-background pl-8 text-sm"
					/>
				</div>
			</div>
			<div className="flex items-center gap-4">
				<button
					className="inline-flex size-8 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					type="button"
					aria-label="Notifications"
				>
					<Bell className="size-4 text-muted-foreground" />
				</button>
			</div>
		</header>
	);
}
