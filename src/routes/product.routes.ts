import { Router } from "express";
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createProductSchema, updateProductSchema } from "../validators/product.validator";

const router = Router();

// All product routes require a logged-in user.
router.use(requireAuth);

router.post("/", validateBody(createProductSchema), createProduct);
router.get("/", listProducts);
router.get("/:id", getProduct);
router.put("/:id", validateBody(updateProductSchema), updateProduct);
router.delete("/:id", deleteProduct);

export default router;
