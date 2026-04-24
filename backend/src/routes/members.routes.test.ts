/**
 * Integration tests for members.routes.ts
 *
 * Tests project leadership enforcement and duplicate prevention.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import {
  setMockUser,
  MOCK_USERS,
  createMockProposal,
  mockSelectChain,
  mockMutationChain,
} from "../../test/helpers.js";
import app from "./members.routes.js";

const PROPOSAL_ID = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
const MEMBER_ID = "ffffffff-8888-4888-8888-ffffffffffff";
const TARGET_USER_ID = "99999999-9999-4999-8999-999999999999";

beforeEach(() => {
  setMockUser(MOCK_USERS.faculty);
});

describe("GET /proposals/:proposalId/members", () => {
  it("should return the member list", async () => {
    const mockMember = {
      memberId: MEMBER_ID,
      proposalId: PROPOSAL_ID,
      userId: TARGET_USER_ID,
      projectRole: "Researcher",
      addedAt: new Date(),
    };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mockMember]) as never);

    const res = await app.request(`/proposals/${PROPOSAL_ID}/members`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /proposals/:proposalId/members", () => {
  it("should reject adding a member if not the project leader", async () => {
    const proposal = createMockProposal({ projectLeaderId: "someone-else" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([proposal]) as never);

    const res = await app.request(`/proposals/${PROPOSAL_ID}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: TARGET_USER_ID, projectRole: "Researcher" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_LEADER");
  });

  it("should reject duplicate membership", async () => {
    const proposal = createMockProposal();
    const targetUser = { userId: TARGET_USER_ID };
    const existingMember = { memberId: MEMBER_ID };

    let callCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelectChain([proposal]) as never;
      if (callCount === 2) return mockSelectChain([targetUser]) as never;
      return mockSelectChain([existingMember]) as never;
    });

    const res = await app.request(`/proposals/${PROPOSAL_ID}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: TARGET_USER_ID, projectRole: "Researcher" }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE");
  });

  it("should add a member when user is the project leader", async () => {
    const proposal = createMockProposal();
    const targetUser = { userId: TARGET_USER_ID };
    const newMember = {
      memberId: MEMBER_ID,
      proposalId: PROPOSAL_ID,
      userId: TARGET_USER_ID,
      projectRole: "Researcher",
      addedAt: new Date(),
    };

    let callCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelectChain([proposal]) as never;
      if (callCount === 2) return mockSelectChain([targetUser]) as never;
      return mockSelectChain([]) as never; // No existing member
    });
    vi.mocked(db.insert).mockReturnValue(mockMutationChain([newMember]) as never);

    const res = await app.request(`/proposals/${PROPOSAL_ID}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: TARGET_USER_ID, projectRole: "Researcher" }),
    });

    expect(res.status).toBe(201);
  });
});

describe("DELETE /proposals/:proposalId/members/:memberId", () => {
  it("should reject removal by non-leader", async () => {
    const proposal = createMockProposal({ projectLeaderId: "someone-else" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([proposal]) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}/members/${MEMBER_ID}`,
      { method: "DELETE" },
    );

    expect(res.status).toBe(403);
  });
});
