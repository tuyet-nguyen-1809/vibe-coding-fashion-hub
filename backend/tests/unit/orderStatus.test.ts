import { describe, expect, it } from "vitest";
import { canTransition, customerCanCancel, REVENUE_STATUSES } from "../../src/utils/orderStatus";

describe("Quy tắc chuyển trạng thái đơn hàng", () => {
  it("cho phép luồng hợp lệ", () => {
    expect(canTransition("PROCESSING", "SHIPPING")).toBe(true);
    expect(canTransition("SHIPPING", "COMPLETED")).toBe(true);
    expect(canTransition("PROCESSING", "CANCELLED")).toBe(true);
    expect(canTransition("SHIPPING", "CANCELLED")).toBe(true);
  });
  it("chặn chuyển trạng thái không hợp lệ", () => {
    expect(canTransition("PROCESSING", "COMPLETED")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "PROCESSING")).toBe(false);
    expect(canTransition("SHIPPING", "PROCESSING")).toBe(false);
  });
  it("khách chỉ được hủy khi đang xử lý", () => {
    expect(customerCanCancel("PROCESSING")).toBe(true);
    expect(customerCanCancel("SHIPPING")).toBe(false);
  });
  it("doanh thu chỉ tính đơn hoàn thành", () => {
    expect(REVENUE_STATUSES).toEqual(["COMPLETED"]);
  });
});
