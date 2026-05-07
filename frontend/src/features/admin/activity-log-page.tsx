import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Search,
	Download,
	CircleCheck,
	CloudUpload,
	LogIn,
	Settings,
	UserCircle,
	MoreVertical,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	auditLogsQueryOptions,
	auditStatsQueryOptions,
} from "@/lib/admin.functions";

interface ActivityLogPageProps {
	page: number;
	limit: number;
	search?: string;
	onSearch: (search: string | undefined) => void;
	onPageChange: (page: number) => void;
}

export function ActivityLogPage({
	page,
	limit,
	search,
	onSearch,
	onPageChange,
}: ActivityLogPageProps) {
	const [searchInput, setSearchInput] = React.useState(search ?? "");

	const statsQuery = useQuery(auditStatsQueryOptions());
	const logsQuery = useQuery(auditLogsQueryOptions({ page, limit, search }));

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSearch(searchInput || undefined);
	};

	const stats = [
		{
			label: "Total actions today",
			value: statsQuery.data?.totalActionsToday ?? "...",
		},
		{
			label: "Unique users active",
			value: statsQuery.data?.uniqueUsersActive ?? "...",
		},
		{
			label: "Account changes",
			value: statsQuery.data?.accountChanges ?? "...",
		},
		{
			label: "Failed logins",
			value: statsQuery.data?.failedLogins ?? "...",
		},
	];

	const getActionTypeInfo = (action: string, table: string) => {
		const lowerAction = action.toLowerCase();
		if (lowerAction.includes("approved proposal")) {
			return { label: "Approval", icon: <CircleCheck className="size-3" /> };
		}
		if (lowerAction.includes("submitted") || lowerAction.includes("upload")) {
			return { label: "Upload", icon: <CloudUpload className="size-3" /> };
		}
		if (lowerAction.includes("login") || lowerAction.includes("logged in")) {
			return { label: "Login", icon: <LogIn className="size-3" /> };
		}
		if (lowerAction.includes("status")) {
			return { label: "Status", icon: <Settings className="size-3" /> };
		}
		if (table === "users" || lowerAction.includes("account")) {
			return { label: "Account", icon: <UserCircle className="size-3" /> };
		}
		return { label: "System", icon: <Settings className="size-3" /> };
	};

	const exportToCsv = () => {
		// Placeholder for CSV export
		console.log("Exporting to CSV...");
	};

	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
	});

	const timeFormatter = new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-[#11215a]">Activity Log</h1>
				<Button
					onClick={exportToCsv}
					className="bg-[#1e3b8a] hover:bg-[#1e3b8a]/90 text-white rounded-[10px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] h-9 px-3 gap-1.5"
				>
					<Download className="size-4" />
					<span>Export CSV</span>
				</Button>
			</div>

			<div className="grid gap-6 md:grid-cols-4">
				{stats.map((stat) => (
					<Card
						key={stat.label}
						className="border-[#ebebeb] rounded-[12px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden"
					>
						<CardContent className="p-4 flex flex-col gap-4">
							<p className="text-sm text-[#666] leading-none">{stat.label}</p>
							<p className="text-4xl font-semibold text-[#11215a] leading-tight">
								{stat.value}
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="flex items-center justify-between">
				<form
					onSubmit={handleSearchSubmit}
					className="relative w-full max-w-[352px]"
				>
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder="Search by users or email"
						className="pl-9 h-9 border-[#e5e5e5] rounded-[8px]"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
					/>
				</form>
				<Button
					variant="outline"
					size="icon"
					className="h-9 w-9 border-[#e5e5e5] rounded-[8px] shadow-sm"
				>
					<Filter className="size-4" />
				</Button>
			</div>

			<div className="border border-[#ebebeb] rounded-[12px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden bg-white">
				<Table>
					<TableHeader className="bg-white">
						<TableRow className="border-b-[#ebebeb] hover:bg-transparent">
							<TableHead className="w-[140px] font-medium text-[#666] text-sm py-2.5">
								Time
							</TableHead>
							<TableHead className="font-medium text-[#666] text-sm py-2.5">
								Action
							</TableHead>
							<TableHead className="w-[200px] font-medium text-[#666] text-sm py-2.5">
								Actor
							</TableHead>
							<TableHead className="w-[130px] font-medium text-[#666] text-sm py-2.5 text-center">
								Type
							</TableHead>
							<TableHead className="w-[50px] py-2.5" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{logsQuery.isLoading ? (
							<TableRow>
								<TableCell colSpan={5} className="h-32 text-center">
									<Loader2 className="size-8 animate-spin mx-auto text-primary/20" />
								</TableCell>
							</TableRow>
						) : logsQuery.data?.items.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="h-32 text-center text-muted-foreground"
								>
									No activities found.
								</TableCell>
							</TableRow>
						) : (
							logsQuery.data?.items.map((log) => {
								const typeInfo = getActionTypeInfo(log.action, log.tableAffected);
								const createdAt = new Date(log.createdAt);
								return (
									<TableRow key={log.logId} className="border-b-[#e5e5e5]">
										<TableCell className="py-2.5">
											<div className="flex flex-col">
												<span className="text-sm text-[#0a0a0a]">
													{dateFormatter.format(createdAt)}
												</span>
												<span className="text-xs text-[#666]">
													{timeFormatter.format(createdAt)}
												</span>
											</div>
										</TableCell>
										<TableCell className="py-2.5 text-sm text-[#0a0a0a] leading-normal">
											{log.action}
										</TableCell>
										<TableCell className="py-2.5">
											<div className="flex flex-col">
												<span className="text-sm text-[#0a0a0a]">
													{log.actorName ?? "System"}
												</span>
												<span className="text-xs text-muted-foreground">
													{log.actorRole ?? "Automated"}
												</span>
											</div>
										</TableCell>
										<TableCell className="py-2.5 text-center">
											<Badge
												variant="outline"
												className="font-medium text-[#737373] border-[#e5e5e5] h-[22px] px-1.5 gap-1 rounded-[8px]"
											>
												{typeInfo.icon}
												<span>{typeInfo.label}</span>
											</Badge>
										</TableCell>
										<TableCell className="py-2.5 text-center">
											<Button variant="ghost" size="icon" className="size-8">
												<MoreVertical className="size-4" />
											</Button>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between">
				<p className="text-xs text-[#666]">
					Showing{" "}
					<span className="font-bold">
						{logsQuery.data ? logsQuery.data.items.length : 0}
					</span>{" "}
					of <span className="font-bold">{logsQuery.data?.total ?? 0}</span> results
				</p>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="gap-1 h-9 px-3 text-[#0a0a0a] font-medium"
						disabled={page === 1}
						onClick={() => onPageChange(page - 1)}
					>
						<ChevronLeft className="size-4" />
						<span>Previous</span>
					</Button>
					{[1, 2, 3].map((p) => (
						<Button
							key={p}
							variant={page === p ? "outline" : "ghost"}
							size="icon"
							className={cn(
								"size-9 rounded-[8px]",
								page === p && "border-[#e5e5e5] shadow-sm",
							)}
							onClick={() => onPageChange(p)}
						>
							{p}
						</Button>
					))}
					<div className="px-2 text-muted-foreground">
						<MoreVertical className="size-4 rotate-90" />
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="gap-1 h-9 px-3 text-[#0a0a0a] font-medium"
						onClick={() => onPageChange(page + 1)}
						disabled={
							logsQuery.data ? page * limit >= logsQuery.data.total : true
						}
					>
						<span>Next</span>
						<ChevronRight className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
