import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/features/director/reports-page";

export const Route = createFileRoute("/_authenticated/reports/")({
	component: ReportsPage,
});
