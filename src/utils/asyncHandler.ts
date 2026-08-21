import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route handler so any rejected promise / thrown error is
 * forwarded to Express's `next()` instead of crashing the process or
 * needing a try/catch in every single controller.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
