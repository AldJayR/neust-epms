import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import { setMockUser, MOCK_USERS, mockSelectChain, mockMutationChain } from "../../test/helpers.js";
import app from "./audit.routes.js";

beforeEach(() => { setMockUser(MOCK_USERS.superAdmin); });

describe("GET /audit-logs", () => {
  it("should allow Super Admin to view audit logs", async () => {
    const mockLog = { logId: "aaa", userId: "bbb", action: "test", tableAffected: "users", ipAddress: null, createdAt: new Date() };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mockLog]) as never);
    const res = await app.request("/audit-logs?page=1&limit=10");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });

  it("should reject non-Super Admin users", async () => {
    setMockUser(MOCK_USERS.faculty);
    const res = await app.request("/audit-logs?page=1&limit=10");
    expect(res.status).toBe(403);
  });
});
