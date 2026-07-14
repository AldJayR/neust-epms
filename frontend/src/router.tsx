import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

const getCspNonce = createIsomorphicFn()
	.server(() => {
		const { getRequest } = require("@tanstack/react-start/server");
		return getRequest().headers.get("x-csp-nonce") ?? undefined;
	})
	.client(() => undefined);

export function getRouter() {
	const context = getContext();
	const cspNonce = getCspNonce();

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
