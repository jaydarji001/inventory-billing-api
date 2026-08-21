import { Router } from "express";
import { createInvoice, listInvoices, getInvoice } from "../controllers/invoice.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createInvoiceSchema } from "../validators/invoice.validator";

const router = Router();

router.use(requireAuth);

router.post("/", validateBody(createInvoiceSchema), createInvoice);
router.get("/", listInvoices);
router.get("/:id", getInvoice);

export default router;
