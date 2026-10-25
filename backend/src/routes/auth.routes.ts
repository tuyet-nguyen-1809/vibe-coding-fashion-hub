import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as c from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from "../validators/auth.validator";
import { env } from "../config/env";

// Giới hạn số lần thử đăng nhập/đăng ký để chống dò mật khẩu.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1000 : 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, code: "TOO_MANY_REQUESTS", message: "Bạn thao tác quá nhiều lần, vui lòng thử lại sau 15 phút" },
});

const router = Router();
router.post("/register", authLimiter, validate(registerSchema), c.register);
router.post("/login", authLimiter, validate(loginSchema), c.login);
router.get("/me", requireAuth, c.me);
router.put("/me", requireAuth, validate(updateProfileSchema), c.updateProfile);
router.put("/change-password", requireAuth, validate(changePasswordSchema), c.changePassword);
export default router;
