import { Request, Response } from "express";
import { query } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { CreateProductInput, UpdateProductInput } from "../validators/product.validator";

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const { name, sku, price, costPrice, stockQuantity } = req.body as CreateProductInput;

  const result = await query(
    `INSERT INTO products (name, sku, price, cost_price, stock_quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, sku, price, cost_price, stock_quantity, created_at, updated_at`,
    [name, sku, price, costPrice, stockQuantity]
  );

  res.status(201).json({ success: true, message: "Product created", data: result.rows[0] });
});

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || "";

  const whereClause = search ? "WHERE name ILIKE $1 OR sku ILIKE $1" : "";
  const params = search ? [`%${search}%`] : [];

  const countResult = await query(`SELECT COUNT(*) FROM products ${whereClause}`, params);
  const totalItems = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query(
    `SELECT id, name, sku, price, cost_price, stock_quantity, created_at, updated_at
     FROM products
     ${whereClause}
     ORDER BY id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.status(200).json({
    success: true,
    data: dataResult.rows,
    pagination: buildPaginationMeta(page, limit, totalItems),
  });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT id, name, sku, price, cost_price, stock_quantity, created_at, updated_at
     FROM products WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) throw ApiError.notFound("Product not found");

  res.status(200).json({ success: true, data: result.rows[0] });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as UpdateProductInput;

  // Map camelCase input fields to their DB column names, building the
  // SET clause dynamically so we only touch fields that were actually sent.
  const columnMap: Record<string, string> = {
    name: "name",
    sku: "sku",
    price: "price",
    costPrice: "cost_price",
    stockQuantity: "stock_quantity",
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const column = columnMap[key];
    if (!column) continue;
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }

  if (setClauses.length === 0) {
    throw ApiError.badRequest("No valid fields provided to update");
  }

  values.push(id);

  const result = await query(
    `UPDATE products SET ${setClauses.join(", ")} WHERE id = $${values.length}
     RETURNING id, name, sku, price, cost_price, stock_quantity, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) throw ApiError.notFound("Product not found");

  res.status(200).json({ success: true, message: "Product updated", data: result.rows[0] });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);

  if (result.rows.length === 0) throw ApiError.notFound("Product not found");

  res.status(200).json({ success: true, message: "Product deleted" });
});
