import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(150),
  email: z.string().trim().toLowerCase().email("email must be valid").optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field must be provided to update",
  });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
