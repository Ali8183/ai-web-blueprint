import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createRequestLogger } from "@/server/logger";

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = "UNAUTHENTICATED", message = "Authentication required.") {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = "FORBIDDEN", message = "You do not have permission for this action.") {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(code = "NOT_FOUND", message = "Requested resource was not found.") {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(code = "CONFLICT", message = "Resource conflict detected.") {
    super(409, code, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(code = "SERVICE_UNAVAILABLE", message = "Required service is unavailable.") {
    super(503, code, message);
  }
}

export function toErrorResponse(err: unknown, requestId?: string): NextResponse {
  const log = createRequestLogger(requestId);

  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
          requestId: log.requestId,
        },
      },
      { status: err.status }
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          details: {
            issues: err.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
          requestId: log.requestId,
        },
      },
      { status: 400 }
    );
  }

  if (err instanceof SyntaxError) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Malformed JSON request body.",
          requestId: log.requestId,
        },
      },
      { status: 400 }
    );
  }

  log.error("unhandled_api_error", { error: err });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected server error occurred.",
        requestId: log.requestId,
      },
    },
    { status: 500 }
  );
}
