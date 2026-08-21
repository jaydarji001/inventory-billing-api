import { Request, Response } from "express";
import { query } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { CreateCustomerInput, UpdateCustomerInput } from "../validators/customer.validator";

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, address } = req.body as CreateCustomerInput;

  const result = await query(
    `INSERT INTO customers (name, email, phone, address)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, address, created_at, updated_at`,
    [name, email ?? null, phone ?? null, address ?? null]
  );

  res.status(201).json({ success: true, message: "Customer created", data: result.rows[0] });
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || "";

  const whereClause = search ? "WHERE name ILIKE $1 OR email ILIKE $1" : "";
  const params = search ? [`%${search}%`] : [];

  const countResult = await query(`SELECT COUNT(*) FROM customers ${whereClause}`, params);
  const totalItems = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query(
    `SELECT id, name, email, phone, address, created_at, updated_at
     FROM customers
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

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT id, name, email, phone, address, created_at, updated_at
     FROM customers WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) throw ApiError.notFound("Customer not found");

  res.status(200).json({ success: true, data: result.rows[0] });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as UpdateCustomerInput;

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    values.push(value);
    setClauses.push(`${key} = $${values.length}`);
  }

  if (setClauses.length === 0) {
    throw ApiError.badRequest("No valid fields provided to update");
  }

  values.push(id);

  const result = await query(
    `UPDATE customers SET ${setClauses.join(", ")} WHERE id = $${values.length}
     RETURNING id, name, email, phone, address, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) throw ApiError.notFound("Customer not found");

  res.status(200).json({ success: true, message: "Customer updated", data: result.rows[0] });
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query("DELETE FROM customers WHERE id = $1 RETURNING id", [id]);

  if (result.rows.length === 0) throw ApiError.notFound("Customer not found");

  res.status(200).json({ success: true, message: "Customer deleted" });
});
