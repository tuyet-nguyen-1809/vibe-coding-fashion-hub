# Hướng dẫn trình bày và bảo vệ

Tiêu chí “Hiểu biết mã nguồn & Bảo vệ” chiếm 30%. Giảng viên sẽ hỏi về **kiến trúc**, **luồng dữ liệu** và **cách các thành phần kết nối**. Hãy tự chạy dự án, đọc các file được chỉ ra bên dưới và tự trả lời được trước khi bảo vệ.

## 1. Kịch bản demo đề xuất (8–10 phút)

1. **Giới thiệu (30 giây):** Fashion Hub – website bán thời trang; React + Express + MySQL qua Prisma; làm bằng phương pháp Vibe Coding: em đóng vai Product Manager, viết yêu cầu, kiểm duyệt và kiểm thử mã do AI sinh ra.
2. **Kiến trúc (1 phút):** mở `docs/ARCHITECTURE.md`, chỉ sơ đồ 3 tầng; mở cây thư mục `backend/src` giải thích route → controller → service.
3. **Khách hàng (3 phút):** trang chủ → tìm “jeans” → lọc danh mục Quần + khoảng giá → sắp xếp giá → chi tiết sản phẩm, chọn size/màu (size hết hàng bị gạch) → thêm giỏ khi chưa đăng nhập → đăng nhập (giỏ được gộp) → thanh toán COD → trang đặt hàng thành công → lịch sử đơn → hủy đơn.
4. **Admin (3 phút):** Dashboard (giải thích cách tính doanh thu) → Sản phẩm: lọc “sắp hết hàng”, thêm sản phẩm với nút “Tạo nhanh” biến thể → Đơn hàng: chuyển Đang xử lý → Đang giao → Hoàn thành, cho thấy không thể nhảy thẳng sang Hoàn thành → Danh mục: thử xóa danh mục còn sản phẩm bị chặn → Khách hàng.
5. **Chatbot (1 phút):** mở cửa sổ chat; nếu có key thì hỏi “Gợi ý áo thun dưới 200k”; nếu không, giải thích hệ thống báo rõ chưa cấu hình thay vì trả lời giả.
6. **Chất lượng (1 phút):** chạy `npm test` trong backend (44 test), mở `docs/TESTING.md`.

> Mẹo: chạy `npm run db:seed` trước buổi bảo vệ để dữ liệu sạch; mở sẵn 2 tab trình duyệt (khách hàng và admin – dùng 1 tab ẩn danh cho tài khoản thứ hai).

## 2. Các file nên nắm chắc

| Chủ đề | File |
| --- | --- |
| Mô hình dữ liệu | `backend/prisma/schema.prisma` |
| Đăng nhập, JWT, phân quyền | `backend/src/services/auth.service.ts`, `backend/src/middlewares/auth.ts` |
| Kiểm tra dữ liệu | `backend/src/validators/*.ts`, `backend/src/middlewares/validate.ts` |
| Đặt hàng (transaction, trừ kho) | `backend/src/services/order.service.ts` – hàm `createOrder` |
| Quy tắc trạng thái đơn | `backend/src/utils/orderStatus.ts` |
| Thống kê | `backend/src/services/dashboard.service.ts` |
| Chatbot | `backend/src/services/chat.service.ts`, `frontend/src/components/ChatWidget.tsx` |
| Gọi API từ Frontend | `frontend/src/services/api.ts`, `frontend/src/services/index.ts` |
| Giỏ hàng phía Frontend | `frontend/src/context/CartContext.tsx` |
| Bảo vệ route Frontend | `frontend/src/components/RouteGuards.tsx` |

## 3. Câu hỏi thường gặp và gợi ý trả lời

### Kiến trúc & luồng dữ liệu

**Hỏi: Khi người dùng bấm “Thêm vào giỏ”, dữ liệu đi qua những đâu?**
Đáp: `ProductDetailPage` gọi `add()` của `CartContext` → nếu đã đăng nhập, `cartApi.add` gửi `POST /api/cart/items` kèm JWT (axios interceptor tự gắn) → `cart.routes.ts` chạy `requireAuth` rồi `validate(addCartItemSchema)` → `cart.controller.add` → `cart.service.addItem` kiểm tra sản phẩm đang bán và tổng số lượng ≤ tồn kho → Prisma upsert bảng `CartItem` → trả về giỏ đã tính tiền → Context cập nhật state, badge giỏ hàng trên header đổi số.

