import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = getContext();
	const cspNonce =
		typeof window === "undefined"
			? getRequest().headers.get("x-csp-nonce") ?? undefined
			: undefined;

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		ssr: cspNonce ? { nonce: cspNonce } : undefined,
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
