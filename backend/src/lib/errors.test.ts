/**
 * Unit tests for ApiError and error response formatting.
 */
import { describe, it, expect } from "vitest";
import postgres from "postgres";
const { PostgresError } = postgres;
import { ApiError, createErrorResponse, installApiErrorHandler } from "./errors.js";

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

describe("installApiErrorHandler PostgresError mapping", () => {
	type ErrorHandler = (
		err: unknown,
		c: { json: (data: unknown, status: number) => Response },
	) => Response | Promise<Response>;

	it("should map unique_violation (23505) to DUPLICATE_ENTRY", () => {
		let errorHandler: ErrorHandler | undefined;
		const appMock = {
			onError: (handler: ErrorHandler) => {
				errorHandler = handler;
			},
		};
		installApiErrorHandler(appMock);

		if (!errorHandler) {
			throw new Error("Error handler not registered");
		}

		const err = Object.create(PostgresError.prototype) as PostgresError;
		Object.defineProperty(err, "code", { value: "23505" });

		let jsonResult: unknown;
		let jsonStatus = 0;
		const ctxMock = {
			json: (data: unknown, status: number) => {
				jsonResult = data;
				jsonStatus = status;
				return {} as Response;
			},
		};

		errorHandler(err, ctxMock);

		expect(jsonStatus).toBe(409);
		expect(jsonResult).toEqual({
			error: {
				code: "DUPLICATE_ENTRY",
				message: "A record with this value already exists.",
			},
		});
	});

	it("should map foreign_key_violation (23503) to REFERENCE_ERROR", () => {
		let errorHandler: ErrorHandler | undefined;
		const appMock = {
			onError: (handler: ErrorHandler) => {
				errorHandler = handler;
			},
		};
		installApiErrorHandler(appMock);

		if (!errorHandler) {
			throw new Error("Error handler not registered");
		}

		const err = Object.create(PostgresError.prototype) as PostgresError;
		Object.defineProperty(err, "code", { value: "23503" });

		let jsonResult: unknown;
		let jsonStatus = 0;
		const ctxMock = {
			json: (data: unknown, status: number) => {
				jsonResult = data;
				jsonStatus = status;
				return {} as Response;
			},
		};

		errorHandler(err, ctxMock);

		expect(jsonStatus).toBe(409);
		expect(jsonResult).toEqual({
			error: {
				code: "REFERENCE_ERROR",
				message: "This record is referenced by other data and cannot be modified.",
			},
		});
	});

	it("should map check_violation (23514) to CONSTRAINT_VIOLATION", () => {
		let errorHandler: ErrorHandler | undefined;
		const appMock = {
			onError: (handler: ErrorHandler) => {
				errorHandler = handler;
			},
		};
		installApiErrorHandler(appMock);

		if (!errorHandler) {
			throw new Error("Error handler not registered");
		}

		const err = Object.create(PostgresError.prototype) as PostgresError;
		Object.defineProperty(err, "code", { value: "23514" });

		let jsonResult: unknown;
		let jsonStatus = 0;
		const ctxMock = {
			json: (data: unknown, status: number) => {
				jsonResult = data;
				jsonStatus = status;
				return {} as Response;
			},
		};

		errorHandler(err, ctxMock);

		expect(jsonStatus).toBe(400);
		expect(jsonResult).toEqual({
			error: {
				code: "CONSTRAINT_VIOLATION",
				message: "The data violates a business rule constraint.",
			},
		});
	});
});

