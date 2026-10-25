import { z } from "zod";

const qty = z.coerce.number().int("Số lượng phải là số nguyên").min(1, "Số lượng tối thiểu là 1").max(99, "Số lượng tối đa 99");

export const addCartItemSchema = z.object({
  variantId: z.coerce.number().int().positive("Vui lòng chọn kích cỡ và màu sắc"),
  quantity: qty.default(1),
});

export const updateCartItemSchema = z.object({ quantity: qty });

export const mergeCartSchema = z.object({
  items: z.array(z.object({ variantId: z.coerce.number().int().positive(), quantity: qty })).max(50),
});

export const variantParam = z.object({
  variantId: z.coerce.number().int().positive(),
});

export const guestCartPreviewSchema = mergeCartSchema;

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
