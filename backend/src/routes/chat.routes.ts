import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as c from "../controllers/chat.controller";
import { validate } from "../middlewares/validate";
import { chatSchema } from "../validators/chat.validator";

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, code: "TOO_MANY_REQUESTS", message: "Bạn gửi tin nhắn quá nhanh, vui lòng chờ một chút" },
});

const router = Router();
router.get("/status", c.status);
router.post("/", chatLimiter, validate(chatSchema), c.chat);
export default router;
