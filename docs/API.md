# Tài liệu API

- Địa chỉ gốc: `http://localhost:4000/api`
- Dữ liệu gửi/nhận: JSON (`Content-Type: application/json`)
- Xác thực: header `Authorization: Bearer <token>` (token nhận khi đăng nhập/đăng ký)
- Ký hiệu quyền: 🌐 công khai · 🔐 cần đăng nhập · 🛡️ chỉ Admin

## Định dạng phản hồi

```json
// Thành công
{ "success": true, "message": "…(tùy chọn)", "data": { … }, "meta": { "page": 1, "limit": 12, "total": 27, "totalPages": 3 } }

// Lỗi
{ "success": false, "code": "BAD_REQUEST", "message": "Email không hợp lệ", "errors": [{ "field": "email", "message": "Email không hợp lệ" }] }
```

| Mã HTTP | Khi nào |
| --- | --- |
| 200 / 201 | Thành công / tạo mới thành công |
| 400 | Dữ liệu không hợp lệ, vi phạm quy tắc nghiệp vụ (vượt tồn kho, chuyển trạng thái sai) |
| 401 | Chưa đăng nhập, token sai/hết hạn, sai mật khẩu |
| 403 | Không đủ quyền (khách gọi API admin, chưa mua mà đánh giá) |
| 404 | Không tìm thấy (hoặc truy cập đơn hàng của người khác) |
| 409 | Xung đột: email/SKU trùng, xóa danh mục còn sản phẩm, hết hàng khi đặt, đã đánh giá |
| 429 | Gửi quá nhiều yêu cầu / AI hết hạn mức |
| 500 / 502 / 503 / 504 | Lỗi máy chủ / dịch vụ AI lỗi / chưa cấu hình AI / AI quá thời gian |

## 1. Xác thực – `/api/auth`

| Phương thức | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/auth/register` | 🌐 | Đăng ký (luôn tạo tài khoản khách hàng) |
| POST | `/auth/login` | 🌐 | Đăng nhập |
| GET | `/auth/me` | 🔐 | Thông tin tài khoản hiện tại |
| PUT | `/auth/me` | 🔐 | Cập nhật họ tên, SĐT |
| PUT | `/auth/change-password` | 🔐 | Đổi mật khẩu |

**POST /auth/register**

```json
{ "name": "Nguyễn Văn A", "email": "a@example.com", "phone": "0912345678", "password": "abc123", "confirmPassword": "abc123" }
```

→ `201` `{ "data": { "user": { … }, "token": "eyJ…" } }` · `409 EMAIL_EXISTS` nếu email đã dùng.

**POST /auth/login** — `{ "email": "khach@fashionhub.vn", "password": "Khach@123" }`

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": { "id": 51, "name": "Nguyễn Văn An", "email": "khach@fashionhub.vn", "phone": "0912345678", "role": "CUSTOMER", "createdAt": "2026-07-27T08:00:45.514Z" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

## 2. Sản phẩm & danh mục

| Phương thức | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/products` | 🌐 | Danh sách sản phẩm đang bán |
| GET | `/products/:slug` | 🌐 | Chi tiết (nhận slug hoặc id) + 4 sản phẩm liên quan |
| GET | `/categories` | 🌐 | Danh mục kèm số sản phẩm đang bán |
| GET | `/products/:id/reviews?page=1` | 🌐 | Đánh giá + tóm tắt (điểm TB, phân bố sao) |
| GET | `/products/:id/reviews/eligibility` | 🔐 | Người dùng có được đánh giá không |
| POST | `/products/:id/reviews` | 🔐 | Gửi đánh giá `{ rating: 1-5, comment }` |

**Tham số GET /products**

| Tham số | Ví dụ | Ý nghĩa |
| --- | --- | --- |
| `page`, `limit` | `1`, `12` | Phân trang (limit tối đa 100) |
| `q` | `jeans` | Tìm trong tên, mã, mô tả |
| `category` | `quan` | Slug danh mục |
| `minPrice`, `maxPrice` | `300000`, `500000` | Khoảng giá bán thực tế |
| `sort` | `newest` \| `price_asc` \| `price_desc` \| `name_asc` | Sắp xếp |
| `featured`, `onSale` | `true` | Chỉ sản phẩm nổi bật / đang giảm giá |

