import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import { supabase } from "@/lib/supabase.js";
import {
	setMockUser,
	MOCK_USERS,
	mockSelectChain,
	mockMutationChain,
} from "../../../test/helpers.js";
import app from "./special-orders.routes.js";
import { installApiErrorHandler } from "@/lib/errors.js";

installApiErrorHandler(app);

beforeEach(() => {
	setMockUser(MOCK_USERS.faculty);
});

describe("GET /special-orders", () => {
	it("should return a list of special orders", async () => {
		const mock = {
			specialOrderId: "aaa",
			memberId: "bbb",
			soNumber: "SO-001",
			storagePath: null,
			dateIssued: new Date(),
			status: "Pending",
			createdAt: new Date(),
			updatedAt: new Date(),
			archivedAt: null,
		};
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);
		const res = await app.request("/special-orders");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(1);
	});
});

describe("POST /special-orders", () => {
	it("should create a special order when member exists (EC-03)", async () => {
		const member = { memberId: "bbb" };
		const created = {
			specialOrderId: "aaa",
			memberId: "bbb",
			soNumber: "SO-002",
			storagePath: null,
			dateIssued: null,
			status: "Pending",
			createdAt: new Date(),
			updatedAt: new Date(),
			archivedAt: null,
		};
		vi.mocked(db.select).mockReturnValue(mockSelectChain([member]) as never);
		vi.mocked(db.insert).mockReturnValue(mockMutationChain([created]) as never);

		const res = await app.request("/special-orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ memberId: "bbb", soNumber: "SO-002" }),
		});
		expect(res.status).toBe(201);
	});

	it("should reject when member does not exist (EC-03)", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
		const res = await app.request("/special-orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				memberId: "nonexistent-uuid-0000-0000-000000000000",
				soNumber: "SO-003",
			}),
		});
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error.code).toBe("MEMBER_NOT_FOUND");
	});
});

describe("POST /special-orders/upload", () => {
	it("should reject an oversized upload before parsing the form", async () => {
		const res = await app.request("/special-orders/upload", {
			method: "POST",
			headers: { "Content-Length": String(50 * 1024 * 1024 + 1) },
		});

		expect(res.status).toBe(413);
		expect((await res.json()).error.code).toBe("FILE_TOO_LARGE");
		expect(db.select).not.toHaveBeenCalled();
	});

	it("should reject an oversized multipart PDF file", async () => {
		const formData = new FormData();
		formData.set(
			"file",
			new File([new Uint8Array(50 * 1024 * 1024 + 1)], "special-order.pdf", {
				type: "application/pdf",
			}),
		);
		formData.set("memberId", "member-1");
		formData.set("soNumber", "SO-004");

		const res = await app.request("/special-orders/upload", {
			method: "POST",
			body: formData,
		});

		expect(res.status).toBe(413);
		expect((await res.json()).error.code).toBe("FILE_TOO_LARGE");
		expect(db.select).not.toHaveBeenCalled();
	});

	it("should reject a non-PDF upload before looking up the member", async () => {
		const formData = new FormData();
		formData.set("file", new File(["text"], "special-order.txt", { type: "text/plain" }));
		formData.set("memberId", "member-1");
		formData.set("soNumber", "SO-004");

		const res = await app.request("/special-orders/upload", {
			method: "POST",
			body: formData,
		});

		expect(res.status).toBe(422);
		expect((await res.json()).error.code).toBe("INVALID_FILE_TYPE");
		expect(db.select).not.toHaveBeenCalled();
	});

	it("should validate that a file is present before looking up the member", async () => {
		const formData = new FormData();
		formData.set("memberId", "member-1");
		formData.set("soNumber", "SO-004");

		const res = await app.request("/special-orders/upload", {
			method: "POST",
			body: formData,
		});

		expect(res.status).toBe(400);
		expect((await res.json()).error.code).toBe("NO_FILE");
		expect(db.select).not.toHaveBeenCalled();
	});

	it("should reject a non-director who is not the proposal project leader", async () => {
		const formData = new FormData();
		formData.set(
			"file",
			new File(["pdf"], "special-order.pdf", { type: "application/pdf" }),
		);
		formData.set("memberId", "member-1");
		formData.set("soNumber", "SO-004");

		vi.mocked(db.select)
			.mockReturnValueOnce(
				mockSelectChain([{ memberId: "member-1", proposalId: "proposal-1" }]) as never,
			)
			.mockReturnValueOnce(mockSelectChain([]) as never);

		const res = await app.request("/special-orders/upload", {
			method: "POST",
			body: formData,
		});

		expect(res.status).toBe(403);
		expect((await res.json()).error.code).toBe("FORBIDDEN");
	});

	it("should let a Director upload and create a special order", async () => {
		setMockUser(MOCK_USERS.director);
		const formData = new FormData();
		formData.set(
			"file",
			new File(["pdf"], "special-order.pdf", { type: "application/pdf" }),
		);
		formData.set("memberId", "member-1");
		formData.set("soNumber", "SO-004");
		const created = {
			specialOrderId: "aaa",
			memberId: "member-1",
			soNumber: "SO-004",
			storagePath: "special-orders/member-1/order.pdf",
			dateIssued: null,
			status: "Pending",
			createdAt: new Date(),
			updatedAt: new Date(),
			archivedAt: null,
		};

		vi.mocked(db.select)
			.mockReturnValueOnce(
				mockSelectChain([{ memberId: "member-1", proposalId: "proposal-1" }]) as never,
			)
			.mockReturnValueOnce(mockSelectChain([]) as never);
		vi.mocked(db.insert).mockReturnValue(mockMutationChain([created]) as never);

		const res = await app.request("/special-orders/upload", {
			method: "POST",
			body: formData,
		});

		expect(res.status).toBe(201);
		expect((await res.json()).soNumber).toBe("SO-004");
	});

	it("should let a Project Leader upload and create a special order", async () => {
		const formData = new FormData();
		formData.set(
			"file",
			new File(["pdf"], "special-order.pdf", { type: "application/pdf" }),
		);
		formData.set("memberId", "member-1");
		formData.set("soNumber", "SO-004");
		const created = {
			specialOrderId: "aaa",
			memberId: "member-1",
			soNumber: "SO-004",
			storagePath: "special-orders/member-1/order.pdf",
			dateIssued: null,
			status: "Pending",
			createdAt: new Date(),
			updatedAt: new Date(),
			archivedAt: null,
		};

		vi.mocked(db.select)
			.mockReturnValueOnce(
				mockSelectChain([{ memberId: "member-1", proposalId: "proposal-1" }]) as never,
			)
			.mockReturnValueOnce(
				mockSelectChain([{ userId: MOCK_USERS.faculty.userId }]) as never,
			)
			.mockReturnValueOnce(mockSelectChain([]) as never);
		vi.mocked(db.insert).mockReturnValue(mockMutationChain([created]) as never);

		const res = await app.request("/special-orders/upload", {
			method: "POST",
			body: formData,
		});

		expect(res.status).toBe(201);
		expect((await res.json()).soNumber).toBe("SO-004");
	});

	it("should return a duplicate SO number error", async () => {
		setMockUser(MOCK_USERS.director);
		const formData = new FormData();
		formData.set(
			"file",
			new File(["pdf"], "special-order.pdf", { type: "application/pdf" }),
		);
		formData.set("memberId", "member-1");
		formData.set("soNumber", "SO-004");

		vi.mocked(db.select)
			.mockReturnValueOnce(
				mockSelectChain([{ memberId: "member-1", proposalId: "proposal-1" }]) as never,
			)
			.mockReturnValueOnce(mockSelectChain([]) as never);
		vi.mocked(db.insert).mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockRejectedValue({ code: "23505" }),
			}),
		} as never);

		const res = await app.request("/special-orders/upload", {
			method: "POST",
			body: formData,
		});

		expect(res.status).toBe(409);
		expect((await res.json()).error.code).toBe("DUPLICATE_SO_NUMBER");
	});
});

