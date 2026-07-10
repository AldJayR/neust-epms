import { HTTPException } from "hono/http-exception";
import postgres from "postgres";

const { PostgresError } = postgres;

import { ZodError } from "zod";

type ErrorLikeApp = {
	onError: (
		handler: (
			err: unknown,
			c: { json: (data: unknown, status: number) => Response },
		) => Response | Promise<Response>,
	) => void;
};

type ErrorLike = {
	name?: unknown;
	message?: unknown;
	status?: unknown;
};

function isErrorLike(err: unknown): err is ErrorLike {
	return typeof err === "object" && err !== null;
}

/**
 * Structured API error that serializes cleanly to JSON.
 */
export class ApiError extends HTTPException {
	public readonly code: string;

	constructor(
		status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503,
		code: string,
		message: string,
	) {
		super(status, { message });
		this.name = "ApiError";
		this.code = code;
	}
}

/** Standardized error response body */
export interface ErrorResponse {
	error: {
		code: string;
		message: string;
		details?: Array<{ path: string; message: string }>;
	};
}

export function createErrorResponse(err: ApiError): ErrorResponse {
	return {
		error: {
			code: err.code,
			message: err.message,
		},
	};
}

export function installApiErrorHandler(app: ErrorLikeApp): void {
	app.onError((err, c) => {
		if (err instanceof ZodError) {
			return c.json(
				{
					error: {
						code: "VALIDATION_ERROR",
						message: "Request validation failed",
						details: err.issues.map((e) => ({
							path: e.path.join("."),
							message: e.message,
						})),
					},
				},
				400,
			);
		}

		if (err instanceof PostgresError) {
			if (err.code === "23505") {
				return c.json(
					{
						error: {
							code: "DUPLICATE_ENTRY",
							message: "A record with this value already exists.",
						},
					},
					409,
				);
			}
			if (err.code === "23503") {
				return c.json(
					{
						error: {
							code: "REFERENCE_ERROR",
							message:
								"This record is referenced by other data and cannot be modified.",
						},
					},
					409,
				);
			}
			if (err.code === "23514") {
				return c.json(
					{
						error: {
							code: "CONSTRAINT_VIOLATION",
							message: "The data violates a business rule constraint.",
						},
					},
					400,
				);
			}
		}

		if (
			err instanceof ApiError ||
			(isErrorLike(err) && err.name === "ApiError")
		) {
			return c.json(
				createErrorResponse(err as ApiError),
				(err as ApiError).status,
			);
		}

		if (
			err instanceof HTTPException ||
			(isErrorLike(err) && err.name === "HTTPException")
		) {
			const status =
				isErrorLike(err) && typeof err.status === "number" ? err.status : 500;
			const message =
				isErrorLike(err) && typeof err.message === "string"
					? err.message
					: "HTTP error";
			return c.json(
				{ error: { code: "HTTP_ERROR", message } },
				status as never,
			);
		}

		console.error("Unhandled error:", err);
		return c.json(
			{ error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
			500,
		);
	});
}
