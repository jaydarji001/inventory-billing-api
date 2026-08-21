import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError";


export const validateBody =
  (schema: ZodTypeAny) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message,
      }));
      return next(ApiError.badRequest("Validation failed", details));
    }

    req.body = result.data;
    next();
  };