describe("GET /special-orders/:id/url", () => {
	it("should let a Director generate a one-hour signed URL", async () => {
		setMockUser(MOCK_USERS.director);
		const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([
				{
					specialOrderId: id,
					memberId: "member-1",
					soNumber: "SO-004",
					storagePath: "special-orders/member-1/order.pdf",
					dateIssued: null,
					status: "Pending",
					createdAt: new Date(),
					updatedAt: new Date(),
					archivedAt: null,
				},
			]) as never,
		);

		const res = await app.request(`/special-orders/${id}/url`);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			url: "https://test.supabase.co/signed-url",
		});
		const bucket = vi.mocked(supabase.storage.from).mock.results.at(-1)?.value;
		expect(bucket.createSignedUrl).toHaveBeenCalledWith(
			"special-orders/member-1/order.pdf",
			3600,
		);
	});

	it("should let the linked member generate a signed URL", async () => {
		const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		vi.mocked(db.select)
			.mockReturnValueOnce(
				mockSelectChain([
					{
						specialOrderId: id,
						memberId: "member-1",
						soNumber: "SO-004",
						storagePath: "special-orders/member-1/order.pdf",
						dateIssued: null,
						status: "Pending",
						createdAt: new Date(),
						updatedAt: new Date(),
						archivedAt: null,
					},
				]) as never,
			)
			.mockReturnValueOnce(
				mockSelectChain([
					{
						memberId: "member-1",
						proposalId: "proposal-1",
						userId: MOCK_USERS.faculty.userId,
					},
				]) as never,
			);

		const res = await app.request(`/special-orders/${id}/url`);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			url: "https://test.supabase.co/signed-url",
		});
	});

	it("should let a Project Leader generate a signed URL", async () => {
		const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		vi.mocked(db.select)
			.mockReturnValueOnce(
				mockSelectChain([
					{
						specialOrderId: id,
						memberId: "member-1",
						soNumber: "SO-004",
						storagePath: "special-orders/member-1/order.pdf",
						dateIssued: null,
						status: "Pending",
						createdAt: new Date(),
						updatedAt: new Date(),
						archivedAt: null,
					},
				]) as never,
			)
			.mockReturnValueOnce(
				mockSelectChain([
					{ memberId: "member-1", proposalId: "proposal-1", userId: "member-user" },
				]) as never,
			)
			.mockReturnValueOnce(
				mockSelectChain([{ userId: MOCK_USERS.faculty.userId }]) as never,
			);

		const res = await app.request(`/special-orders/${id}/url`);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			url: "https://test.supabase.co/signed-url",
		});
	});

	it("should reject a non-member who is not the Project Leader", async () => {
		const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		vi.mocked(db.select)
			.mockReturnValueOnce(
				mockSelectChain([
					{
						specialOrderId: id,
						memberId: "member-1",
						soNumber: "SO-004",
						storagePath: "special-orders/member-1/order.pdf",
						dateIssued: null,
						status: "Pending",
						createdAt: new Date(),
						updatedAt: new Date(),
						archivedAt: null,
					},
				]) as never,
			)
			.mockReturnValueOnce(
				mockSelectChain([
					{ memberId: "member-1", proposalId: "proposal-1", userId: "member-user" },
				]) as never,
			)
			.mockReturnValueOnce(mockSelectChain([]) as never);

		const res = await app.request(`/special-orders/${id}/url`);

		expect(res.status).toBe(403);
		expect((await res.json()).error.code).toBe("FORBIDDEN");
	});
});
