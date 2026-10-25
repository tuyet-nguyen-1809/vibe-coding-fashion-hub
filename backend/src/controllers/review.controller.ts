import type { Request, Response } from "express";
import * as reviewService from "../services/review.service";
import { getValid } from "../middlewares/validate";
import { sendSuccess } from "../utils/response";
import type { CreateReviewInput } from "../validators/review.validator";

type IdParam = { id: number };

export async function list(req: Request, res: Response) {
  const { page, limit } = getValid<{ page: number; limit: number }>(req, "query");
  const { items, summary, meta } = await reviewService.listByProduct(getValid<IdParam>(req, "params").id, page, limit);
  res.json({ success: true, data: items, summary, meta });
}

export async function eligibility(req: Request, res: Response) {
  sendSuccess(res, await reviewService.eligibility(req.user!.id, getValid<IdParam>(req, "params").id));
}

export async function create(req: Request, res: Response) {
  const review = await reviewService.create(req.user!.id, getValid<IdParam>(req, "params").id, getValid<CreateReviewInput>(req));
  sendSuccess(res, review, { status: 201, message: "Cảm ơn bạn đã đánh giá sản phẩm" });
}
