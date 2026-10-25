import { z } from "zod";
import { paginationQuery } from "./common";

export const userListQuery = z.object({
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(100).optional(),
});

export const dashboardQuery = z.object({
  days: z.coerce.number().int().refine((d) => [7, 30, 90].includes(d), "Chỉ hỗ trợ 7, 30 hoặc 90 ngày").default(30),
});

export type UserListQuery = z.infer<typeof userListQuery>;
