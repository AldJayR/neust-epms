import { desc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "@/app.js";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { passwordResetTokens } from "@/db/schema/password-reset-tokens.js";
import { hashResetToken } from "@/lib/reset-token.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { seedAuthUser, seedOrganization } from "./fixtures.js";

const supabaseMock = vi.hoisted(() => ({
	auth: {
		getUser: vi.fn(),
		admin: {
			createUser: vi.fn(),
			deleteUser: vi.fn(),
			getUserById: vi.fn(),
			updateUserById: vi.fn(),
			signOut: vi.fn(),
		},
	},
	storage: {
		from: vi.fn(),
	},
}));

vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => supabaseMock),
}));

beforeEach(() => {
	supabaseMock.auth.getUser.mockReset();
	supabaseMock.auth.admin.updateUserById.mockReset();
	supabaseMock.auth.admin.signOut.mockReset();
});

describe("admin-generated password reset links", () => {
	async function seedResetAdmin() {
		const organization = await seedOrganization("reset-link");
		const admin = await seedAuthUser(organization, {
			slug: "reset-link-admin",
			roleName: ROLE_NAMES.SUPER_ADMIN,
		});
		const faculty = await seedAuthUser(organization, {
			slug: "reset-link-faculty",
			roleName: ROLE_NAMES.FACULTY,
		});
		return { organization, admin, faculty };
	}

	async function generateLink(userId: string) {
		const response = await app.request(
			`/api/v1/admin/users/${userId}/reset-password-link`,
			{
				method: "POST",
				headers: { Authorization: "Bearer integration-token" },
			},
		);
		expect(response.status).toBe(200);
		return (await response.json()) as { token: string; expiresAt: string };
	}

	it("generates a link, resets the password, and prevents reuse", async () => {
		const { admin, faculty } = await seedResetAdmin();
		supabaseMock.auth.getUser.mockResolvedValueOnce({
			data: { user: { id: admin.userId } },
			error: null,
		});

		const { token, expiresAt } = await generateLink(faculty.userId);

		const [stored] = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.tokenHash, hashResetToken(token)));
		expect(stored).toBeDefined();
		expect(stored.usedAt).toBeNull();
		expect(Math.abs(new Date(expiresAt).getTime() - stored.expiresAt.getTime())).toBeLessThanOrEqual(1000);

		const [generationAudit] = await db
			.select()
			.from(auditLogs)
			.where(eq(auditLogs.tableAffected, "password_reset_tokens"))
			.orderBy(desc(auditLogs.createdAt))
			.limit(1);
		expect(generationAudit).toBeDefined();
		expect(generationAudit.userId).toBe(admin.userId);

		supabaseMock.auth.admin.updateUserById.mockResolvedValue({
			data: { user: { id: faculty.userId } },
			error: null,
		});
		supabaseMock.auth.admin.signOut.mockResolvedValue({ error: null });

		const resetResponse = await app.request("/api/v1/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, newPassword: "BrandNewPassword99" }),
		});

		expect(resetResponse.status).toBe(200);
		expect(await resetResponse.json()).toEqual({ success: true });
		expect(supabaseMock.auth.admin.updateUserById).toHaveBeenCalledWith(
			faculty.userId,
			{ password: "BrandNewPassword99" },
		);
		expect(supabaseMock.auth.admin.signOut).toHaveBeenCalledWith(
			faculty.userId,
		);

		const [used] = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.id, stored.id));
		expect(used.usedAt).not.toBeNull();

		const [resetAudit] = await db
			.select()
			.from(auditLogs)
			.where(eq(auditLogs.tableAffected, "users"))
			.orderBy(desc(auditLogs.createdAt))
			.limit(1);
		expect(resetAudit).toBeDefined();
		expect(resetAudit.userId).toBe(faculty.userId);

		const reuseResponse = await app.request("/api/v1/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, newPassword: "AnotherPassword99" }),
		});
		expect(reuseResponse.status).toBe(400);
		expect((await reuseResponse.json()).error.code).toBe("INVALID_RESET_TOKEN");
	});

	it("revokes the previous link when a new one is generated", async () => {
		const { admin, faculty } = await seedResetAdmin();
		supabaseMock.auth.getUser.mockResolvedValue({
			data: { user: { id: admin.userId } },
			error: null,
		});

		const first = await generateLink(faculty.userId);
		const second = await generateLink(faculty.userId);

		const [firstRow] = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.tokenHash, hashResetToken(first.token)));
		expect(firstRow.usedAt).not.toBeNull();

		const secondRow = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.tokenHash, hashResetToken(second.token)));
		expect(secondRow[0].usedAt).toBeNull();

		supabaseMock.auth.admin.updateUserById.mockResolvedValue({
			data: { user: { id: faculty.userId } },
			error: null,
		});
		supabaseMock.auth.admin.signOut.mockResolvedValue({ error: null });

		const firstResponse = await app.request("/api/v1/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: first.token, newPassword: "Password99New" }),
		});
		expect(firstResponse.status).toBe(400);

		const secondResponse = await app.request("/api/v1/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: second.token, newPassword: "Password99New" }),
		});
		expect(secondResponse.status).toBe(200);
	});

	it("rejects an expired link", async () => {
		const { admin, faculty } = await seedResetAdmin();
		supabaseMock.auth.getUser.mockResolvedValueOnce({
			data: { user: { id: admin.userId } },
			error: null,
		});

		await db.insert(passwordResetTokens).values({
			userId: faculty.userId,
			tokenHash: hashResetToken("expired-link-token"),
			expiresAt: new Date(Date.now() - 60_000),
		});

		const response = await app.request("/api/v1/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				token: "expired-link-token",
				newPassword: "BrandNewPassword99",
			}),
		});

		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe("RESET_TOKEN_EXPIRED");
		expect(supabaseMock.auth.admin.updateUserById).not.toHaveBeenCalled();
	});
});