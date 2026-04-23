import { HTTPException } from "hono/http-exception";

/**
 * Structured API error that serializes cleanly to JSON.
 */
export class ApiError extends HTTPException {
  public readonly code: string;

  constructor(
    status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
    code: string,
    message: string,
  ) {
    super(status, { message });
    this.code = code;
  }
}

/** Standardized error response body */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
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
