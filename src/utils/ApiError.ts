/**
 * A predictable, HTTP-status-aware error we can throw from anywhere in the
 * app (controllers, services) and have the central error handler turn into
 * a clean JSON response.
 */
export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message: string, details?: unknown) {
    return new ApiError(409, message, details);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }
}
