import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../db/client.js";
import { setMockUser, MOCK_USERS, mockSelectChain, mockMutationChain } from "../../test/helpers.js";
import app from "./auth.routes.js";

beforeEach(() => { setMockUser(MOCK_USERS.superAdmin); });

describe("GET /auth/me", () => {
  it("should return the current user profile", async () => {
    const profile = { userId: MOCK_USERS.superAdmin.userId, employeeId: "EMP-001", firstName: "Admin", middleName: null, lastName: "User", nameSuffix: null, academicRank: null, email: "admin@neust.edu.ph", roleName: "Super Admin", campusName: "Main", departmentName: null, isActive: true };
    vi.mocked(db.select).mockReturnValue(mockSelectChain([profile]) as never);

    const res = await app.request("/auth/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("admin@neust.edu.ph");
    expect(body.roleName).toBe("Super Admin");
  });

  it("should return 401 when user profile not found in DB", async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
    const res = await app.request("/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/users", () => {
  it("should allow Super Admin to provision a user", async () => {
    const created = { userId: "new-user-id", employeeId: "EMP-002" };
    const profile = { userId: "new-user-id", employeeId: "EMP-002", firstName: "New", middleName: null, lastName: "Faculty", nameSuffix: null, academicRank: "Instructor I", email: "new@neust.edu.ph", roleName: "Faculty", campusName: "Main", departmentName: "CICT", isActive: true };

    vi.mocked(db.insert).mockReturnValue(mockMutationChain([created]) as never);
    vi.mocked(db.select).mockReturnValue(mockSelectChain([profile]) as never);

    const res = await app.request("/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: "EMP-002", firstName: "New", lastName: "Faculty",
        email: "new@neust.edu.ph", roleId: 4, campusId: 1, departmentId: 1,
        supabaseUserId: "new-user-id",
      }),
    });
    expect(res.status).toBe(201);
  });

  it("should reject Faculty from provisioning users", async () => {
    setMockUser(MOCK_USERS.faculty);
    const res = await app.request("/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: "EMP-003", firstName: "Fail", lastName: "User",
        email: "fail@neust.edu.ph", roleId: 4, campusId: 1,
        supabaseUserId: "fail-user-id",
      }),
    });
    expect(res.status).toBe(403);
  });
});
