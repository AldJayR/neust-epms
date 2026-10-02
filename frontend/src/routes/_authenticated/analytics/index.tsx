import { createFileRoute, redirect } from "@tanstack/react-router";
import { analyticsSearchSchema } from "@/features/analytics/schema";
export const Route = createFileRoute("/_authenticated/analytics/")({
	validateSearch: analyticsSearchSchema,
	beforeLoad: ({ search }) => {
		throw redirect({
			to: "/analytics/$view",
			params: { view: "reach" },
			search,
		});
	},
});
