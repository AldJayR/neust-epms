import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import { setMockUser, MOCK_USERS, mockSelectChain, mockMutationChain } from "../../test/helpers.js";
import app from "./settings.routes.js";

beforeEach(() => { setMockUser(MOCK_USERS.superAdmin); });

describe("GET /settings", () => {
  it("should return all settings", async () => {
    const mock = { settingKey: "moa_expiry_days", settingValue: "30", updatedAt: new Date() };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);
    const res = await app.request("/settings");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });
});

describe("PUT /settings", () => {
  it("should allow Super Admin to upsert a setting", async () => {
    const mock = { settingKey: "moa_expiry_days", settingValue: "60", updatedAt: new Date() };
    vi.mocked(db.insert).mockReturnValue(mockMutationChain([mock]) as never);
    const res = await app.request("/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settingKey: "moa_expiry_days", settingValue: "60" }),
    });
    expect(res.status).toBe(200);
  });

  it("should reject non-Super Admin", async () => {
    setMockUser(MOCK_USERS.faculty);
    const res = await app.request("/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settingKey: "test", settingValue: "val" }),
    });
    expect(res.status).toBe(403);
  });
});
