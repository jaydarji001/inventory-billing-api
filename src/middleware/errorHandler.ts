import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";


const mapDatabaseError = (err: any): ApiError | null => {
  if (!err?.code) return null;

  switch (err.code) {
    case "23505": // unique_violation
      return ApiError.conflict("A record with the same unique value already exists", {
        constraint: err.constraint,
      });
    case "23503": // foreign_key_violation
      // Postgres reuses this code both when you reference something that
      // doesn't exist (insert/update) and when you try to delete a row
      // something else still points to. `err.table` tells us which side.
      return ApiError.badRequest(
        err.detail?.includes("still referenced")
          ? "Cannot delete this record because it is referenced by other records"
          : "Referenced record does not exist",
        { constraint: err.constraint }
      );
    case "23502": // not_null_violation
      return ApiError.badRequest(`Missing required field: ${err.column}`);
    case "23514": // check_violation
      return ApiError.badRequest("Value violates a database constraint", {
        constraint: err.constraint,
      });
    case "22P02": // invalid_text_representation (e.g. "abc" passed where an integer id is expected)
      return ApiError.badRequest("Invalid identifier format in request");
    default:
      return null;
  }
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};


export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  let apiError = err instanceof ApiError ? err : mapDatabaseError(err);

  if (!apiError) {
    console.error("Unhandled error:", err);
    apiError = ApiError.internal(
      process.env.NODE_ENV === "production" ? "Internal server error" : err.message
    );
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    ...(apiError.details ? { details: apiError.details } : {}),
  });
};
