import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import { setMockUser, MOCK_USERS, createMockMoa, mockSelectChain, mockMutationChain } from "../../test/helpers.js";
import app from "./moas.routes.js";

beforeEach(() => { setMockUser(MOCK_USERS.faculty); });

describe("GET /moas", () => {
  it("should return a list of MOAs", async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectChain([createMockMoa()]) as never);
    const res = await app.request("/moas");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /moas", () => {
  it("should create a MOA with valid dates", async () => {
    vi.mocked(db.insert).mockReturnValue(mockMutationChain([createMockMoa()]) as never);
    const res = await app.request("/moas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerName: "Test", partnerType: "LGU", validFrom: "2025-01-01T00:00:00.000Z", validUntil: "2027-12-31T00:00:00.000Z" }),
    });
    expect(res.status).toBe(201);
  });

  it("should reject when validUntil is before validFrom", async () => {
    const res = await app.request("/moas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerName: "Test", partnerType: "NGO", validFrom: "2027-01-01T00:00:00.000Z", validUntil: "2025-01-01T00:00:00.000Z" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_DATES");
  });
});
