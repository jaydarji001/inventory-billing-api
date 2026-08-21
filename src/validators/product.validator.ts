import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(150),
  sku: z.string().trim().min(1, "sku is required").max(50),
  price: z.number({ invalid_type_error: "price must be a number" }).nonnegative("price cannot be negative"),
  costPrice: z
    .number({ invalid_type_error: "costPrice must be a number" })
    .nonnegative("costPrice cannot be negative"),
  stockQuantity: z
    .number({ invalid_type_error: "stockQuantity must be a number" })
    .int("stockQuantity must be a whole number")
    .nonnegative("stockQuantity cannot be negative")
    .optional()
    .default(0),
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field must be provided to update",
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
