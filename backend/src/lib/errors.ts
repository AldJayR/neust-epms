import { HTTPException } from "hono/http-exception";

type ErrorLikeApp = {
  onError: (
    handler: (err: unknown, c: any) => Response | Promise<Response>,
  ) => void;
};

/**
 * Structured API error that serializes cleanly to JSON.
 */
export class ApiError extends HTTPException {
  public readonly code: string;

  constructor(
    status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 500,
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
    if (err instanceof ApiError || err.name === "ApiError") {
      return c.json(createErrorResponse(err as ApiError), (err as ApiError).status);
    }

    if (err instanceof HTTPException || err.name === "HTTPException") {
      const status = "status" in err && typeof err.status === "number" ? err.status : 500;
      return c.json(
        { error: { code: "HTTP_ERROR", message: err.message } },
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
