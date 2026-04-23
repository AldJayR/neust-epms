import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test file patterns
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],

    // Node environment (not jsdom — this is a backend API)
    environment: "node",

    // Make vi, describe, it, expect available globally
    globals: true,

    // Setup files run before every test file
    setupFiles: ["./test/setup.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/index.ts", // Entry point with side effects
        "src/env.ts", // Env config
      ],
    },

    // Timeouts
    testTimeout: 10_000,
    hookTimeout: 15_000,

    // Reset mocks between tests to prevent leakage
    clearMocks: true,
    restoreMocks: true,

    // Run tests in sequence to avoid DB connection conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
