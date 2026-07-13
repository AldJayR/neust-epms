import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth";
import { facultyProjectsQueryOptions } from "@/features/faculty/public";
import { reportsListQueryOptions } from "../functions";
import {
	filterReportsByType,
	filterReportsForView,
	getProgressReportSequences,
	paginateReports,
} from "../helpers/reports-helpers";
import {
	createDirectorReportColumns,
	createFacultyReportColumns,
} from "../components/report-columns";

export function useReportsView() {
	const user = useRouterState({
		select: (state) => {
			const authMatch = state.matches.find(
				(match) => match.routeId === "/_authenticated",
			);
			return (
				(authMatch?.context as { user: AuthUser | null } | undefined)?.user ?? null
			);
		},
	});

	const isFaculty = user?.roleName === "Faculty";
	const isRET = user?.roleName === "RET Chair";
	const userFullName = user ? `${user.firstName} ${user.lastName}` : "";
	const [activeTab, setActiveTab] = useState<"my" | "college">(
		isFaculty || isRET ? "my" : "college",
	);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
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
	const progressReportSequences = useMemo(
		() => getProgressReportSequences(reports),
		[reports],
	);
	const directorColumns = useMemo(
		() => createDirectorReportColumns(Boolean(isRET)),
		[isRET],
	);
	const facultyColumns = useMemo(
		() => createFacultyReportColumns(progressReportSequences),
		[progressReportSequences],
	);

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
		progressCount: tabFilteredReports.filter((report) => report.reportType === "Progress").length,
		terminalCount: tabFilteredReports.filter((report) => report.reportType === "Terminal").length,
		paginatedReports: paginateReports(filteredReports, page, limit),
		filteredReports,
		columns: isFaculty ? facultyColumns : directorColumns,
		handleTabChange: (tab: "my" | "college") => {
			setActiveTab(tab);
			startTransition(() => setPage(1));
		},
		handleSearch: (value: string) => {
			setSearch(value);
			startTransition(() => setPage(1));
		},
		setPage,
		setSorting,
		setTypeFilter,
		setIsSubmitModalOpen,
	};
}
