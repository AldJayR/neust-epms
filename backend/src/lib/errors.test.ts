/**
 * Unit tests for ApiError and error response formatting.
 */
import { describe, it, expect } from "vitest";
import { ApiError, createErrorResponse } from "./errors.js";

describe("ApiError", () => {
  it("should create an error with the correct status, code, and message", () => {
    const err = new ApiError(404, "NOT_FOUND", "Resource not found");

    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
  });

  it("should be an instance of Error", () => {
    const err = new ApiError(500, "INTERNAL", "Something broke");
    expect(err).toBeInstanceOf(Error);
  });

  it("should be catchable as an HTTPException", async () => {
    const { HTTPException } = await import("hono/http-exception");
    const err = new ApiError(403, "FORBIDDEN", "Not allowed");
    expect(err).toBeInstanceOf(HTTPException);
  });
});

describe("createErrorResponse", () => {
  it("should format an ApiError into a standardized JSON shape", () => {
    const err = new ApiError(400, "VALIDATION", "Bad input");
    const response = createErrorResponse(err);

    expect(response).toEqual({
      error: {
        code: "VALIDATION",
        message: "Bad input",
      },
    });
  });

  it("should preserve the exact code and message strings", () => {
    const err = new ApiError(
      422,
      "INVALID_DATES",
      "validUntil must be after validFrom",
    );
    const response = createErrorResponse(err);

    expect(response.error.code).toBe("INVALID_DATES");
    expect(response.error.message).toBe("validUntil must be after validFrom");
  });
});