**Hỏi: Vì sao tách controller và service?**
Đáp: Controller chỉ xử lý HTTP (đọc request, chọn mã trạng thái); service chứa nghiệp vụ, không phụ thuộc Express nên dễ tái sử dụng và dễ test. Ví dụ `orderService.updateStatusAdmin` dùng chung quy tắc với `cancelMine`.

**Hỏi: Frontend và Backend kết nối thế nào khi chạy ở 2 cổng khác nhau?**
Đáp: Khi dev, Vite proxy chuyển `/api/*` từ cổng 5173 sang 4000 (`vite.config.ts`), nên trình duyệt coi như cùng nguồn. Backend vẫn cấu hình CORS chỉ cho phép `CLIENT_URL` cho trường hợp gọi trực tiếp.

**Hỏi: Prisma là gì, tại sao dùng?**
Đáp: ORM sinh mã truy vấn có kiểu TypeScript từ `schema.prisma`; tự tham số hóa câu lệnh nên chống SQL injection; có migration để tạo bảng giống nhau trên mọi máy. Prisma 7 kết nối MySQL qua driver adapter (`@prisma/adapter-mariadb`).

### Xác thực & bảo mật

**Hỏi: JWT hoạt động thế nào? Lưu ở đâu?**
Đáp: Khi đăng nhập đúng, server ký token chứa `sub` (id) và `role` bằng `JWT_SECRET`, hạn 7 ngày. Frontend lưu ở localStorage và gửi trong header `Authorization`. Server xác minh chữ ký và hạn mỗi request; ngoài ra đọc lại quyền từ DB để nếu tài khoản bị xóa/đổi quyền thì token cũ không còn tác dụng. Hạn chế: localStorage có thể bị đọc nếu web dính XSS; bản thương mại nên dùng cookie httpOnly.

**Hỏi: Mật khẩu được lưu thế nào?**
Đáp: Băm bằng bcrypt (có salt, 10 vòng) trước khi lưu vào `passwordHash`. Khi đăng nhập dùng `bcrypt.compare`. API không bao giờ trả `passwordHash` (dùng `select` chỉ các trường an toàn).

**Hỏi: Nếu khách hàng tự sửa giao diện để hiện nút Admin hoặc gọi thẳng API admin?**
Đáp: Nút chỉ là giao diện; mọi `/api/admin/*` đều qua `requireAuth` + `requireAdmin` ở Backend, khách hàng sẽ nhận 403. Đăng ký luôn tạo CUSTOMER, trường `role` gửi lên bị Zod loại bỏ (có test chứng minh).

**Hỏi: Nếu sửa giá trong request đặt hàng thì sao?**
Đáp: API đặt hàng không nhận giá. Service đọc giá từ bảng Product ngay trong transaction.

**Hỏi: Người A có xem được đơn của người B bằng cách đổi id trên URL?**
Đáp: Không. `getMine` lọc `WHERE id = ? AND userId = <người đang đăng nhập>`, không thấy thì trả 404 (không tiết lộ đơn có tồn tại hay không).

### Nghiệp vụ

**Hỏi: Làm sao không bán quá tồn kho khi 2 người cùng mua món cuối?**
Đáp: Trừ kho bằng câu lệnh có điều kiện `UPDATE … SET stock = stock - q WHERE id = ? AND stock >= q` trong transaction. Người thứ hai cập nhật được 0 dòng → ném lỗi → rollback, không tạo đơn.

**Hỏi: Bấm “Đặt hàng” 2 lần có tạo 2 đơn không?**
Đáp: Không. Trang thanh toán sinh một `idempotencyKey` (UUID); bảng Order có unique `(userId, idempotencyKey)`. Request lặp trả lại đơn cũ với mã 200. Nút cũng bị khóa khi đang gửi.

**Hỏi: Transaction là gì, dùng ở đâu?**
Đáp: Nhóm nhiều thao tác thành một khối “tất cả hoặc không”. Dùng khi đặt hàng (kiểm tra kho, trừ kho, tạo đơn, tạo chi tiết, xóa giỏ), khi hủy đơn (đổi trạng thái + hoàn kho) và khi sửa sản phẩm (cập nhật sản phẩm + đồng bộ biến thể).

