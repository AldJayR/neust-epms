import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import { supabase } from "@/lib/supabase.js";
import {
	setMockUser,
	MOCK_USERS,
	createMockMoa,
	mockSelectChain,
} from "../../../test/helpers.js";
import app from "./index.js";
import { installApiErrorHandler } from "@/lib/errors.js";

installApiErrorHandler(app);

beforeEach(() => {
	setMockUser(MOCK_USERS.director);
});

describe("GET /moas", () => {
	it("should reject Super Admin from MOA access", async () => {
		setMockUser(MOCK_USERS.superAdmin);

		const res = await app.request("/moas");

		expect(res.status).toBe(403);
	});

	it("should return a list of MOAs", async () => {
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([createMockMoa()]) as never,
		);
		const res = await app.request("/moas");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(1);
	});
});

describe("GET /moas/:id/url", () => {
	it("returns a signed URL for an MOA document", async () => {
		const moaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([
				{
					moaId,
					partnerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
					partnerName: "Partner Organization",
					storagePath: "moas/partner/moa.pdf",
					validFrom: new Date("2026-01-01"),
					validUntil: new Date("2027-01-01"),
					createdAt: new Date("2026-01-01"),
					updatedAt: new Date("2026-01-01"),
					archivedAt: null,
				},
			]) as never,
		);

		const res = await app.request(`/moas/${moaId}/url`);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			url: "https://test.supabase.co/signed-url",
		});
		const bucket = vi.mocked(supabase.storage.from).mock.results.at(-1)?.value;
		expect(bucket.createSignedUrl).toHaveBeenCalledWith(
			"moas/partner/moa.pdf",
			3600,
		);
	});
});
