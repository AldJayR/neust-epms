/**
 * Global test setup file.
 * Runs before every test file. Mocks external services
 * so tests never hit real Supabase, Resend, or Sentry.
 */
import { vi } from "vitest";

// ── Default mock user (Faculty) ──
(globalThis as Record<string, unknown>).__testMockUser = {
  userId: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
  email: "faculty@neust.edu.ph",
  roleId: 4,
  roleName: "Faculty",
  campusId: 1,
  departmentId: 1,
};

// ── Mock the env module ──
vi.mock("../src/env.js", () => ({
  env: {
    PORT: "3000",
    DATABASE_URL: "postgresql://test:test@localhost:5432/neust_epms_test",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    RESEND_API_KEY: "re_test_key",
    RESEND_FROM: "test@neust.edu.ph",
    SENTRY_DSN: "",
  },
}));

// ── Mock the database client ──
vi.mock("../src/db/client.js", () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  };
  return { db: mockDb, pool: {} };
});

// ── Mock the audit logger ──
vi.mock("../src/lib/audit.js", () => ({
  insertAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock Supabase Auth (used in auth middleware) ──
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Not configured" },
      }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://test.supabase.co/signed-url" },
          error: null,
        }),
      })),
    },
  })),
}));

// ── Mock auth middleware (pass-through, injects __testMockUser) ──
vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: async (
    c: { set: (key: string, value: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set("user", (globalThis as Record<string, unknown>).__testMockUser);
    await next();
  },
}));
