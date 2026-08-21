import { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Reads `page` and `limit` from query params with sane defaults/bounds.
 * Invalid or missing values silently fall back to defaults rather than
 * erroring out, since pagination is a convenience, not a strict contract.
 */
export const getPagination = (req: Request): PaginationParams => {
  let page = parseInt(req.query.page as string, 10);
  let limit = parseInt(req.query.limit as string, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit, offset: (page - 1) * limit };
};

export const buildPaginationMeta = (page: number, limit: number, totalItems: number) => ({
  page,
  limit,
  totalItems,
  totalPages: Math.max(Math.ceil(totalItems / limit), 1),
});
