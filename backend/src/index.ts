import { serve } from "@hono/node-server";
import * as Sentry from "@sentry/node";
import app from "./app.js";
import { startMoaExpirationCron } from "./cron/moa-expiration.js";
import { startPrivacyRetentionCron } from "./cron/privacy-retention.js";
import { startReportOverdueCron } from "./cron/report-overdue.js";
import { env } from "./env.js";

// ── Sentry initialization ──
if (env.SENTRY_DSN) {
	Sentry.init({
		dsn: env.SENTRY_DSN,
		environment: env.NODE_ENV,
		tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,
		beforeSend(event) {
			if (event.request) {
				delete event.request.headers;
				delete event.request.data;
				delete event.request.cookies;
			}
			if (event.user) {
				delete event.user.email;
				delete event.user.username;
			}
			return event;
		},
	});
	console.log("[SENTRY] Initialized.");
}

// ── Start cron jobs ──
startMoaExpirationCron();
startReportOverdueCron();
startPrivacyRetentionCron();

// ── Start HTTP server ──
const port = env.PORT;

serve(
	{
		fetch: app.fetch,
		port,
	},
	(info) => {
		console.log(`🚀 NEUST-EPMS API running at http://localhost:${info.port}`);
		console.log(`📄 Swagger UI at http://localhost:${info.port}/api/swagger`);
		console.log(`📋 OpenAPI spec at http://localhost:${info.port}/api/doc`);
	},
);
