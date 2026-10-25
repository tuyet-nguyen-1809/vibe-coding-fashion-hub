import { Router } from "express";
import * as admin from "../controllers/admin.controller";
import * as product from "../controllers/product.controller";
import * as category from "../controllers/category.controller";
import * as order from "../controllers/order.controller";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParam } from "../validators/common";
import { dashboardQuery, userListQuery } from "../validators/admin.validator";
import { adminProductListQuery, productInput, productStatusInput } from "../validators/product.validator";
import { categoryInput } from "../validators/category.validator";
import { adminOrderListQuery, updateOrderStatusSchema } from "../validators/order.validator";

const router = Router();
// Toàn bộ /api/admin/* yêu cầu đăng nhập + quyền ADMIN (kiểm tra ở Backend).
router.use(requireAuth, requireAdmin);

router.get("/dashboard", validate(dashboardQuery, "query"), admin.dashboard);

router.get("/products", validate(adminProductListQuery, "query"), product.listAdmin);
router.get("/products/:id", validate(idParam, "params"), product.getAdmin);
router.post("/products", validate(productInput), product.create);
router.put("/products/:id", validate(idParam, "params"), validate(productInput), product.update);
router.patch("/products/:id/status", validate(idParam, "params"), validate(productStatusInput), product.updateStatus);
router.patch("/products/:id/out-of-stock", validate(idParam, "params"), product.markOutOfStock);
router.delete("/products/:id", validate(idParam, "params"), product.remove);

router.get("/categories", category.listAdmin);
router.post("/categories", validate(categoryInput), category.create);
router.put("/categories/:id", validate(idParam, "params"), validate(categoryInput), category.update);
router.delete("/categories/:id", validate(idParam, "params"), category.remove);

router.get("/orders", validate(adminOrderListQuery, "query"), order.listAdmin);
router.get("/orders/:id", validate(idParam, "params"), order.getAdmin);
router.patch("/orders/:id/status", validate(idParam, "params"), validate(updateOrderStatusSchema), order.updateStatus);

router.get("/users", validate(userListQuery, "query"), admin.listUsers);
router.get("/users/:id", validate(idParam, "params"), admin.getUser);
export default router;
