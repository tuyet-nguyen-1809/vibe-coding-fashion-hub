/**
 * Kiểm thử API tích hợp (chạy trên database thật đã migrate + seed).
 * Bài test tự tạo danh mục/sản phẩm/khách hàng riêng và dọn dẹp sau khi chạy xong.
 * Chạy: npm run test:api
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";

const app = createApp();
const stamp = Date.now().toString(36);
const customerEmail = `test_${stamp}@example.com`;
const otherEmail = `other_${stamp}@example.com`;
const sku = `TST${stamp}`.toUpperCase().slice(0, 20);

let adminToken = "";
let customerToken = "";
let otherToken = "";
let categoryId = 0;
let productId = 0;
let variantId = 0;
let orderId = 0;

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: process.env.SEED_ADMIN_EMAIL || "admin@fashionhub.vn", password: process.env.SEED_ADMIN_PASSWORD });
  expect(res.status, "Cần chạy `npm run db:seed` trước khi chạy test API").toBe(200);
  adminToken = res.body.data.token;
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { email: { in: [customerEmail, otherEmail] } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.review.deleteMany({ where: { userId: { in: ids } } });
  await prisma.order.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (productId) await prisma.product.deleteMany({ where: { id: productId } });
  if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.$disconnect();
});

describe("Xác thực & phân quyền", () => {
  it("đăng ký khách hàng mới, trường role bị bỏ qua", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Khách Test",
      email: customerEmail,
      password: "abc123",
      confirmPassword: "abc123",
      role: "ADMIN",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("CUSTOMER");
    expect(res.body.data.user.passwordHash).toBeUndefined();
    customerToken = res.body.data.token;

    const other = await request(app)
      .post("/api/auth/register")
      .send({ name: "Người Khác", email: otherEmail, password: "abc123", confirmPassword: "abc123" });
    otherToken = other.body.data.token;
  });

  it("mật khẩu được băm bằng bcrypt trong DB", async () => {
    const u = await prisma.user.findUnique({ where: { email: customerEmail } });
    expect(u?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(u?.passwordHash).not.toBe("abc123");
  });

  it("không cho đăng ký email trùng", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Trùng", email: customerEmail, password: "abc123", confirmPassword: "abc123" });
    expect(res.status).toBe(409);
  });

  it("đăng nhập sai mật khẩu trả về 401", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: customerEmail, password: "sai123" });
    expect(res.status).toBe(401);
  });

  it("chặn truy cập API cần đăng nhập và API admin", async () => {
    expect((await request(app).get("/api/cart")).status).toBe(401);
    expect((await request(app).get("/api/admin/dashboard")).status).toBe(401);
    expect((await request(app).get("/api/admin/dashboard").set(auth(customerToken))).status).toBe(403);
    expect((await request(app).get("/api/cart").set(auth("token-gia"))).status).toBe(401);
  });
});

describe("Admin quản lý danh mục & sản phẩm", () => {
  it("tạo danh mục", async () => {
    const res = await request(app).post("/api/admin/categories").set(auth(adminToken)).send({ name: `Danh mục test ${stamp}` });
    expect(res.status).toBe(201);
    categoryId = res.body.data.id;
  });

  it("từ chối sản phẩm dữ liệu sai", async () => {
    const res = await request(app)
      .post("/api/admin/products")
      .set(auth(adminToken))
      .send({ sku: "X", name: "", price: -1, variants: [] });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("tạo sản phẩm với biến thể và tồn kho", async () => {
    const res = await request(app)
      .post("/api/admin/products")
      .set(auth(adminToken))
      .send({
        sku,
        name: `Áo kiểm thử ${stamp}`,
        description: "Sản phẩm dùng cho kiểm thử tự động",
        price: 300000,
        salePrice: 250000,
        imageUrl: "https://example.com/test.jpg",
        categoryId,
        variants: [
          { size: "M", color: "Đen", stock: 3 },
          { size: "L", color: "Đen", stock: 10 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.finalPrice).toBe(250000);
    expect(res.body.data.totalStock).toBe(13);
    productId = res.body.data.id;
    variantId = res.body.data.variants.find((v: { size: string }) => v.size === "M").id;
  });

  it("sửa sản phẩm và đồng bộ biến thể", async () => {
    const current = await request(app).get(`/api/admin/products/${productId}`).set(auth(adminToken));
    const variants = current.body.data.variants.map((v: { id: number; size: string; color: string; stock: number }) => ({ ...v }));
    variants.push({ size: "XL", color: "Trắng", stock: 4 });
    const res = await request(app)
      .put(`/api/admin/products/${productId}`)
      .set(auth(adminToken))
      .send({ ...current.body.data, categoryId, salePrice: 240000, variants });
    expect(res.status).toBe(200);
    expect(res.body.data.finalPrice).toBe(240000);
    expect(res.body.data.variants).toHaveLength(3);
  });

  it("không xóa được danh mục đang có sản phẩm", async () => {
    const res = await request(app).delete(`/api/admin/categories/${categoryId}`).set(auth(adminToken));
    expect(res.status).toBe(409);
  });

  it("sản phẩm mới hiển thị ở API công khai và tìm kiếm được", async () => {
    const res = await request(app).get(`/api/products?q=${sku}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].sku).toBe(sku);
  });
});

describe("Giỏ hàng", () => {
  it("không thêm quá tồn kho", async () => {
    const res = await request(app).post("/api/cart/items").set(auth(customerToken)).send({ variantId, quantity: 4 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Chỉ còn 3");
  });

  it("thêm, cập nhật số lượng và tính tổng tiền theo giá DB", async () => {
    let res = await request(app).post("/api/cart/items").set(auth(customerToken)).send({ variantId, quantity: 1 });
    expect(res.status).toBe(200);
    res = await request(app).patch(`/api/cart/items/${variantId}`).set(auth(customerToken)).send({ quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.subtotal).toBe(480000);
    expect(res.body.data.shippingFee).toBe(30000);
    expect(res.body.data.total).toBe(510000);
  });

  it("giỏ hàng khách vãng lai được tính giá từ DB", async () => {
    const res = await request(app).post("/api/cart/preview").send({ items: [{ variantId, quantity: 1 }, { variantId: 99999999, quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].unitPrice).toBe(240000);
    expect(res.body.data.removedVariantIds).toEqual([99999999]);
  });
});

describe("Đặt hàng", () => {
  const key = `key-${stamp}-0001`;
  const body = { recipientName: "Khách Test", phone: "0912345678", address: "12 Trần Duy Hưng, Cầu Giấy, Hà Nội", paymentMethod: "COD", idempotencyKey: key };

  it("tạo đơn, trừ tồn kho và xóa giỏ hàng", async () => {
    const res = await request(app).post("/api/orders").set(auth(customerToken)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(510000);
    expect(res.body.data.items[0].unitPrice).toBe(240000);
    orderId = res.body.data.id;

    const v = await prisma.productVariant.findUnique({ where: { id: variantId } });
    expect(v?.stock).toBe(1);
    const cart = await request(app).get("/api/cart").set(auth(customerToken));
    expect(cart.body.data.items).toHaveLength(0);
  });

  it("gửi lặp cùng idempotencyKey không tạo đơn trùng", async () => {
    const res = await request(app).post("/api/orders").set(auth(customerToken)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(orderId);
    expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it("không đặt hàng khi giỏ trống", async () => {
    const res = await request(app).post("/api/orders").set(auth(customerToken)).send({ ...body, idempotencyKey: `key-${stamp}-0002` });
    expect(res.status).toBe(400);
  });

  it("người khác không xem được đơn hàng", async () => {
    expect((await request(app).get(`/api/orders/${orderId}`).set(auth(otherToken))).status).toBe(404);
    expect((await request(app).get(`/api/orders/${orderId}`).set(auth(customerToken))).status).toBe(200);
  });

  it("khách hủy đơn đang xử lý thì hoàn tồn kho", async () => {
    // Tạo đơn thứ 2 để hủy
    await request(app).post("/api/cart/items").set(auth(customerToken)).send({ variantId, quantity: 1 });
    const created = await request(app).post("/api/orders").set(auth(customerToken)).send({ ...body, idempotencyKey: `key-${stamp}-0003` });
    expect(created.status).toBe(201);
    expect((await prisma.productVariant.findUnique({ where: { id: variantId } }))?.stock).toBe(0);

    const res = await request(app).patch(`/api/orders/${created.body.data.id}/cancel`).set(auth(customerToken)).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CANCELLED");
    expect((await prisma.productVariant.findUnique({ where: { id: variantId } }))?.stock).toBe(1);
  });
});

describe("Admin xử lý đơn hàng, đánh giá & thống kê", () => {
  it("chặn chuyển trạng thái sai quy tắc", async () => {
    const res = await request(app).patch(`/api/admin/orders/${orderId}/status`).set(auth(adminToken)).send({ status: "COMPLETED" });
    expect(res.status).toBe(400);
  });

  it("chưa nhận hàng thì chưa được đánh giá", async () => {
    const res = await request(app).post(`/api/products/${productId}/reviews`).set(auth(customerToken)).send({ rating: 5, comment: "Sản phẩm rất đẹp" });
    expect(res.status).toBe(403);
  });

  it("chuyển Đang giao -> Hoàn thành, doanh thu tăng đúng", async () => {
    const before = await request(app).get("/api/admin/dashboard").set(auth(adminToken));
    let res = await request(app).patch(`/api/admin/orders/${orderId}/status`).set(auth(adminToken)).send({ status: "SHIPPING" });
    expect(res.status).toBe(200);
    res = await request(app).patch(`/api/admin/orders/${orderId}/status`).set(auth(adminToken)).send({ status: "COMPLETED" });
    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe("PAID");
    const after = await request(app).get("/api/admin/dashboard").set(auth(adminToken));
    expect(after.body.data.stats.totalRevenue - before.body.data.stats.totalRevenue).toBe(510000);
  });

  it("đơn đã hoàn thành không thể hủy", async () => {
    const res = await request(app).patch(`/api/admin/orders/${orderId}/status`).set(auth(adminToken)).send({ status: "CANCELLED" });
    expect(res.status).toBe(400);
  });

  it("đã mua và nhận hàng thì được đánh giá 1 lần", async () => {
    const ok = await request(app).post(`/api/products/${productId}/reviews`).set(auth(customerToken)).send({ rating: 5, comment: "Sản phẩm rất đẹp" });
    expect(ok.status).toBe(201);
    const again = await request(app).post(`/api/products/${productId}/reviews`).set(auth(customerToken)).send({ rating: 4, comment: "Đánh giá lần hai" });
    expect(again.status).toBe(409);
    const list = await request(app).get(`/api/products/${productId}/reviews`);
    expect(list.body.summary.avg).toBe(5);
  });

  it("admin xem danh sách khách hàng không lộ mật khẩu", async () => {
    const res = await request(app).get(`/api/admin/users?q=${customerEmail}`).set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data[0].totalSpent).toBe(510000);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("xóa sản phẩm vẫn giữ lịch sử đơn hàng", async () => {
    const res = await request(app).delete(`/api/admin/products/${productId}`).set(auth(adminToken));
    expect(res.status).toBe(200);
    const order = await request(app).get(`/api/orders/${orderId}`).set(auth(customerToken));
    expect(order.body.data.items[0].productName).toContain("Áo kiểm thử");
    expect(order.body.data.items[0].productId).toBeNull();
    productId = 0;
  });
});

describe("Chatbot", () => {
  it("báo chưa cấu hình khi không có API key (không giả vờ trả lời)", async () => {
    const status = await request(app).get("/api/chat/status");
    if (status.body.data.enabled) return; // Đã có key thật -> bỏ qua kiểm tra này
    const res = await request(app).post("/api/chat").send({ messages: [{ role: "user", content: "Tư vấn áo thun" }] });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("AI_NOT_CONFIGURED");
  });

  it("kiểm tra dữ liệu đầu vào chatbot", async () => {
    const res = await request(app).post("/api/chat").send({ messages: [] });
    expect(res.status).toBe(400);
  });
});
