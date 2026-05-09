import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import {
  setMockUser,
  MOCK_USERS,
  mockSelectChain,
  mockMutationChain,
} from "../../test/helpers.js";
import app from "./members.routes.js";

beforeEach(() => {
  setMockUser(MOCK_USERS.faculty);
});

describe("GET /proposals/:proposalId/members", () => {
  it("should return the member list", async () => {
    const mock = {
      memberId: "aaa",
      proposalId: "bbb",
      userId: "ccc",
      projectRole: "Researcher",
      addedAt: new Date(),
    };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

    const res = await app.request(
      "/proposals/eeeeeeee-5555-4555-8555-eeeeeeeeeeee/members",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /proposals/:proposalId/members", () => {
  const proposalId = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";

  it("should reject adding a member if not the project leader", async () => {
    const proposal = { proposalId, projectLeaderId: "someone-else" };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([proposal]) as never);

    const res = await app.request(`/proposals/${proposalId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "new-user",
        projectRole: "Member",
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_LEADER");
  });

  it("should reject duplicate membership", async () => {
    const proposal = {
      proposalId,
      projectLeaderId: MOCK_USERS.faculty.userId,
    };
    const targetUser = { userId: "existing-user" };
    const existing = { memberId: "m1" };

    let callCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelectChain([proposal]) as never;
      if (callCount === 2) return mockSelectChain([targetUser]) as never;
      return mockSelectChain([existing]) as never;
    });

    const res = await app.request(`/proposals/${proposalId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "existing-user",
        projectRole: "Member",
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE");
  });

  it("should add a member when user is the project leader", async () => {
    const proposal = {
      proposalId,
      projectLeaderId: MOCK_USERS.faculty.userId,
    };
    const targetUser = { userId: "new-u" };
    const created = {
      memberId: "new-m",
      proposalId,
      userId: "new-u",
      projectRole: "Member",
      addedAt: new Date(),
    };

    let callCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelectChain([proposal]) as never;
      if (callCount === 2) return mockSelectChain([targetUser]) as never;
      return mockSelectChain([]) as never; // No existing membership
    });
    vi.mocked(db.insert).mockReturnValue(mockMutationChain([created]) as never);

    const res = await app.request(`/proposals/${proposalId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "new-u",
        projectRole: "Member",
      }),
    });

    expect(res.status).toBe(201);
  });
});

describe("DELETE /proposals/:proposalId/members/:memberId", () => {
  const proposalId = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
  const memberId = "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa";

  it("should reject removal by non-leader", async () => {
    const proposal = { proposalId, projectLeaderId: "someone-else" };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([proposal]) as never);

    const res = await app.request(
      `/proposals/${proposalId}/members/${memberId}`,
      { method: "DELETE" },
    );

    expect(res.status).toBe(403);
  });
});
