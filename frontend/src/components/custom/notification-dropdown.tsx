import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	Bell,
	Calendar,
	Clock,
	FileCheck,
	FileSignature,
	UserCheck,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
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
	markAllNotificationsReadFn,
	markNotificationReadFn,
} from "@/features/notifications";
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

function getNotificationIcon(type: string) {
	const iconClassName = "size-4 shrink-0 mt-0.5";
	switch (type) {
		case "moa_expiry":
			return <Clock className={cn(iconClassName, "text-amber-500 dark:text-amber-300")} />;
		case "report_overdue":
			return (
				<AlertTriangle className={cn(iconClassName, "text-destructive")} />
			);
		case "report_submitted":
			return <FileCheck className={cn(iconClassName, "text-emerald-500 dark:text-emerald-300")} />;
		case "schedule_adjustment_requested":
		case "schedule_adjustment_approved":
			return <Calendar className={cn(iconClassName, "text-blue-500 dark:text-blue-300")} />;
		case "proposal_status_update":
			return <FileSignature className={cn(iconClassName, "text-indigo-500 dark:text-indigo-300")} />;
		case "account_activated":
			return <UserCheck className={cn(iconClassName, "text-emerald-500 dark:text-emerald-300")} />;
		default:
			return <Bell className={cn(iconClassName, "text-muted-foreground")} />;
	}
}

export function NotificationDropdown() {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);

	const { data: unreadData } = useQuery(getUnreadCountQueryOptions);

	const { data: notifications, isLoading: notificationsLoading } = useQuery({
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

	const markAllReadMutation = useMutation({
		mutationFn: () => markAllNotificationsReadFn(),
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
					<span className="absolute top-2 right-2 flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
					</span>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-80 bg-popover before:hidden !duration-150 !ease-out"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
						<span>Notifications</span>
						<div className="flex items-center gap-2">
							{unreadCount > 0 && (
								<button
									type="button"
									onClick={() => markAllReadMutation.mutate()}
									disabled={markAllReadMutation.isPending}
									className="text-xs font-normal text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
								>
									Mark all as read
								</button>
							)}
							{unreadCount > 0 && (
								<span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
									{unreadCount} unread
								</span>
							)}
						</div>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
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
						<div className="flex flex-col gap-1 p-1">
							{notifications.map((n) => (
								<DropdownMenuItem
									key={n.notificationId}
									className={cn(
										"flex cursor-pointer flex-col items-start gap-1 p-2.5 rounded-md transition-colors text-left",
										!n.isRead && "bg-accent/40 hover:bg-accent/60",
									)}
									onSelect={() => {
										if (!n.isRead) {
											markReadMutation.mutate(n.notificationId);
										}
									}}
								>
									<div className="flex w-full items-start gap-2.5">
										{getNotificationIcon(n.type)}
										<div className="flex-1 min-w-0">
											<div className="text-sm font-semibold text-foreground leading-tight">
												{n.title}
											</div>
											<div className="mt-1 text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
												{n.message}
											</div>
										</div>
										{!n.isRead && (
										<span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
										)}
									</div>
									<span className="ml-6.5 text-[10px] text-muted-foreground/60">
										{timeAgo(n.createdAt)}
									</span>
								</DropdownMenuItem>
							))}
						</div>
					</ScrollArea>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
