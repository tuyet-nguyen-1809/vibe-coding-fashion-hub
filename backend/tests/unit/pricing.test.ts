import { describe, expect, it } from "vitest";
import { calcTotals, effectivePrice, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, shippingFeeFor } from "../../src/utils/pricing";

describe("effectivePrice", () => {
  it("dùng giá khuyến mãi khi nhỏ hơn giá gốc", () => {
    expect(effectivePrice(200000, 150000)).toBe(150000);
  });
  it("bỏ qua giá khuyến mãi không hợp lệ", () => {
    expect(effectivePrice(200000, null)).toBe(200000);
    expect(effectivePrice(200000, 250000)).toBe(200000);
    expect(effectivePrice(200000, 0)).toBe(200000);
  });
});

describe("shippingFeeFor / calcTotals", () => {
  it("miễn phí vận chuyển từ ngưỡng 500.000đ", () => {
    expect(shippingFeeFor(FREE_SHIPPING_THRESHOLD)).toBe(0);
    expect(shippingFeeFor(FREE_SHIPPING_THRESHOLD - 1)).toBe(SHIPPING_FEE);
    expect(shippingFeeFor(0)).toBe(0);
  });
  it("tính tổng chính xác bằng số nguyên", () => {
    const t = calcTotals([
      { unitPrice: 159000, quantity: 2 },
      { unitPrice: 99000, quantity: 1 },
    ]);
    expect(t).toEqual({ subtotal: 417000, shippingFee: SHIPPING_FEE, total: 447000 });
    expect(Number.isInteger(t.total)).toBe(true);
  });
});
