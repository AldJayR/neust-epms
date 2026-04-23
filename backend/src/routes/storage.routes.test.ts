import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import { setMockUser, MOCK_USERS, createMockProposal, mockSelectChain } from "../../test/helpers.js";
import app from "./storage.routes.js";

const PROPOSAL_ID = "eeeeeeee-5555-5555-5555-eeeeeeeeeeee";
const DOC_ID = "dddddddd-8888-8888-8888-dddddddddddd";

beforeEach(() => { setMockUser(MOCK_USERS.faculty); });

describe("GET /proposals/:proposalId/documents", () => {
  it("should return document versions for a proposal", async () => {
    const doc = { documentId: DOC_ID, proposalId: PROPOSAL_ID, storagePath: "proposals/test/v1.pdf", versionNum: 1, uploadedAt: new Date() };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([doc]) as never);

    const res = await app.request(`/proposals/${PROPOSAL_ID}/documents`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].versionNum).toBe(1);
  });
});

describe("GET /proposals/:proposalId/documents/:documentId/url", () => {
  it("should return 404 when document not found", async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
    const res = await app.request(`/proposals/${PROPOSAL_ID}/documents/${DOC_ID}/url`);
    expect(res.status).toBe(404);
  });

  it("should return a signed URL when document exists", async () => {
    const doc = { documentId: DOC_ID, proposalId: PROPOSAL_ID, storagePath: "proposals/test/v1.pdf", versionNum: 1, uploadedAt: new Date() };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([doc]) as never);

    const res = await app.request(`/proposals/${PROPOSAL_ID}/documents/${DOC_ID}/url`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain("signed-url");
  });
});
