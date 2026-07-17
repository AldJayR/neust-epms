/**
 * Global test setup file.
 * Runs before every test file. Mocks external services
 * so tests never hit real Supabase, Resend, or Sentry.
 */
import { vi } from "vitest";

// ── Default mock user (Faculty) ──
(globalThis as Record<string, unknown>).__testMockUser = {
	userId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
	email: "faculty@neust.edu.ph",
	roleId: 4,
	roleName: "Faculty",
	campusId: 1,
	campusName: "Cabanatuan City (Main)",
	departmentId: 1,
	departmentName: "Management Information System (MIS)",
	firstName: "Faculty",
	middleName: null,
	lastName: "User",
	nameSuffix: null,
	academicRank: "Instructor",
	isActive: true,
};

// ── Mock the env module ──
vi.mock("../src/env.js", () => ({
	env: {
		PORT: "3000",
		NODE_ENV: "test",
		CORS_ORIGINS: ["http://localhost:3001", "http://localhost:5173"],
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
		execute: vi.fn().mockResolvedValue({ rows: [] }),
		transaction: vi.fn((callback) => callback(mockDb)),
	};
	return { db: mockDb, pool: {} };
});

// ── Mock the audit logger ──
vi.mock("../src/lib/audit.js", () => ({
	insertAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock Supabase Auth ──
const mockSupabase = {
	auth: {
		getUser: vi.fn().mockResolvedValue({
			data: { user: { id: "test-user-id" } as any },
			error: null,
		}),
		admin: {
			createUser: vi.fn().mockResolvedValue({
				data: { user: { id: "new-supabase-id" } },
				error: null,
			}),
			deleteUser: vi.fn().mockResolvedValue({ error: null }),
			getUserById: vi.fn(async (id: string) => {
				const email =
					id === "bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb"
						? "new@neust.edu.ph"
						: "fail@neust.edu.ph";
				return {
					data: { user: { id, email } },
					error: null,
				};
			}),
		},
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
};

vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => mockSupabase),
}));

// ── Mock auth middleware (injects __testMockUser) ──
vi.mock("../src/middleware/auth.js", () => ({
	authMiddleware: async (
		c: { set: (key: string, value: unknown) => void },
		next: () => Promise<void>,
	) => {
		c.set("user", (globalThis as Record<string, unknown>).__testMockUser);
		await next();
	},
}));
