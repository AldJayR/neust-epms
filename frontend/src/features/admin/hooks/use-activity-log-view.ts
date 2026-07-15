import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import * as React from "react";
import {
	type AuditLog,
	auditLogsQueryOptions,
	auditStatsQueryOptions,
} from "../functions";

export type ActivityLogType =
	| "Approval"
	| "Upload"
	| "Login"
	| "Status"
	| "Account"
	| "System";

export function getActivityLogType(
	action: string,
	tableAffected: string,
): ActivityLogType {
	const lowerAction = action.toLowerCase();
	if (lowerAction.includes("approved proposal")) return "Approval";
	if (lowerAction.includes("submitted") || lowerAction.includes("upload")) {
		return "Upload";
	}
	if (lowerAction.includes("login") || lowerAction.includes("logged in")) {
		return "Login";
	}
	if (lowerAction.includes("status")) return "Status";
	if (tableAffected === "users" || lowerAction.includes("account")) {
		return "Account";
	}
	return "System";
}

export function formatActivityAction(action: string) {
	return action.replace(/\s+/g, " ").trim();
}

export function useActivityLogView({
	page,
	limit,
	search,
}: {
	page: number;
	limit: number;
	search?: string;
}) {
	const [typeFilter, setTypeFilter] = React.useState<ActivityLogType | "all">(
		"all",
	);
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);
	const { data: statsData } = useQuery(auditStatsQueryOptions());
	const { data: logsData, isLoading } = useQuery(
		auditLogsQueryOptions({ page, limit, search }),
	);

	const logs = (() => {
		const all = logsData?.items ?? [];
		if (typeFilter === "all") return all;
		return all.filter(
			(log) => getActivityLogType(log.action, log.tableAffected) === typeFilter,
		);
	})();

	return {
		logs,
		statsData,
		total: logsData?.total ?? 0,
		isLoading,
		typeFilter,
		setTypeFilter,
		sorting,
		setSorting,
		selectedLog,
		setSelectedLog,
	};
}
