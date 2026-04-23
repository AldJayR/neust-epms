/**
 * Integration tests for projects.routes.ts
 *
 * Tests project creation from approved proposals,
 * MOA linking, and state transitions (SYS-REQ-04.1).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import {
  setMockUser,
  MOCK_USERS,
  createMockProposal,
  createMockProject,
  createMockMoa,
  mockSelectChain,
  mockMutationChain,
} from "../../test/helpers.js";
import app from "./projects.routes.js";

beforeEach(() => {
  setMockUser(MOCK_USERS.faculty);
});

describe("GET /projects", () => {
  it("should return a list of projects", async () => {
    const mock = createMockProject();
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

    const res = await app.request("/projects");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /projects", () => {
  it("should create a project from an Approved proposal", async () => {
    const proposal = createMockProposal({ currentStatus: "Approved" });
    const project = createMockProject();

    // First select: find proposal. Second select: check duplicate.
    let callCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelectChain([proposal]) as never;
      return mockSelectChain([]) as never; // No existing project
    });
    vi.mocked(db.insert).mockReturnValue(mockMutationChain([project]) as never);

    const res = await app.request("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: proposal.proposalId }),
    });

    expect(res.status).toBe(201);
  });

  it("should reject creating a project from a non-Approved proposal", async () => {
    const proposal = createMockProposal({ currentStatus: "Draft" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([proposal]) as never);

    const res = await app.request("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: proposal.proposalId }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_APPROVED");
  });

  it("should reject duplicate project for same proposal", async () => {
    const proposal = createMockProposal({ currentStatus: "Approved" });
    const existing = createMockProject();

    let callCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelectChain([proposal]) as never;
      return mockSelectChain([existing]) as never; // Duplicate found
    });

    const res = await app.request("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: proposal.proposalId }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE");
  });
});

describe("POST /projects/:id/link-moa", () => {
  it("should link a valid MOA to a project", async () => {
    const project = createMockProject();
    const moa = createMockMoa();

    let callCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelectChain([project]) as never;
      return mockSelectChain([moa]) as never;
    });
    vi.mocked(db.update).mockReturnValue(mockMutationChain([project]) as never);

    const res = await app.request(
      `/projects/${project.projectId}/link-moa`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moaId: moa.moaId }),
      },
    );

    expect(res.status).toBe(200);
  });

  it("should reject linking an expired MOA", async () => {
    const project = createMockProject();
    const expiredMoa = createMockMoa({ isExpired: true });

    let callCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelectChain([project]) as never;
      return mockSelectChain([expiredMoa]) as never;
    });

    const res = await app.request(
      `/projects/${project.projectId}/link-moa`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moaId: expiredMoa.moaId }),
      },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MOA_EXPIRED");
  });
});

describe("POST /projects/:id/transition", () => {
  it("should require MOA to transition to Ongoing (SYS-REQ-04.1)", async () => {
    const project = createMockProject({ projectStatus: "Approved", moaId: null });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([project]) as never);

    const res = await app.request(
      `/projects/${project.projectId}/transition`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Ongoing" }),
      },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MOA_REQUIRED");
  });

  it("should reject Completed if project is not Ongoing", async () => {
    const project = createMockProject({ projectStatus: "Approved" });
    vi.mocked(db.select).mockReturnValue(mockSelectChain([project]) as never);

    const res = await app.request(
      `/projects/${project.projectId}/transition`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_TRANSITION");
  });
});