**Hỏi: Doanh thu được tính thế nào?**
Đáp: Chỉ tính tổng tiền đơn **Đã hoàn thành**, ghi nhận theo ngày hoàn thành (`completedAt`). Đơn đang xử lý/đang giao hiển thị riêng là “chờ ghi nhận”, đơn hủy không tính. Toàn bộ là truy vấn thật (`dashboard.service.ts`), không có số viết cứng.

**Hỏi: Đổi giá sản phẩm thì đơn hàng cũ có bị đổi theo không?**
Đáp: Không. `OrderItem` lưu đơn giá, tên, SKU, size, màu, ảnh tại thời điểm đặt. Xóa sản phẩm thì `productId` thành NULL nhưng dòng đơn hàng vẫn còn.

**Hỏi: Vì sao lưu tiền bằng số nguyên?**
Đáp: Số thực dấu phẩy động có sai số (0.1 + 0.2 ≠ 0.3). VND không có phần lẻ nên `INT` vừa chính xác vừa đơn giản.

**Hỏi: Quy tắc chuyển trạng thái đơn?**
Đáp: Đang xử lý → Đang giao → Đã hoàn thành; hủy được khi chưa hoàn thành (hoàn kho); khách chỉ tự hủy khi đang xử lý. Hoàn thành và Đã hủy là trạng thái cuối. Kiểm tra ở Backend bằng `canTransition`, cập nhật có điều kiện trạng thái cũ để tránh xử lý trùng.

### Chatbot

**Hỏi: Chatbot biết sản phẩm của cửa hàng bằng cách nào?**
Đáp: Mỗi lần hỏi, Backend lấy danh sách sản phẩm đang bán từ DB (tên, giá, khuyến mãi, size/màu còn hàng, link) đưa vào system prompt, kèm vai trò “nhân viên tư vấn Fashion Hub” và chính sách cửa hàng; yêu cầu AI chỉ giới thiệu sản phẩm trong danh sách.

**Hỏi: API key có bị lộ không?**
Đáp: Không. Key chỉ ở `backend/.env` (bị `.gitignore`), Frontend gọi `/api/chat` của mình, Backend mới gọi Gemini/OpenAI.

**Hỏi: AI lỗi hoặc hết hạn mức thì sao?**
Đáp: Có timeout 25 giây; lỗi 429 → báo hết hạn mức; 401/403 → báo key không hợp lệ; chưa có key → 503. Giao diện hiện thông báo lỗi trong khung chat, phần còn lại của website không bị ảnh hưởng.

### Vibe Coding

**Hỏi: Em đóng góp gì nếu AI viết code?**
Đáp (gợi ý, hãy nói đúng thực tế của em): em viết đặc tả yêu cầu chi tiết (vai trò, công nghệ, nghiệp vụ, tiêu chí), kiểm duyệt mã, chạy kiểm thử, yêu cầu AI sửa lỗi phát hiện được (ví dụ lỗi `useEffect` trả về Promise làm trang bị lỗi trên Chrome mới, lỗi menu xuống dòng ở màn hình 1366px, lỗi tràn ngang Dashboard trên điện thoại), và quyết định các quy tắc nghiệp vụ như cách tính doanh thu.

## 4. Bài tập tự luyện trước khi bảo vệ

Giảng viên có thể yêu cầu sửa trực tiếp. Hãy tự thử:

1. Đổi ngưỡng miễn phí vận chuyển từ 500.000đ thành 400.000đ → `backend/src/utils/pricing.ts` và `frontend/src/utils/format.ts`.
2. Đổi ngưỡng “sắp hết hàng” từ 10 thành 5 → `LOW_STOCK_THRESHOLD` trong `product.service.ts`.
3. Thêm cách sắp xếp “Tên Z – A” → `productSortValues` + `sortToOrderBy` (Backend) và `SORTS` (Frontend).
4. Cho phép hủy đơn ở trạng thái Đang giao từ phía khách → `customerCanCancel` + nút trong `OrdersPage.tsx`.
5. Thêm trường “chất liệu” cho sản phẩm → `schema.prisma` → `npm run db:migrate:dev -- --name add_material` → validator → form admin → trang chi tiết.
