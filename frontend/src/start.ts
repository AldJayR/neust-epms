import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";

const CSP_NONCE_HEADER = "x-csp-nonce";
const csrfMiddleware = createCsrfMiddleware({
	filter: (context) => context.handlerType === "serverFn",
});
const apiOrigin = (() => {
	try {
		return new URL(process.env.API_URL ?? "http://localhost:3001").origin;
	} catch {
		return "http://localhost:3001";
	}
})();

const securityHeadersMiddleware = createMiddleware().server(
	async ({ request, next }) => {
		const nonce = crypto.randomUUID();
		request.headers.set(CSP_NONCE_HEADER, nonce);

		const result = await next();
		const responseHeaders = result.response.headers;
		responseHeaders.set(
			"Content-Security-Policy",
			[
				"default-src 'self'",
				`script-src 'self' 'nonce-${nonce}'`,
				"style-src 'self' 'unsafe-inline'",
				"img-src 'self' data: blob: https://*.supabase.co",
				"font-src 'self' data:",
				`connect-src 'self' ${apiOrigin} https://*.supabase.co`,
				"worker-src 'self' blob:",
				"object-src 'none'",
				"base-uri 'self'",
				"form-action 'self'",
				"frame-ancestors 'none'",
				"frame-src 'none'",
			].join("; "),
		);
		responseHeaders.set("X-Content-Type-Options", "nosniff");
		responseHeaders.set("X-Frame-Options", "DENY");
		responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
		responseHeaders.set(
			"Permissions-Policy",
			"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
		);

		const forwardedProto = request.headers.get("x-forwarded-proto");
		if (
			request.url.startsWith("https:") ||
			forwardedProto?.split(",", 1)[0]?.trim() === "https"
		) {
			responseHeaders.set(
				"Strict-Transport-Security",
				"max-age=31536000; includeSubDomains",
			);
		}

		return result;
	},
);

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware, securityHeadersMiddleware],
}));
