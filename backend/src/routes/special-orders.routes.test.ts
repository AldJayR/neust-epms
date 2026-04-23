import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import { setMockUser, MOCK_USERS, mockSelectChain, mockMutationChain } from "../../test/helpers.js";
import app from "./special-orders.routes.js";

beforeEach(() => { setMockUser(MOCK_USERS.faculty); });

describe("GET /special-orders", () => {
  it("should return a list of special orders", async () => {
    const mock = { specialOrderId: "aaa", memberId: "bbb", soNumber: "SO-001", storagePath: null, dateIssued: new Date(), status: "Pending", createdAt: new Date(), updatedAt: new Date(), archivedAt: null };
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
    const created = { specialOrderId: "aaa", memberId: "bbb", soNumber: "SO-002", storagePath: null, dateIssued: null, status: "Pending", createdAt: new Date(), updatedAt: new Date(), archivedAt: null };
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
      body: JSON.stringify({ memberId: "nonexistent-uuid-0000-0000-000000000000", soNumber: "SO-003" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("MEMBER_NOT_FOUND");
  });
});
