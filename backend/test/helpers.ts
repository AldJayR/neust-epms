/**
 * Test helpers and factories for creating mock data
 * and simulating authenticated Hono requests.
 */
import { vi } from "vitest";
import type { AuthUser } from "../src/lib/types.js";

// ── Mock Users (all 4 roles) ──
export const MOCK_USERS = {
  faculty: {
    userId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    email: "faculty@neust.edu.ph",
    roleId: 4,
    roleName: "Faculty",
    campusId: 1,
    campusName: "Cabanatuan City (Main)",
    departmentId: 1,
    departmentName: "Management Information System (MIS)",
    firstName: "Faculty",
    middleName: null,
    lastName: "User",
    nameSuffix: null,
    academicRank: "Instructor",
    isActive: true,
  } satisfies AuthUser,

  retChair: {
    userId: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    email: "retchair@neust.edu.ph",
    roleId: 3,
    roleName: "RET Chair",
    campusId: 1,
    campusName: "Cabanatuan City (Main)",
    departmentId: 2,
    departmentName: "Research and Extension",
    firstName: "RET",
    middleName: null,
    lastName: "Chair",
    nameSuffix: null,
    academicRank: "Associate Professor",
    isActive: true,
  } satisfies AuthUser,

  director: {
    userId: "cccccccc-3333-4333-8333-cccccccccccc",
    email: "director@neust.edu.ph",
    roleId: 2,
    roleName: "Director",
    campusId: 1,
    campusName: "Cabanatuan City (Main)",
    departmentId: null,
    departmentName: null,
    firstName: "Director",
    middleName: null,
    lastName: "User",
    nameSuffix: null,
    academicRank: "Professor",
    isActive: true,
  } satisfies AuthUser,

  superAdmin: {
    userId: "dddddddd-4444-4444-8444-dddddddddddd",
    email: "admin@neust.edu.ph",
    roleId: 1,
    roleName: "Super Admin",
    campusId: 1,
    campusName: "Cabanatuan City (Main)",
    departmentId: null,
    departmentName: null,
    firstName: "System",
    middleName: null,
    lastName: "Administrator",
    nameSuffix: null,
    academicRank: null,
    isActive: true,
  } satisfies AuthUser,
} as const;

/** Switch the mock auth user for subsequent requests */
export function setMockUser(user: AuthUser): void {
  (globalThis as Record<string, unknown>).__testMockUser = user;
}

// ── Mock Data Factories ──

export function createMockProposal(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    proposalId: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
    projectLeaderId: MOCK_USERS.faculty.userId,
    campusId: 1,
    departmentId: 1,
    title: "Community Health Extension Program",
    bannerProgram: "Health and Wellness",
    projectLocale: "San Isidro, Nueva Ecija",
    extensionCategory: "Training",
    extensionAgenda: "Public Health Advocacy",
    budgetPartner: "50000.00",
    budgetNeust: "25000.00",
    currentStatus: "Draft",
    revisionNum: 0,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    ...overrides,
  };
}

export function createMockProject(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    projectId: "ffffffff-6666-4666-8666-ffffffffffff",
    proposalId: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
    moaId: null,
    startDate: null,
    targetEnd: null,
    projectStatus: "Approved",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    ...overrides,
  };
}

export function createMockMoa(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    moaId: "11111111-7777-4777-8777-111111111111",
    partnerName: "Municipality of San Jose",
    partnerType: "LGU",
    storagePath: null,
    validFrom: new Date("2025-01-01"),
    validUntil: new Date("2027-12-31"),
    isExpired: false,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    ...overrides,
  };
}

// ── Drizzle Query Chain Mocks ──

/**
 * Creates a chainable mock for SELECT queries.
 * Every method returns the chain; awaiting resolves to `result`.
 */
export function mockSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  const returnChain = vi.fn(() => chain);
  chain.from = returnChain;
  chain.where = returnChain;
  chain.innerJoin = returnChain;
  chain.leftJoin = returnChain;
  chain.orderBy = returnChain;
  chain.offset = returnChain;
  chain.limit = returnChain;
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

/**
 * Creates a chainable mock for INSERT / UPDATE / DELETE queries.
 */
export function mockMutationChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  const returnChain = vi.fn(() => chain);
  chain.values = returnChain;
  chain.returning = returnChain;
  chain.onConflictDoUpdate = returnChain;
  chain.set = returnChain;
  chain.where = returnChain;
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

/**
 * Creates a mock for db.transaction that calls the callback
 * with a mock tx object having the same chainable API.
 */
export function mockTransaction(txResult: unknown) {
  return vi.fn(
    async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
      const tx = {
        insert: vi.fn(() => mockMutationChain([txResult])),
        update: vi.fn(() => mockMutationChain([txResult])),
        select: vi.fn(() => mockSelectChain([txResult])),
        delete: vi.fn(() => mockMutationChain([txResult])),
      };
      return callback(tx);
    },
  );
}
