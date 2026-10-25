import { z } from "zod";

export const idParam = z.object({
  id: z.coerce.number().int().positive("ID không hợp lệ"),
});

export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
};

export const vnPhone = z
  .string()
  .trim()
  .regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ (VD: 0912345678)");

export const money = z.coerce.number().int("Giá phải là số nguyên (VND)").min(0, "Giá không được âm");
