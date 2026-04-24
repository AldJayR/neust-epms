/**
 * Integration tests for proposals.routes.ts
 *
 * Tests the full proposal lifecycle state machine,
 * conflict-of-interest rules (EC-01), and RBAC enforcement.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import {
  setMockUser,
  MOCK_USERS,
  createMockProposal,
  mockSelectChain,
  mockMutationChain,
  mockTransaction,
} from "../../test/helpers.js";
import app from "./proposals.routes.js";

const PROPOSAL_ID = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";

beforeEach(() => {
  setMockUser(MOCK_USERS.faculty);
});

describe("GET /proposals", () => {
  it("should return a list of proposals", async () => {
    const mockProposal = createMockProposal();
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mockProposal]) as never);

    const res = await app.request("/proposals");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("should return empty list when no proposals exist", async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

    const res = await app.request("/proposals");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });
});

describe("GET /proposals/:id", () => {
  it("should return 404 when proposal not found", async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

    const res = await app.request(`/proposals/${PROPOSAL_ID}`);
    expect(res.status).toBe(404);
  });

  it("should return proposal when found", async () => {
    const mock = createMockProposal();
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

    const res = await app.request(`/proposals/${PROPOSAL_ID}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.title).toBe("Community Health Extension Program");
  });
});

describe("POST /proposals", () => {
  it("should create a proposal with transaction", async () => {
    const mock = createMockProposal();
    vi.mocked(db.transaction).mockImplementation(mockTransaction(mock) as never);

    const res = await app.request("/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campusId: 1,
        departmentId: 1,
        title: "Test Proposal",
        bannerProgram: "Test Program",
        projectLocale: "Test City",
        extensionCategory: "Training",
        extensionAgenda: "Health",
      }),
    });

    expect(res.status).toBe(201);
  });

  it("should reject non-numeric budgets", async () => {
    const res = await app.request("/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campusId: 1,
        departmentId: 1,
        title: "Test Proposal",
        bannerProgram: "Test Program",
        projectLocale: "Test City",
        extensionCategory: "Training",
        extensionAgenda: "Health",
        budgetPartner: "not-a-number",
        budgetNeust: "25000.00",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("should reject negative budgets", async () => {
    const res = await app.request("/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campusId: 1,
        departmentId: 1,
        title: "Test Proposal",
        bannerProgram: "Test Program",
        projectLocale: "Test City",
        extensionCategory: "Training",
        extensionAgenda: "Health",
        budgetPartner: -1,
        budgetNeust: 25000,
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /proposals/:id/submit", () => {
  it("should allow project leader to submit a Draft proposal", async () => {
    const mock = createMockProposal({ currentStatus: "Draft" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);
    vi.mocked(db.update).mockReturnValue(mockMutationChain([mock]) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}/submit`,
      { method: "POST" },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("submitted");
  });

  it("should reject submission of an already Submitted proposal", async () => {
    const mock = createMockProposal({ currentStatus: "Submitted" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}/submit`,
      { method: "POST" },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_STATUS");
  });

  it("should reject submission by non-leader", async () => {
    const mock = createMockProposal({
      currentStatus: "Draft",
      projectLeaderId: "different-user-id",
    });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}/submit`,
      { method: "POST" },
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_LEADER");
  });
});

describe("POST /proposals/:id/review", () => {
  it("should allow RET Chair to endorse a Submitted proposal", async () => {
    setMockUser(MOCK_USERS.retChair);
    const mock = createMockProposal({ currentStatus: "Submitted" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);
    vi.mocked(db.transaction).mockImplementation(mockTransaction(mock) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "Endorsed" }),
      },
    );

    expect(res.status).toBe(200);
  });

  it("should allow Director to approve an Endorsed proposal", async () => {
    setMockUser(MOCK_USERS.director);
    const mock = createMockProposal({ currentStatus: "Endorsed" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);
    vi.mocked(db.transaction).mockImplementation(mockTransaction(mock) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "Approved" }),
      },
    );

    expect(res.status).toBe(200);
  });

  it("should enforce EC-01: reviewer cannot be the project leader", async () => {
    // Set user to the same ID as the project leader
    setMockUser({ ...MOCK_USERS.retChair, userId: MOCK_USERS.faculty.userId });
    const mock = createMockProposal({ currentStatus: "Submitted" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "Endorsed" }),
      },
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT_OF_INTEREST");
  });

  it("should reject Director approving before endorsement", async () => {
    setMockUser(MOCK_USERS.director);
    const mock = createMockProposal({ currentStatus: "Submitted" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "Approved" }),
      },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_STATE");
  });
});

describe("DELETE /proposals/:id (soft delete)", () => {
  it("should archive an existing proposal", async () => {
    const mock = createMockProposal();
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);
    vi.mocked(db.update).mockReturnValue(mockMutationChain([mock]) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}`,
      { method: "DELETE" },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("archived");
  });

  it("should return 404 for non-existent proposal", async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

    const res = await app.request(
      `/proposals/${PROPOSAL_ID}`,
      { method: "DELETE" },
    );

    expect(res.status).toBe(404);
  });
});
