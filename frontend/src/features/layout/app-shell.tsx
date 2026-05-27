import { Bell, Search } from "lucide-react";
import type React from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

interface AppShellProps {
	children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="bg-white">
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<div className="flex flex-1 items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<div className="relative w-full max-w-[212px]">
							<Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Type to search…"
								className="h-8 w-full rounded-lg bg-background pl-8 text-sm"
							/>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<button
							className="inline-flex size-8 items-center justify-center rounded-full hover:bg-muted"
							type="button"
						>
							<Bell className="size-4 text-muted-foreground" />
						</button>
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 lg:px-8 lg:py-6">
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
