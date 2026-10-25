import { Router } from "express";
import * as c from "../controllers/order.controller";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParam } from "../validators/common";
import { cancelOrderSchema, createOrderSchema, myOrdersQuery } from "../validators/order.validator";

const router = Router();
router.use(requireAuth);
router.post("/", validate(createOrderSchema), c.create);
router.get("/", validate(myOrdersQuery, "query"), c.listMine);
router.get("/:id", validate(idParam, "params"), c.getMine);
router.patch("/:id/cancel", validate(idParam, "params"), validate(cancelOrderSchema), c.cancelMine);
export default router;
