import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		include: ["src/**/*.unit.test.ts"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		environment: "node",
		globals: true,
		setupFiles: [],
		clearMocks: true,
		restoreMocks: true,
		mockReset: true,
		isolate: true,
		fileParallelism: true,
	},
});
