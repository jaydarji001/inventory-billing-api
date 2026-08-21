import { z } from "zod";

const invoiceItemSchema = z.object({
  productId: z.number({ invalid_type_error: "productId must be a number" }).int().positive(),
  quantity: z
    .number({ invalid_type_error: "quantity must be a number" })
    .int("quantity must be a whole number")
    .positive("quantity must be greater than 0"),
});

export const createInvoiceSchema = z.object({
  customerId: z.number({ invalid_type_error: "customerId must be a number" }).int().positive(),
  items: z.array(invoiceItemSchema).min(1, "invoice must contain at least one item"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
