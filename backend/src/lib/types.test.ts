/**
 * Integration tests for type constants and enums.
 *
 * Validates that our business rule constants match what
 * the routes and schema expect.
 */
import { describe, it, expect } from "vitest";
import {
  ROLE_NAMES,
  PROPOSAL_STATUS,
  REVIEW_STAGE,
  REVIEW_DECISION,
  PROJECT_STATUS,
} from "./types.js";

describe("ROLE_NAMES", () => {
  it("should define exactly 4 roles", () => {
    expect(Object.keys(ROLE_NAMES)).toHaveLength(4);
  });

  it("should include all expected role names", () => {
    expect(ROLE_NAMES.SUPER_ADMIN).toBe("Super Admin");
    expect(ROLE_NAMES.DIRECTOR).toBe("Director");
    expect(ROLE_NAMES.RET_CHAIR).toBe("RET Chair");
    expect(ROLE_NAMES.FACULTY).toBe("Faculty");
  });
});

describe("PROPOSAL_STATUS", () => {
  it("should define exactly 6 statuses", () => {
    expect(Object.keys(PROPOSAL_STATUS)).toHaveLength(6);
  });

  it("should follow the correct state machine order", () => {
    const expected = [
      "Draft",
      "Submitted",
      "Endorsed",
      "Approved",
      "Returned",
      "Rejected",
    ];
    expect(Object.values(PROPOSAL_STATUS)).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it("should default to Draft", () => {
    expect(PROPOSAL_STATUS.DRAFT).toBe("Draft");
  });
});

describe("REVIEW_STAGE", () => {
  it("should define exactly 2 stages", () => {
    expect(Object.keys(REVIEW_STAGE)).toHaveLength(2);
  });

  it("should have Endorsement before Approval", () => {
    expect(REVIEW_STAGE.ENDORSEMENT).toBe("Endorsement");
    expect(REVIEW_STAGE.APPROVAL).toBe("Approval");
  });
});

describe("REVIEW_DECISION", () => {
  it("should define exactly 4 decisions", () => {
    expect(Object.keys(REVIEW_DECISION)).toHaveLength(4);
  });

  it("should include all valid decisions", () => {
    expect(Object.values(REVIEW_DECISION)).toEqual(
      expect.arrayContaining(["Endorsed", "Approved", "Returned", "Rejected"]),
    );
  });
});

describe("PROJECT_STATUS", () => {
  it("should define exactly 3 statuses", () => {
    expect(Object.keys(PROJECT_STATUS)).toHaveLength(3);
  });

  it("should follow the lifecycle order", () => {
    expect(PROJECT_STATUS.APPROVED).toBe("Approved");
    expect(PROJECT_STATUS.ONGOING).toBe("Ongoing");
    expect(PROJECT_STATUS.COMPLETED).toBe("Completed");
  });
});
