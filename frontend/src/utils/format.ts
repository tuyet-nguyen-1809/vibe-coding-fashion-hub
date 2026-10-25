import type { OrderStatus, PaymentMethod, PaymentStatus } from "../types";

export const formatVND = (n: number) => `${n.toLocaleString("vi-VN")}₫`;

export const formatDate = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  PROCESSING: { label: "Đang xử lý", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  SHIPPING: { label: "Đang giao", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  COMPLETED: { label: "Đã hoàn thành", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CANCELLED: { label: "Đã hủy", className: "bg-neutral-100 text-neutral-500 ring-neutral-200" },
};

/** Phải khớp với quy tắc ở Backend (utils/orderStatus.ts). */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PROCESSING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  MOCK_ONLINE: "Thanh toán trực tuyến (giả lập)",
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

export const FREE_SHIPPING_THRESHOLD = 500_000;

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
