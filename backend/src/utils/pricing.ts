// Quy tắc tính tiền dùng chung (tiền là số nguyên VND, không dùng số thực).

export const FREE_SHIPPING_THRESHOLD = 500_000;
export const SHIPPING_FEE = 30_000;

/** Giá bán thực tế: dùng giá khuyến mãi nếu hợp lệ (nhỏ hơn giá gốc). */
export function effectivePrice(price: number, salePrice: number | null | undefined): number {
  if (salePrice != null && salePrice > 0 && salePrice < price) return salePrice;
  return price;
}

/** Phí vận chuyển: miễn phí cho đơn từ 500.000đ. */
export function shippingFeeFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function calcTotals(lines: { unitPrice: number; quantity: number }[]) {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const shippingFee = shippingFeeFor(subtotal);
  return { subtotal, shippingFee, total: subtotal + shippingFee };
}
