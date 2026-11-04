export interface ApiErrorOptions {
  details?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options: ApiErrorOptions = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = "Bad request", code = "BAD_REQUEST"): ApiError {
    return new ApiError(400, code, message);
  }

  static unauthorized(
    message = "Authentication required",
    code = "UNAUTHORIZED"
  ): ApiError {
    return new ApiError(401, code, message);
  }

  static forbidden(message = "Forbidden", code = "FORBIDDEN"): ApiError {
    return new ApiError(403, code, message);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND"): ApiError {
    return new ApiError(404, code, message);
  }

  static conflict(message = "Resource conflict", code = "CONFLICT"): ApiError {
    return new ApiError(409, code, message);
  }

  static validation(details: unknown, message = "Invalid request"): ApiError {
    return new ApiError(422, "VALIDATION_ERROR", message, { details });
  }

  static internal(
    message = "Internal server error",
    code = "INTERNAL_SERVER_ERROR"
  ): ApiError {
    return new ApiError(500, code, message);
  }
}
