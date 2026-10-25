import { Router } from "express";
import authRoutes from "./auth.routes";
import productRoutes from "./product.routes";
import categoryRoutes from "./category.routes";
import cartRoutes from "./cart.routes";
import orderRoutes from "./order.routes";
import adminRoutes from "./admin.routes";
import chatRoutes from "./chat.routes";

const router = Router();
router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", time: new Date().toISOString() } });
});
router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/admin", adminRoutes);
router.use("/chat", chatRoutes);
export default router;
