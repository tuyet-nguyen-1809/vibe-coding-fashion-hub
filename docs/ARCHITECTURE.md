# Kiến trúc và luồng xử lý

## 1. Tổng quan

```
┌────────────────────────┐   HTTP/JSON (REST)    ┌──────────────────────────────┐   Prisma ORM   ┌──────────┐
│ Frontend – React SPA   │ ───────────────────►  │ Backend – Express API        │ ─────────────► │  MySQL   │
│ Vite dev server :5173  │  Authorization:       │ :4000/api                    │                │  :3306   │
│ (proxy /api → :4000)   │  Bearer <JWT>         │                              │ ──HTTPS──►  Gemini/OpenAI
└────────────────────────┘                       └──────────────────────────────┘   (tùy chọn)
```

Ba phần tách biệt: Frontend chỉ hiển thị và gọi API; mọi quy tắc nghiệp vụ (giá, tồn kho, quyền) nằm ở Backend; dữ liệu nằm trong MySQL.

## 2. Backend: phân lớp

```
Request → routes/ → middlewares (requireAuth, requireAdmin, validate) → controllers/ → services/ → Prisma → MySQL
                                                                                    ↓
Response ← utils/response.ts (định dạng thống nhất) ←────────────────────────────────┘
Lỗi bất kỳ → middlewares/error.ts (chuyển thành JSON tiếng Việt, không lộ stack trace)
```

| Lớp | Trách nhiệm | Ví dụ |
| --- | --- | --- |
| `routes/` | Khai báo URL, phương thức HTTP, gắn middleware | `admin.routes.ts` gắn `requireAuth, requireAdmin` cho toàn bộ `/api/admin/*` |
| `middlewares/auth.ts` | Đọc JWT, kiểm tra hạn, **đọc lại quyền từ DB** | Token của tài khoản đã bị xóa → 401 |
| `middlewares/validate.ts` | Kiểm tra body/query/params bằng Zod, trả lỗi theo từng trường | Email sai định dạng → 400 kèm `errors[]` |
| `controllers/` | Lấy dữ liệu đã kiểm tra, gọi service, chọn mã HTTP | Đặt hàng mới → 201, gửi lặp → 200 |
| `services/` | Toàn bộ nghiệp vụ | Trừ kho, chuyển trạng thái, tính doanh thu |
| `utils/` | Hàm thuần dễ test | `pricing.ts`, `orderStatus.ts` |

Định dạng phản hồi thống nhất:

```json
{ "success": true, "message": "Đặt hàng thành công", "data": { }, "meta": { "page": 1, "limit": 12, "total": 27, "totalPages": 3 } }
{ "success": false, "code": "OUT_OF_STOCK", "message": "\"Áo thun cotton basic\" (M/Trắng) chỉ còn 2 sản phẩm" }
```

## 3. Frontend: tổ chức

| Thư mục | Vai trò |
| --- | --- |
| `services/api.ts` | Axios instance: tự gắn JWT, khi nhận 401 thì phát sự kiện đăng xuất, hàm lấy thông báo lỗi tiếng Việt |
| `services/index.ts` | Hàm gọi từng API (authApi, productApi, cartApi, orderApi, adminApi, chatApi) |
| `context/AuthContext.tsx` | Trạng thái đăng nhập; khôi phục phiên bằng `GET /auth/me` khi tải lại trang |
| `context/CartContext.tsx` | Giỏ hàng: dùng API khi đã đăng nhập, localStorage khi chưa; gộp khi đăng nhập |
| `hooks/useAsync.ts` | Quản lý trạng thái tải / lỗi / dữ liệu cho mọi trang, bỏ qua kết quả của request cũ |
| `components/RouteGuards.tsx` | `RequireAuth`, `RequireAdmin` (chỉ để điều hướng — quyền thật kiểm tra ở Backend) |
| `layouts/` | `MainLayout` (header, footer, chatbot) và `AdminLayout` (sidebar) |
| `pages/admin/*` | Tải riêng bằng `lazy()` để trang khách hàng nhẹ hơn |

## 4. Các luồng nghiệp vụ chính

### 4.1. Đăng nhập

1. Frontend gửi `POST /api/auth/login {email, password}`.
2. Backend tìm user theo email, so sánh mật khẩu bằng `bcrypt.compare` với `passwordHash`.
3. Đúng → ký JWT `{ sub: userId, role }` bằng `JWT_SECRET`, hết hạn sau `JWT_EXPIRES_IN`.
4. Frontend lưu token vào localStorage; mọi request sau gửi `Authorization: Bearer <token>`.
5. `requireAuth` xác minh chữ ký + hạn, rồi đọc lại `role` từ DB.

### 4.2. Thêm vào giỏ hàng

- **Đã đăng nhập:** `POST /api/cart/items {variantId, quantity}` → Backend kiểm tra biến thể tồn tại, sản phẩm đang bán, `số lượng trong giỏ + số lượng thêm ≤ tồn kho` → upsert `CartItem` → trả về giỏ đã tính tiền.
- **Khách vãng lai:** lưu `[{variantId, quantity}]` ở localStorage; để hiển thị gọi `POST /api/cart/preview` nên giá và tồn kho luôn là số liệu thật ở DB. Khi đăng nhập, `POST /api/cart/merge` gộp vào giỏ tài khoản (không vượt tồn kho).

