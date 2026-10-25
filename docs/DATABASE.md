# Thiết kế cơ sở dữ liệu

- Hệ quản trị: MySQL 8 (bảng mã `utf8mb4_unicode_ci` để lưu tiếng Việt).
- Định nghĩa: `backend/prisma/schema.prisma`. Migration: `backend/prisma/migrations/20261025000000_init/migration.sql`.
- Tiền tệ lưu bằng `INT` (đơn vị VND) để tránh sai số số thực.

## 1. Sơ đồ quan hệ

```
User 1 ──── 0..1 Cart 1 ──── n CartItem n ──── 1 ProductVariant
  │                                                 │ n
  │ 1                                               │
  ├──── n Order 1 ──── n OrderItem ── (SetNull) ──► 1 Product ◄──── n Category
  │                        └──────── (SetNull) ──► ProductVariant
  └──── n Review n ──────────────────────────────► 1 Product
```

## 2. Các bảng

### User – tài khoản

| Cột | Kiểu | Ràng buộc / ý nghĩa |
| --- | --- | --- |
| id | INT | PK, tự tăng |
| name | VARCHAR(100) | Họ tên |
| email | VARCHAR(191) | **UNIQUE** – không cho đăng ký trùng |
| phone | VARCHAR(20) | Có thể null |
| passwordHash | VARCHAR(191) | Mật khẩu đã băm bcrypt |
| role | ENUM('CUSTOMER','ADMIN') | Mặc định CUSTOMER, index |
| createdAt, updatedAt | DATETIME(3) | |

### Category – danh mục

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | INT | PK |
| name | VARCHAR(100) | UNIQUE |
| slug | VARCHAR(120) | UNIQUE – dùng trên URL (`?category=ao-thun`) |
| description, imageUrl | VARCHAR | Có thể null |

### Product – sản phẩm

| Cột | Kiểu | Ràng buộc / ý nghĩa |
| --- | --- | --- |
| id | INT | PK |
| sku | VARCHAR(50) | UNIQUE – mã sản phẩm |
| name | VARCHAR(200) | |
| slug | VARCHAR(220) | UNIQUE – URL chi tiết |
| description | TEXT | |
| price | INT | Giá gốc |
| salePrice | INT NULL | Giá khuyến mãi (phải < price) |
| finalPrice | INT | Giá bán thực tế = salePrice ?? price, **index** – dùng để lọc/sắp xếp theo giá đúng cả khi có khuyến mãi |
| imageUrl | VARCHAR(500) | |
| categoryId | INT | **FK → Category (ON DELETE RESTRICT)**: không xóa được danh mục còn sản phẩm |
| isFeatured | BOOLEAN | Hiện ở mục nổi bật |
| status | ENUM('ACTIVE','INACTIVE') | Đang bán / Ngừng bán |
| Index | | `categoryId`, `(status, createdAt)`, `finalPrice` |

### ProductVariant – biến thể (size + màu)

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | INT | PK |
| productId | INT | FK → Product (**CASCADE**) |
| size, color | VARCHAR | **UNIQUE (productId, size, color)** |
| stock | INT | Tồn kho của riêng biến thể |

Tình trạng còn hàng của sản phẩm = tổng `stock` các biến thể (0 = hết hàng, 1–10 = sắp hết).

### Cart / CartItem – giỏ hàng (người dùng đã đăng nhập)

| Bảng | Cột chính | Ràng buộc |
| --- | --- | --- |
| Cart | id, userId | userId **UNIQUE** (mỗi người 1 giỏ), FK → User CASCADE |
| CartItem | cartId, variantId, quantity | **UNIQUE (cartId, variantId)**; FK → Cart CASCADE, FK → ProductVariant CASCADE |

Giỏ hàng không lưu giá: giá luôn được tính lại từ Product khi hiển thị và khi đặt hàng.

