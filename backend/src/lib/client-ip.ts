import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { env } from "../env.js";

/**
 * Resolve the client IP for rate limiting and audit purposes.
 *
 * Forwarding headers (`x-forwarded-for`, `x-real-ip`) are client-controlled
 * and trivially spoofable, so they are only honored when the app is
 * explicitly deployed behind a trusted reverse proxy (TRUST_PROXY=true).
 * Otherwise the TCP socket address is used.
 */
export function getClientIp(c: Context): string {
	if (env.TRUST_PROXY) {
		const forwarded = c.req.header("x-forwarded-for");
		if (forwarded) {
			const first = forwarded.split(",")[0]?.trim();
			if (first) return first;
		}

		const realIp = c.req.header("x-real-ip");
		if (realIp) return realIp;
	}

	try {
		return getConnInfo(c).remote.address ?? "unknown";
	} catch {
		// Not running on the node-server adapter (e.g. tests via app.request)
		return "unknown";
	}
}
