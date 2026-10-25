import type { OrderStatus } from "../generated/prisma/enums";

/**
 * Quy tắc chuyển trạng thái đơn hàng:
 *   PROCESSING -> SHIPPING | CANCELLED
 *   SHIPPING   -> COMPLETED | CANCELLED (giao thất bại, hàng được hoàn kho)
 *   COMPLETED, CANCELLED: trạng thái cuối, không đổi được nữa.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PROCESSING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Khách hàng chỉ được tự hủy khi đơn còn "Đang xử lý". */
export function customerCanCancel(status: OrderStatus): boolean {
  return status === "PROCESSING";
}

/** Doanh thu thực tế chỉ tính đơn "Đã hoàn thành". */
export const REVENUE_STATUSES: OrderStatus[] = ["COMPLETED"];