### Order – đơn hàng

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| id | INT | PK |
| code | VARCHAR(30) | **UNIQUE**, ví dụ `FH261025K7M2Q` |
| userId | INT | FK → User (**RESTRICT**: không xóa user đã có đơn) |
| recipientName, phone, address, note | VARCHAR | Thông tin giao hàng |
| paymentMethod | ENUM('COD','MOCK_ONLINE') | |
| paymentStatus | ENUM('UNPAID','PAID','REFUNDED') | |
| status | ENUM('PROCESSING','SHIPPING','COMPLETED','CANCELLED') | index |
| subtotal, shippingFee, total | INT | Tiền tại thời điểm đặt |
| idempotencyKey | VARCHAR(64) | **UNIQUE (userId, idempotencyKey)** – chống tạo đơn trùng |
| completedAt, cancelledAt | DATETIME NULL | completedAt có index, dùng cho thống kê doanh thu |
| cancelReason | VARCHAR(300) | |
| createdAt, updatedAt | DATETIME(3) | createdAt có index (lọc theo ngày) |

### OrderItem – chi tiết đơn (ảnh chụp tại thời điểm đặt)

| Cột | Ý nghĩa |
| --- | --- |
| orderId | FK → Order CASCADE |
| productId, variantId | FK **SET NULL** – xóa sản phẩm không làm mất dòng đơn hàng |
| productName, sku, size, color, imageUrl | Sao chép thông tin sản phẩm lúc đặt |
| unitPrice, quantity, lineTotal | Đơn giá lúc đặt; đổi giá sản phẩm sau này không ảnh hưởng đơn cũ |

### Review – đánh giá

| Cột | Ràng buộc |
| --- | --- |
| userId, productId | **UNIQUE (userId, productId)** – mỗi người đánh giá 1 lần; FK CASCADE |
| rating | 1–5 (kiểm tra ở Backend) |
| comment | VARCHAR(1000) |

## 3. Lý do điều chỉnh so với danh sách bảng gợi ý

- Thêm `finalPrice` (dữ liệu dẫn xuất) để lọc/sắp xếp theo giá đã giảm bằng chỉ mục thay vì tính trên từng dòng.
- `OrderItem` lưu “ảnh chụp” và dùng `SET NULL` để lịch sử đơn luôn nhất quán dù sản phẩm bị sửa/xóa.
- Thêm `idempotencyKey`, `completedAt`, `cancelledAt`, `paymentStatus` để phục vụ nghiệp vụ chống trùng đơn, thống kê và hoàn tiền.

## 4. Tạo database từ đầu

```sql
CREATE DATABASE fashion_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fashionhub'@'localhost' IDENTIFIED BY 'MatKhauManh@123';
GRANT ALL PRIVILEGES ON fashion_hub.* TO 'fashionhub'@'localhost';
FLUSH PRIVILEGES;
```

```bash
cd backend
npm run db:migrate   # chạy các file migration (prisma migrate deploy)
npm run db:seed      # tạo dữ liệu mẫu
```

Khi thay đổi `schema.prisma`: chạy `npm run db:migrate:dev -- --name ten_thay_doi` để Prisma sinh migration mới (cần quyền tạo shadow database).

## 5. Dữ liệu mẫu (seed)

| Loại | Số lượng |
| --- | --- |
| Danh mục | 7 (Áo thun, Áo sơ mi, Áo khoác, Quần, Váy & Đầm, Giày dép, Phụ kiện) |
| Sản phẩm | 27, mỗi sản phẩm 1–8 biến thể; có sản phẩm khuyến mãi, sắp hết hàng, hết hàng |
| Tài khoản | 1 admin + 8 khách hàng |
| Đơn hàng | 42 đơn trải trong 60 ngày, đủ 4 trạng thái |
| Đánh giá | Khoảng 46, chỉ tạo cho sản phẩm thuộc đơn đã hoàn thành |

Seed dùng bộ sinh số ngẫu nhiên có hạt cố định nên mỗi lần chạy cho ra cùng một bộ dữ liệu. Tồn kho mẫu được đặt sẵn, không bị trừ bởi các đơn hàng mẫu.
