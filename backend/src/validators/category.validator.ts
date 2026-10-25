import { z } from "zod";

export const categoryInput = z.object({
  name: z.string().trim().min(2, "Tên danh mục phải có ít nhất 2 ký tự").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  imageUrl: z.url("Đường dẫn ảnh không hợp lệ").max(500).optional().nullable().or(z.literal("").transform(() => null)),
});

export type CategoryInput = z.infer<typeof categoryInput>;