Ví dụ `GET /products?limit=1&sort=price_asc` (rút gọn):

```json
{
  "success": true,
  "data": [{
    "id": 140, "sku": "AT001", "name": "Áo thun cotton basic", "slug": "ao-thun-cotton-basic",
    "price": 199000, "salePrice": 159000, "finalPrice": 159000, "discountPercent": 20,
    "imageUrl": "https://images.unsplash.com/photo-…",
    "category": { "id": 38, "name": "Áo thun", "slug": "ao-thun" },
    "variants": [{ "id": 874, "size": "S", "color": "Trắng", "stock": 22 }, "…"],
    "sizes": ["S", "M", "L", "XL"], "colors": ["Trắng", "Đen"],
    "totalStock": 181, "inStock": true, "stockLevel": "in",
    "rating": { "avg": 4, "count": 1 }
  }],
  "meta": { "page": 1, "limit": 1, "total": 27, "totalPages": 27 }
}
```

## 3. Giỏ hàng – `/api/cart`

| Phương thức | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/cart` | 🔐 | Giỏ hàng của tôi (đã tính tiền) |
| POST | `/cart/items` | 🔐 | Thêm `{ variantId, quantity }` (cộng dồn, không vượt tồn kho) |
| PATCH | `/cart/items/:variantId` | 🔐 | Đổi số lượng `{ quantity }` |
| DELETE | `/cart/items/:variantId` | 🔐 | Xóa một sản phẩm |
| DELETE | `/cart` | 🔐 | Xóa toàn bộ giỏ |
| POST | `/cart/merge` | 🔐 | Gộp giỏ khách vãng lai `{ items: [{ variantId, quantity }] }` |
| POST | `/cart/preview` | 🌐 | Tính giỏ khách vãng lai theo giá/tồn kho thật |

Ví dụ `POST /cart/items { "variantId": 876, "quantity": 2 }`:

```json
{
  "success": true,
  "message": "Đã thêm vào giỏ hàng",
  "data": {
    "items": [{
      "variantId": 876, "productId": 140, "name": "Áo thun cotton basic", "size": "M", "color": "Trắng",
      "price": 199000, "unitPrice": 159000, "quantity": 2, "stock": 16, "lineTotal": 318000, "issue": null
    }],
    "totalQuantity": 2, "subtotal": 318000, "shippingFee": 30000, "total": 348000, "hasIssues": false
  }
}
```

Vượt tồn kho → `400 { "message": "Chỉ còn 14 sản phẩm trong kho" }`.

## 4. Đơn hàng – `/api/orders`

| Phương thức | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/orders` | 🔐 | Tạo đơn từ giỏ hàng |
| GET | `/orders?status=&page=` | 🔐 | Đơn hàng của tôi |
| GET | `/orders/:id` | 🔐 | Chi tiết (chỉ đơn của mình, người khác nhận 404) |
| PATCH | `/orders/:id/cancel` | 🔐 | Tự hủy khi đơn đang xử lý `{ reason? }` |

**POST /orders**

```json
{
  "recipientName": "Nguyễn Văn An",
  "phone": "0912345678",
  "address": "Số 1 Phố Xốm, Hà Đông, Hà Nội",
  "note": "Giao giờ hành chính",
  "paymentMethod": "COD",
  "idempotencyKey": "4f0c2a1e-docs-0001"
}
```

→ `201 "Đặt hàng thành công"` (rút gọn):

```json
{
  "data": {
    "id": 259, "code": "FH261025882M9", "status": "PROCESSING", "paymentMethod": "COD", "paymentStatus": "UNPAID",
    "subtotal": 318000, "shippingFee": 30000, "total": 348000,
    "items": [{ "productName": "Áo thun cotton basic", "sku": "AT001", "size": "M", "color": "Trắng", "unitPrice": 159000, "quantity": 2, "lineTotal": 318000 }]
  }
}
```

Gửi lại cùng `idempotencyKey` → `200 "Đơn hàng này đã được tạo trước đó"` với đúng đơn cũ. Giỏ trống → `400`. Hết hàng giữa chừng → `409 OUT_OF_STOCK`.

## 5. Quản trị – `/api/admin` 🛡️

