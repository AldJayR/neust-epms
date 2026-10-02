import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit and server-function tests should not start Cloudflare or the application.
export default defineConfig({
	resolve: { alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src") } },
	test: { environment: "node", globals: true, maxWorkers: 1, fileParallelism: false },
});
