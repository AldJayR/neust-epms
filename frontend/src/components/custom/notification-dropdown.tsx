import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
	getNotificationsQueryOptions,
	getUnreadCountQueryOptions,
	markNotificationReadFn,
} from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const seconds = Math.floor((now - then) / 1000);

	if (seconds < 60) return "just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

function notificationIcon(type: string): string {
	switch (type) {
		case "moa_expiry":
			return "📋";
		case "report_overdue":
			return "⚠️";
		case "report_submitted":
			return "📄";
		case "schedule_adjustment_requested":
		case "schedule_adjustment_approved":
			return "📅";
		case "proposal_status_update":
			return "📝";
		case "account_activated":
			return "✅";
		default:
			return "🔔";
	}
}

export function NotificationDropdown() {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);

	const { data: unreadData } = useQuery(getUnreadCountQueryOptions);

	const {
		data: notifications,
		isLoading: notificationsLoading,
	} = useQuery({
		...getNotificationsQueryOptions,
		enabled: open,
	});

	const markReadMutation = useMutation({
		mutationFn: (notificationId: string) =>
			markNotificationReadFn({ data: { notificationId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications", "unread-count"],
			});
		},
	});

	const unreadCount = unreadData?.count ?? 0;

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="relative size-8 rounded-full"
					/>
				}
				aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
			>
				<Bell className="size-4 text-muted-foreground" />
				{unreadCount > 0 && (
					<span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
				<DropdownMenuLabel className="flex items-center justify-between">
					<span>Notifications</span>
					{unreadCount > 0 && (
						<span className="text-xs text-muted-foreground">
							{unreadCount} unread
						</span>
					)}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{notificationsLoading ? (
					<div className="flex items-center justify-center py-8">
						<Spinner className="size-4" />
					</div>
				) : !notifications || notifications.length === 0 ? (
					<div className="px-4 py-8 text-center text-sm text-muted-foreground">
						No notifications
					</div>
				) : (
					<ScrollArea className="max-h-80">
						{notifications.map((n) => (
							<DropdownMenuItem
								key={n.notificationId}
								className={cn(
									"flex cursor-pointer flex-col items-start gap-1 px-4 py-3",
									!n.isRead && "bg-accent/50",
								)}
								onSelect={() => {
									if (!n.isRead) {
										markReadMutation.mutate(n.notificationId);
									}
								}}
							>
								<div className="flex w-full items-start gap-2">
									<span className="mt-0.5 text-sm">
										{notificationIcon(n.type)}
									</span>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium leading-none">
											{n.title}
										</div>
										<div className="mt-1 text-xs text-muted-foreground line-clamp-2">
											{n.message}
										</div>
									</div>
									{!n.isRead && (
										<span className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" />
									)}
								</div>
								<span className="ml-6 text-[10px] text-muted-foreground">
									{timeAgo(n.createdAt)}
								</span>
							</DropdownMenuItem>
						))}
					</ScrollArea>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
