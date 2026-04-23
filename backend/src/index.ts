import { serve } from "@hono/node-server";
import * as Sentry from "@sentry/node";
import { env } from "./env.js";
import app from "./app.js";
import { startMoaExpirationCron } from "./cron/moa-expiration.js";

// ── Sentry initialization ──
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,
  });
  console.log("[SENTRY] Initialized.");
}

// ── Start cron jobs ──
startMoaExpirationCron();

// ── Start HTTP server ──
const port = env.PORT;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`🚀 NEUST-EPMS API running at http://localhost:${info.port}`);
    console.log(
      `📄 Swagger UI at http://localhost:${info.port}/api/swagger`,
    );
    console.log(
      `📋 OpenAPI spec at http://localhost:${info.port}/api/doc`,
    );
  },
);
