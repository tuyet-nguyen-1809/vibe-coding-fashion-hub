import { Router } from "express";
import * as c from "../controllers/product.controller";
import * as r from "../controllers/review.controller";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParam } from "../validators/common";
import { productListQuery } from "../validators/product.validator";
import { createReviewSchema, reviewListQuery } from "../validators/review.validator";

const router = Router();
router.get("/", validate(productListQuery, "query"), c.listPublic);
router.get("/:slug", c.getPublic);

// Đánh giá sản phẩm (/api/products/:id/reviews)
router.get("/:id/reviews", validate(idParam, "params"), validate(reviewListQuery, "query"), r.list);
router.get("/:id/reviews/eligibility", requireAuth, validate(idParam, "params"), r.eligibility);
router.post("/:id/reviews", requireAuth, validate(idParam, "params"), validate(createReviewSchema), r.create);
export default router;
