import { describe, expect, it } from "vitest";
import { formatVND, NEXT_STATUSES } from "./format";

describe("format", () => {
  it("định dạng tiền VND", () => {
    expect(formatVND(1290000)).toMatch(/1\.290\.000/);
  });
  it("quy tắc trạng thái khớp Backend", () => {
    expect(NEXT_STATUSES.PROCESSING).toEqual(["SHIPPING", "CANCELLED"]);
    expect(NEXT_STATUSES.COMPLETED).toEqual([]);
  });
});