| Phương thức | Đường dẫn | Mô tả |
| --- | --- | --- |
| GET | `/admin/dashboard?days=30` | Thống kê (days: 7, 30, 90) |
| GET | `/admin/products?q=&categoryId=&status=&stock=in\|low\|out&page=` | Danh sách sản phẩm (gồm cả ngừng bán) |
| GET | `/admin/products/:id` | Chi tiết sản phẩm |
| POST | `/admin/products` | Thêm sản phẩm |
| PUT | `/admin/products/:id` | Sửa sản phẩm (đồng bộ biến thể: có `id` = sửa, không `id` = thêm, thiếu = xóa) |
| PATCH | `/admin/products/:id/status` | `{ status: "ACTIVE" \| "INACTIVE" }` |
| PATCH | `/admin/products/:id/out-of-stock` | Đặt tồn kho mọi biến thể về 0 |
| DELETE | `/admin/products/:id` | Xóa sản phẩm |
| GET / POST | `/admin/categories` | Danh sách / thêm danh mục `{ name, description?, imageUrl? }` |
| PUT / DELETE | `/admin/categories/:id` | Sửa / xóa (409 nếu còn sản phẩm) |
| GET | `/admin/orders?q=&status=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=` | Danh sách đơn |
| GET | `/admin/orders/:id` | Chi tiết đơn |
| PATCH | `/admin/orders/:id/status` | `{ status, reason? }` – kiểm tra quy tắc chuyển trạng thái |
| GET | `/admin/users?q=&page=` | Danh sách khách hàng (số đơn, tổng chi tiêu) |
| GET | `/admin/users/:id` | Chi tiết khách hàng + lịch sử đơn |

**Body thêm/sửa sản phẩm**

```json
{
  "sku": "AT010",
  "name": "Áo thun kẻ ngang",
  "description": "Áo thun cotton kẻ ngang phong cách Pháp",
  "price": 259000,
  "salePrice": 219000,
  "imageUrl": "https://images.unsplash.com/photo-…",
  "categoryId": 38,
  "isFeatured": false,
  "status": "ACTIVE",
  "variants": [
    { "size": "M", "color": "Trắng", "stock": 10 },
    { "id": 901, "size": "L", "color": "Trắng", "stock": 5 }
  ]
}
```

**Cập nhật trạng thái đơn** — `PATCH /admin/orders/259/status { "status": "SHIPPING" }`. Chuyển sai quy tắc, ví dụ PROCESSING → COMPLETED:

```json
{ "success": false, "code": "BAD_REQUEST", "message": "Không thể chuyển từ \"Đang xử lý\" sang \"Đã hoàn thành\"" }
```

Khách hàng gọi API admin → `403 "Chỉ quản trị viên được truy cập chức năng này"`.

## 6. Chatbot – `/api/chat`

| Phương thức | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/chat/status` | 🌐 | `{ enabled, provider, model }` |
| POST | `/chat` | 🌐 | Gửi hội thoại (giới hạn 15 tin/phút/IP) |

```json
// Request
{ "messages": [ { "role": "user", "content": "Tư vấn áo thun dưới 200k" } ] }

// Thành công (khi đã cấu hình key)
{ "success": true, "data": { "reply": "…", "suggestions": [{ "id": 140, "name": "Áo thun cotton basic", "slug": "ao-thun-cotton-basic", "price": 199000, "salePrice": 159000, "imageUrl": "…" }], "provider": "gemini" } }

// Chưa cấu hình key (kết quả thực tế)
{ "success": false, "code": "AI_NOT_CONFIGURED", "message": "Chatbot chưa được cấu hình. Quản trị viên cần thêm GEMINI_API_KEY hoặc OPENAI_API_KEY vào file backend/.env." }
```

## 7. Khác

`GET /api/health` → `{ "success": true, "data": { "status": "ok", "time": "…" } }`

## 8. Thử API nhanh bằng curl

```bash
# Đăng nhập, lấy token
curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@fashionhub.vn","password":"Admin@123"}'

# Gọi API admin với token
curl -s http://localhost:4000/api/admin/dashboard -H "Authorization: Bearer <TOKEN>"
```

Có thể dùng Postman/Thunder Client: tạo request, chọn tab Authorization → Bearer Token → dán token.
