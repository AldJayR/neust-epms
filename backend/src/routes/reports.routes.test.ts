import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import { setMockUser, MOCK_USERS, createMockProject, mockSelectChain, mockMutationChain } from "../../test/helpers.js";
import app from "./reports.routes.js";

beforeEach(() => { setMockUser(MOCK_USERS.faculty); });

describe("GET /reports", () => {
  it("should return a list of reports", async () => {
    const mock = { reportId: "aaa", projectId: "bbb", submittedBy: "ccc", storagePath: null, remarks: null, submittedAt: new Date(), archivedAt: null };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);
    const res = await app.request("/reports");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /reports", () => {
  it("should create a report for an existing project", async () => {
    const project = createMockProject();
    const report = { reportId: "aaa", projectId: project.projectId, submittedBy: MOCK_USERS.faculty.userId, storagePath: null, remarks: "Good progress", submittedAt: new Date(), archivedAt: null };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([project]) as never);
    vi.mocked(db.insert).mockReturnValue(mockMutationChain([report]) as never);

    const res = await app.request("/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.projectId, remarks: "Good progress" }),
    });
    expect(res.status).toBe(201);
  });

  it("should reject report for non-existent project", async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
    const res = await app.request("/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "ffffffff-0000-0000-0000-ffffffffffff" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /reports/:id (soft delete)", () => {
  it("should archive an existing report", async () => {
    const mock = { reportId: "aaa", archivedAt: new Date() };
    vi.mocked(db.update).mockReturnValue(mockMutationChain([mock]) as never);
    const res = await app.request("/reports/aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa", { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("should return 404 for non-existent report", async () => {
    vi.mocked(db.update).mockReturnValue(mockMutationChain([]) as never);
    const res = await app.request("/reports/aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
