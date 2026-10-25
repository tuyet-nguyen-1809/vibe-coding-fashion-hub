import { Router } from "express";
import * as c from "../controllers/cart.controller";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { addCartItemSchema, guestCartPreviewSchema, mergeCartSchema, updateCartItemSchema, variantParam } from "../validators/cart.validator";

const router = Router();
// Giỏ hàng khách vãng lai: tính giá/tồn kho thật từ DB, không cần đăng nhập.
router.post("/preview", validate(guestCartPreviewSchema), c.preview);

router.use(requireAuth);
router.get("/", c.get);
router.post("/items", validate(addCartItemSchema), c.add);
router.patch("/items/:variantId", validate(variantParam, "params"), validate(updateCartItemSchema), c.update);
router.delete("/items/:variantId", validate(variantParam, "params"), c.remove);
router.delete("/", c.clear);
router.post("/merge", validate(mergeCartSchema), c.merge);
export default router;
