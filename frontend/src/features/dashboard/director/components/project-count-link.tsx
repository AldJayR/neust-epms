import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { DirectorOverviewFilters } from "@/types/dashboard";
import { useDirectorDashboardState } from "../use-director-dashboard-state";

export function ProjectCountLink({
	filters,
	status,
	kind = "projects",
	children,
	label,
}: {
	filters: DirectorOverviewFilters;
	status?: string;
	kind?: "projects" | "submitted";
	children: ReactNode;
	label: string;
}) {
	const { state } = useDirectorDashboardState();
	return (
		<Link
			to="/projects"
			search={{
				page: 1,
				limit: 10,
				...filters,
				kind,
				status,
				dashboard: state,
			}}
			aria-label={label}
			className="block rounded-md text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{children}
		</Link>
	);
}
