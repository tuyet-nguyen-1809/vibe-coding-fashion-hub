import { describe, expect, it } from "vitest";
import { registerSchema } from "../../src/validators/auth.validator";
import { productInput } from "../../src/validators/product.validator";
import { createOrderSchema } from "../../src/validators/order.validator";
import { slugify } from "../../src/utils/slug";

describe("registerSchema", () => {
  const base = { name: "Nguyễn Văn A", email: "A@Example.com", password: "abc123", confirmPassword: "abc123" };
  it("chuẩn hóa email và loại bỏ trường role", () => {
    const r = registerSchema.parse({ ...base, role: "ADMIN" });
    expect(r.email).toBe("a@example.com");
    expect("role" in r).toBe(false);
  });
  it("báo lỗi khi mật khẩu xác nhận không khớp", () => {
    const r = registerSchema.safeParse({ ...base, confirmPassword: "xyz789" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Mật khẩu xác nhận không khớp");
  });
  it("báo lỗi email sai định dạng", () => {
    expect(registerSchema.safeParse({ ...base, email: "abc" }).success).toBe(false);
  });
});

describe("productInput", () => {
  const base = {
    sku: "t01",
    name: "Áo test",
    description: "Mô tả sản phẩm đủ dài",
    price: 200000,
    imageUrl: "https://example.com/a.jpg",
    categoryId: 1,
    variants: [{ size: "M", color: "Đen", stock: 5 }],
  };
  it("viết hoa SKU", () => {
    expect(productInput.parse(base).sku).toBe("T01");
  });
  it("giá khuyến mãi phải nhỏ hơn giá gốc", () => {
    expect(productInput.safeParse({ ...base, salePrice: 250000 }).success).toBe(false);
  });
  it("không cho biến thể trùng size/màu", () => {
    const r = productInput.safeParse({ ...base, variants: [base.variants[0], { size: "m", color: "đen", stock: 1 }] });
    expect(r.success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("kiểm tra số điện thoại Việt Nam", () => {
    const base = { recipientName: "An", address: "12 Trần Duy Hưng, Hà Nội", idempotencyKey: "abcdefgh-1234" };
    expect(createOrderSchema.safeParse({ ...base, phone: "0912345678" }).success).toBe(true);
    expect(createOrderSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
  });
});

describe("slugify", () => {
  it("chuyển tiếng Việt có dấu thành slug", () => {
    expect(slugify("Váy & Đầm dự tiệc")).toBe("vay-dam-du-tiec");
  });
});
