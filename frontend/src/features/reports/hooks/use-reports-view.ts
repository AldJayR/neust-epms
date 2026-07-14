import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { startTransition, useDeferredValue, useReducer, useState } from "react";
import { facultyProjectsQueryOptions } from "@/features/faculty/public";
import type { AuthUser } from "@/lib/auth";
import {
	createDirectorReportColumns,
	createFacultyReportColumns,
} from "../components/report-columns";
import { reportsListQueryOptions } from "../functions";
import {
	filterReportsByType,
	filterReportsForView,
	getProgressReportSequences,
	paginateReports,
} from "../helpers/reports-helpers";

interface ReportsViewState {
	activeTab: "my" | "college";
	search: string;
	page: number;
}

type ReportsViewAction =
	| { type: "tab"; value: "my" | "college" }
	| { type: "search"; value: string }
	| { type: "page"; value: number };

function reportsViewReducer(
	state: ReportsViewState,
	action: ReportsViewAction,
): ReportsViewState {
	switch (action.type) {
		case "tab":
			return { ...state, activeTab: action.value, page: 1 };
		case "search":
			return { ...state, search: action.value, page: 1 };
		case "page":
			return { ...state, page: action.value };
	}
}

export function useReportsView() {
	const user = useRouterState({
		select: (state) => {
			const authMatch = state.matches.find(
				(match) => match.routeId === "/_authenticated",
			);
			return (
				(authMatch?.context as { user: AuthUser | null } | undefined)?.user ??
				null
			);
		},
	});

	const isFaculty = user?.roleName === "Faculty";
	const isRET = user?.roleName === "RET Chair";
	const userFullName = user ? `${user.firstName} ${user.lastName}` : "";
	const [viewState, dispatchView] = useReducer(reportsViewReducer, {
		activeTab: isFaculty || isRET ? "my" : "college",
		search: "",
		page: 1,
	});
	const { activeTab, search, page } = viewState;
	const [typeFilter, setTypeFilter] = useState<"All" | "Progress" | "Terminal">(
		"All",
	);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
	const limit = 10;
	const deferredSearch = useDeferredValue(search);

	const { data: listData, isLoading: listLoading } = useQuery(
		reportsListQueryOptions({
			page: 1,
			limit: 100,
			search: deferredSearch || undefined,
		}),
	);
	const { data: projectsData, isLoading: projectsLoading } = useQuery({
		...facultyProjectsQueryOptions(),
		enabled: !!user,
	});

	const reports = listData?.items ?? [];
	const myProjectIds = new Set(
		projectsData?.items?.map((project) => project.projectId) ?? [],
	);
	const tabFilteredReports = filterReportsForView(reports, {
		activeTab,
		isRET: Boolean(isRET),
		userFullName,
		myProjectIds,
	});
	const filteredReports = filterReportsByType(tabFilteredReports, typeFilter);
	const progressReportSequences = getProgressReportSequences(reports);
	const directorColumns = createDirectorReportColumns(Boolean(isRET));
	const facultyColumns = createFacultyReportColumns(progressReportSequences);

	return {
		user,
		isFaculty: Boolean(isFaculty),
		isRET: Boolean(isRET),
		activeTab,
		search,
		page,
		limit,
		typeFilter,
		sorting,
		isSubmitModalOpen,
		isLoading: listLoading || (!!user && projectsLoading),
		totalReports: tabFilteredReports.length,
		progressCount: tabFilteredReports.filter(
			(report) => report.reportType === "Progress",
		).length,
		terminalCount: tabFilteredReports.filter(
			(report) => report.reportType === "Terminal",
		).length,
		paginatedReports: paginateReports(filteredReports, page, limit),
		filteredReports,
		columns: isFaculty ? facultyColumns : directorColumns,
		handleTabChange: (tab: "my" | "college") => {
			startTransition(() => dispatchView({ type: "tab", value: tab }));
		},
		handleSearch: (value: string) => {
			startTransition(() => dispatchView({ type: "search", value }));
		},
		setPage: (value: number) => dispatchView({ type: "page", value }),
		setSorting,
		setTypeFilter,
		setIsSubmitModalOpen,
	};
}