### 4.3. Đặt hàng (quan trọng nhất)

```
POST /api/orders { recipientName, phone, address, paymentMethod, idempotencyKey }
│
├─ 1. Đã có đơn với (userId, idempotencyKey)? → trả lại đơn cũ (200) — chống bấm 2 lần / mạng gửi lặp
│
└─ 2. prisma.$transaction:
      a. Đọc giỏ hàng + biến thể + sản phẩm từ DB
      b. Kiểm tra: sản phẩm đang bán, số lượng ≤ tồn kho
      c. Giá = salePrice (nếu hợp lệ) hoặc price — lấy từ DB, KHÔNG nhận giá từ Frontend
      d. Trừ kho: UPDATE ... SET stock = stock - q WHERE id = ? AND stock >= q
         → nếu 0 dòng bị ảnh hưởng (người khác vừa mua hết) → báo lỗi, ROLLBACK toàn bộ
      e. Tạo Order + OrderItem (lưu tên, SKU, size, màu, ảnh, đơn giá tại thời điểm đặt)
      f. Xóa giỏ hàng
   → COMMIT. Lỗi ở bất kỳ bước nào → không có thay đổi nào được ghi.
```

`idempotencyKey` do Frontend sinh (UUID) khi mở trang thanh toán và giữ nguyên nếu bấm lại; DB có ràng buộc unique `(userId, idempotencyKey)` nên kể cả 2 request chạy song song cũng chỉ tạo 1 đơn.

### 4.4. Cập nhật trạng thái đơn

```
PROCESSING ──► SHIPPING ──► COMPLETED
     │             │
     └──► CANCELLED ◄┘        (COMPLETED và CANCELLED là trạng thái cuối)
```

- Quy tắc nằm ở `utils/orderStatus.ts` và được kiểm tra ở Backend; Frontend chỉ hiển thị các nút hợp lệ.
- Cập nhật có điều kiện `WHERE id = ? AND status = <trạng thái cũ>` để hai admin thao tác cùng lúc không làm hoàn kho hai lần.
- Hủy → hoàn kho từng biến thể; nếu đã thanh toán giả lập thì `paymentStatus = REFUNDED`.
- Hoàn thành → ghi `completedAt` (dùng cho biểu đồ doanh thu), `paymentStatus = PAID`.

### 4.5. Thống kê Dashboard

- **Doanh thu thực tế** = tổng `total` của đơn `COMPLETED`. Không tính đơn hủy, không tính đơn chưa giao.
- **Chờ ghi nhận** = tổng đơn `PROCESSING` + `SHIPPING`.
- Biểu đồ: nhóm đơn hoàn thành theo ngày `completedAt` (múi giờ Việt Nam), đủ mọi ngày trong khoảng 7/30/90 ngày.
- Sắp hết hàng: tổng tồn kho các biến thể từ 1 đến 10.

### 4.6. Chatbot

1. Frontend gửi tối đa 12 tin nhắn gần nhất tới `POST /api/chat`.
2. Backend kiểm tra có API key; không có → 503 `AI_NOT_CONFIGURED` (không giả vờ trả lời).
3. Dựng system prompt: vai trò nhân viên tư vấn, chính sách cửa hàng, danh sách sản phẩm đang bán (giá, KM, size/màu còn hàng) lấy từ DB.
4. Gọi Gemini (`generateContent`) hoặc OpenAI (`chat/completions`) với timeout 25 giây.
5. Trả câu trả lời + các sản phẩm được nhắc tên để Frontend hiển thị thẻ sản phẩm có link.

## 5. Bảo mật

| Rủi ro | Biện pháp |
| --- | --- |
| Lộ mật khẩu | bcrypt (10 vòng); không bao giờ `select` `passwordHash` khi trả dữ liệu |
| Tự nâng quyền Admin | Đăng ký luôn tạo `CUSTOMER`, trường `role` từ client bị bỏ qua; quyền đọc từ DB mỗi request |
| Truy cập trái phép | `requireAuth`/`requireAdmin` ở Backend; đơn hàng lọc theo `userId` (người khác nhận 404) |
| Sửa giá từ trình duyệt | Backend tự tính giá từ DB |
| SQL injection | Prisma dùng truy vấn tham số hóa |
| Dò mật khẩu / spam | Rate limit đăng nhập/đăng ký (30 lần/15 phút) và chatbot (15 tin/phút) |
| Lộ thông tin lỗi | Middleware lỗi chỉ trả thông báo thân thiện, log chi tiết ở server |
| Lộ bí mật | JWT secret, DB, API key nằm trong `.env` (đã `.gitignore`); có `.env.example` |
| Header bảo mật, CORS | `helmet`, CORS chỉ cho phép địa chỉ trong `CLIENT_URL` |
