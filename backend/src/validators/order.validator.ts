import { z } from "zod";
import { paginationQuery, vnPhone } from "./common";

export const createOrderSchema = z.object({
  recipientName: z.string().trim().min(2, "Vui lòng nhập họ tên người nhận").max(100),
  phone: vnPhone,
  address: z.string().trim().min(10, "Địa chỉ giao hàng quá ngắn (tối thiểu 10 ký tự)").max(300),
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["COD", "MOCK_ONLINE"]).default("COD"),
  // Khóa chống gửi lặp: Frontend tạo 1 UUID cho mỗi lần thanh toán.
  idempotencyKey: z.string().trim().min(8).max(64),
});

export const myOrdersQuery = z.object({
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["PROCESSING", "SHIPPING", "COMPLETED", "CANCELLED"]).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const adminOrderListQuery = z.object({
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(50).optional(), // mã đơn, tên/sđt người nhận
  status: z.enum(["PROCESSING", "SHIPPING", "COMPLETED", "CANCELLED"]).optional(),
  from: z.iso.date("Ngày bắt đầu không hợp lệ").optional(),
  to: z.iso.date("Ngày kết thúc không hợp lệ").optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PROCESSING", "SHIPPING", "COMPLETED", "CANCELLED"]),
  reason: z.string().trim().max(300).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type MyOrdersQuery = z.infer<typeof myOrdersQuery>;
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuery>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
