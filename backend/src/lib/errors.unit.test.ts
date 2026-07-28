import { describe, expect, it } from "vitest";
import { ApiError, createErrorResponse } from "./errors.js";

describe("ApiError", () => {
	it("keeps its HTTP status, code, and message", () => {
		const error = new ApiError(404, "NOT_FOUND", "Resource not found");

		expect(error.status).toBe(404);
		expect(createErrorResponse(error)).toEqual({
			error: { code: "NOT_FOUND", message: "Resource not found" },
		});
	});
});
