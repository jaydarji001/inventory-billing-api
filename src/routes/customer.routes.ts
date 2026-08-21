import { Router } from "express";
import {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createCustomerSchema, updateCustomerSchema } from "../validators/customer.validator";

const router = Router();

router.use(requireAuth);

router.post("/", validateBody(createCustomerSchema), createCustomer);
router.get("/", listCustomers);
router.get("/:id", getCustomer);
router.put("/:id", validateBody(updateCustomerSchema), updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;
