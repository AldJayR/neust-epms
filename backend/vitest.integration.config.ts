import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		include: ["test/integration/**/*.integration.spec.ts"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		environment: "node",
		globals: true,
		setupFiles: ["./test/integration/setup.ts"],
		fileParallelism: false,
		pool: "forks",
		maxWorkers: 1,
		isolate: true,
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});
