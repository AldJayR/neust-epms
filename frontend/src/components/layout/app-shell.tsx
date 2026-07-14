import type React from "react";
import { AppHeader } from "@/components/custom/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

interface AppShellProps {
	children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset id="main-content" className="bg-background">
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:bg-background focus:p-2 focus:ring-2 focus:ring-ring"
				>
					Skip to content
				</a>
				<AppHeader />
				<div className="flex flex-1 flex-col gap-4 p-4 lg:px-8 lg:py-6">
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
