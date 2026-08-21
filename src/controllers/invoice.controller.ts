import { Request, Response } from "express";
import { PoolClient } from "pg";
import { query, withTransaction } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { CreateInvoiceInput } from "../validators/invoice.validator";

interface ProductRow {
  id: number;
  price: string;
  stock_quantity: number;
}


export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { customerId, items } = req.body as CreateInvoiceInput;
  const userId = req.user?.id ?? null;

  const invoice = await withTransaction(async (client: PoolClient) => {
    // 1. Make sure the customer exists.
    const customerResult = await client.query("SELECT id FROM customers WHERE id = $1", [
      customerId,
    ]);
    if (customerResult.rows.length === 0) {
      throw ApiError.notFound(`Customer with id ${customerId} not found`);
    }

    // 2. Lock the product rows involved, in a stable order (by id) to
    //    avoid deadlocks when multiple invoices touch overlapping products.
    const productIds = [...new Set(items.map((item) => item.productId))].sort((a, b) => a - b);

    const productsResult = await client.query(
      `SELECT id, price, stock_quantity FROM products WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE`,
      [productIds]
    );

    const productMap = new Map<number, ProductRow>(
      productsResult.rows.map((row: ProductRow) => [row.id, row])
    );

   
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw ApiError.notFound(`Product with id ${item.productId} not found`);
      }
      if (product.stock_quantity < item.quantity) {
        throw ApiError.badRequest(
          `Insufficient stock for product ${item.productId}: requested ${item.quantity}, available ${product.stock_quantity}`
        );
      }
    }

    // 4. Compute totals using current product price as the unit price.
    let totalAmount = 0;
    const lineItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = parseFloat(product.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      return { ...item, unitPrice, subtotal };
    });
    totalAmount = Math.round(totalAmount * 100) / 100;

    // 5. Insert the invoice header.
    const invoiceResult = await client.query(
      `INSERT INTO invoices (customer_id, total_amount, status, created_by)
       VALUES ($1, $2, 'paid', $3)
       RETURNING id, customer_id, total_amount, status, created_at`,
      [customerId, totalAmount, userId]
    );
    const invoiceRow = invoiceResult.rows[0];

    // 6. Insert line items and decrement stock for each product.
    const insertedItems = [];
    for (const line of lineItems) {
      const itemResult = await client.query(
        `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, product_id, quantity, unit_price, subtotal`,
        [invoiceRow.id, line.productId, line.quantity, line.unitPrice, line.subtotal]
      );
      insertedItems.push(itemResult.rows[0]);

      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [line.quantity, line.productId]
      );
    }

    return { ...invoiceRow, items: insertedItems };
  });

  res.status(201).json({ success: true, message: "Invoice created", data: invoice });
});

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req);
  const customerId = req.query.customerId as string | undefined;

  const whereClause = customerId ? "WHERE i.customer_id = $1" : "";
  const params = customerId ? [customerId] : [];

  const countResult = await query(`SELECT COUNT(*) FROM invoices i ${whereClause}`, params);
  const totalItems = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query(
    `SELECT i.id, i.customer_id, c.name AS customer_name, i.total_amount, i.status, i.created_at
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     ${whereClause}
     ORDER BY i.id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.status(200).json({
    success: true,
    data: dataResult.rows,
    pagination: buildPaginationMeta(page, limit, totalItems),
  });
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const invoiceResult = await query(
    `SELECT i.id, i.customer_id, c.name AS customer_name, i.total_amount, i.status, i.created_at
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     WHERE i.id = $1`,
    [id]
  );

  if (invoiceResult.rows.length === 0) throw ApiError.notFound("Invoice not found");

  const itemsResult = await query(
    `SELECT ii.id, ii.product_id, p.name AS product_name, ii.quantity, ii.unit_price, ii.subtotal
     FROM invoice_items ii
     JOIN products p ON p.id = ii.product_id
     WHERE ii.invoice_id = $1
     ORDER BY ii.id`,
    [id]
  );

  res.status(200).json({
    success: true,
    data: { ...invoiceResult.rows[0], items: itemsResult.rows },
  });
});
