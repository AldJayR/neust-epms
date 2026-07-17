import handler from "@tanstack/react-start/server-entry";

function getRuntimeConfigStatus() {
	return {
		hasApiUrl: Boolean(process.env.API_URL),
		hasSessionSecret: Boolean(process.env.SESSION_SECRET),
		hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
		hasSupabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
		nodeEnv: process.env.NODE_ENV ?? "unset",
	};
}

export default {
	async fetch(request: Request) {
		try {
			const response = await handler.fetch(request);
			if (response.status >= 500) {
				console.error("[worker] Server returned an error response", {
					path: new URL(request.url).pathname,
					status: response.status,
					config: getRuntimeConfigStatus(),
				});
			}
			return response;
		} catch (error) {
			console.error("[worker] Unhandled request error", {
				path: new URL(request.url).pathname,
				error:
					error instanceof Error
						? { name: error.name, message: error.message, stack: error.stack }
						: String(error),
				config: getRuntimeConfigStatus(),
			});
			throw error;
		}
	},
};
