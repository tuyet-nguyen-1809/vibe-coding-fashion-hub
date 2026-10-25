import { z } from "zod";
import { paginationQuery } from "./common";

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Vui lòng chọn số sao (1-5)").max(5, "Tối đa 5 sao"),
  comment: z.string().trim().min(5, "Nhận xét phải có ít nhất 5 ký tự").max(1000),
});

export const reviewListQuery = z.object({
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
