# Bảng yêu cầu và chức năng đã triển khai

Đối chiếu đề bài “Xây dựng hệ thống bán hàng bằng phương pháp Vibe Coding” với mã nguồn thực tế. Trạng thái “Hoàn thành” nghĩa là đã có mã và đã được kiểm thử (xem [TESTING.md](TESTING.md)).

## 1. Tiêu chí đánh giá của đề bài và cách đáp ứng

| Tiêu chí | Trọng số | Cách dự án đáp ứng |
| --- | --- | --- |
| Tính hoàn thiện sản phẩm | 40% | Đủ chức năng khách hàng + admin + chatbot; 44 test backend và 26 bước kiểm thử giao diện tự động đều đạt |
| Giao diện & trải nghiệm | 30% | Phong cách tối giản trắng/đen/xám, màu nhấn cam đất; responsive 3 kích thước; có loading, empty, error state, xác nhận trước thao tác quan trọng, thông báo tiếng Việt |
| Hiểu mã nguồn & bảo vệ | 30% | Kiến trúc tách lớp rõ ràng, chú thích tiếng Việt ở các điểm nghiệp vụ quan trọng, tài liệu [ARCHITECTURE.md](ARCHITECTURE.md) và [DEFENSE_GUIDE.md](DEFENSE_GUIDE.md) |

## 2. Yêu cầu công nghệ

| Đề bài khuyến khích | Lựa chọn | Ghi chú |
| --- | --- | --- |
| Vue 3 / React (TS, Tailwind, Vite) | React 19 + TypeScript + Tailwind 4 + Vite 8 | |
| FastAPI / .NET 8 / Node.js (Express/NestJS) | Node.js + Express 5 + TypeScript | |
| MySQL hoặc SQLite | MySQL 8 qua Prisma ORM 7 | Tiền lưu bằng số nguyên VND |
| MVC hoặc tách Client/Server | Tách Client/Server; Backend chia route → controller → service | |

## 3. Chức năng phía khách hàng

| Yêu cầu đề bài | Triển khai | Vị trí mã nguồn | Trạng thái |
| --- | --- | --- | --- |
| Đăng ký, đăng nhập (JWT) | Đăng ký kiểm tra email hợp lệ/trùng, xác nhận mật khẩu; bcrypt; JWT 7 ngày; đăng xuất; không thể tự đăng ký Admin | `services/auth.service.ts`, `pages/AuthPages.tsx` | Hoàn thành |
| Trang chủ: sản phẩm nổi bật | Banner, danh mục, nổi bật, khuyến mãi, sản phẩm mới, giới thiệu thương hiệu, footer | `pages/HomePage.tsx` | Hoàn thành |
| Phân trang, lọc danh mục, khoảng giá, tìm kiếm | Xử lý ở Backend; lọc theo giá bán thực tế (đã tính khuyến mãi); sắp xếp mới nhất/giá tăng/giá giảm/tên | `product.service.ts › listPublic`, `pages/ProductsPage.tsx` | Hoàn thành |
| Chi tiết sản phẩm: ảnh, mô tả, đánh giá | Ảnh, mã SP, mô tả, giá, tồn kho theo từng size/màu, đánh giá + phân bố sao, sản phẩm liên quan | `pages/ProductDetailPage.tsx` | Hoàn thành |
| Giỏ hàng: thêm/sửa/xóa, tính tổng | Chặn vượt tồn kho; giỏ lưu DB khi đăng nhập; giỏ khách vãng lai lưu trình duyệt, giá luôn lấy từ API, tự gộp khi đăng nhập | `cart.service.ts`, `context/CartContext.tsx` | Hoàn thành |
| Tạo đơn hàng, thanh toán giả lập | COD + thanh toán trực tuyến giả lập (không nhập thẻ); transaction; trừ kho an toàn; chống tạo đơn trùng; lưu ảnh chụp giá | `order.service.ts › createOrder` | Hoàn thành |
| Lịch sử đơn & trạng thái (Đang xử lý, Đang giao, Đã hoàn thành) | Có thêm trạng thái Đã hủy; khách tự hủy khi đang xử lý và được hoàn kho; chỉ xem đơn của mình | `pages/OrdersPage.tsx` | Hoàn thành |
| Đánh giá sản phẩm | Chỉ người đã nhận hàng (đơn hoàn thành) mới đánh giá; mỗi người 1 lần/sản phẩm | `review.service.ts` | Hoàn thành |
| (Bổ sung) Tài khoản cá nhân | Sửa họ tên, SĐT; đổi mật khẩu | `pages/AccountPage.tsx` | Hoàn thành |

## 4. Chức năng phía quản trị

| Yêu cầu đề bài | Triển khai | Trạng thái |
| --- | --- | --- |
| CRUD sản phẩm, cập nhật còn/hết hàng | Thêm/sửa/xóa (có xác nhận); quản lý giá, giá KM, mô tả, danh mục, ảnh, nổi bật; biến thể size/màu/tồn kho; bật/tắt bán; nút “đánh dấu hết hàng”; lọc theo tồn kho | Hoàn thành |
| Quản lý đơn hàng, cập nhật trạng thái | Tìm theo mã/tên/SĐT, lọc trạng thái & khoảng ngày; chỉ cho chuyển trạng thái hợp lệ; hủy đơn hoàn kho; lưu thời điểm tạo/cập nhật/hoàn thành/hủy | Hoàn thành |
| Thống kê doanh thu, đơn, khách hàng | Dashboard tính từ DB: doanh thu (chỉ đơn hoàn thành), tổng đơn, khách hàng, sản phẩm, đơn đang xử lý, sắp hết hàng, biểu đồ 7/30/90 ngày, thống kê trạng thái, đơn mới, bán chạy | Hoàn thành |
| (Bổ sung) Quản lý danh mục | CRUD; chặn xóa khi danh mục còn sản phẩm | Hoàn thành |
| (Bổ sung) Quản lý khách hàng | Danh sách, tìm kiếm, chi tiết + lịch sử đơn, tổng chi tiêu; không trả mật khẩu | Hoàn thành |

## 5. Phần nâng cao: AI Chatbot

| Yêu cầu | Triển khai | Trạng thái |
| --- | --- | --- |
| API `POST /api/chat` | Có, kèm `GET /api/chat/status` | Hoàn thành |
| Dùng API key OpenAI hoặc Gemini | Chọn bằng `AI_PROVIDER`; key đọc từ `.env`, không lộ ra Frontend | Mã hoàn thành; **chưa gọi thử với key thật** (môi trường phát triển không có key) |
| Context: là nhân viên tư vấn + dữ liệu sản phẩm hiện có | System prompt tiếng Việt + danh sách sản phẩm đang bán lấy từ DB (giá, KM, size/màu còn hàng, tồn kho) | Hoàn thành |
| Giao diện chat | Cửa sổ chat nổi, câu hỏi gợi ý, thẻ sản phẩm được AI nhắc tới | Hoàn thành |
| Khi chưa có key / lỗi AI | Báo rõ chưa cấu hình (503), hết hạn mức (429), quá thời gian (504); các chức năng khác không bị ảnh hưởng | Hoàn thành (đã test trường hợp chưa có key) |

## 6. Các lựa chọn kỹ thuật tự quyết định

| Vấn đề đề bài chưa quy định | Lựa chọn | Lý do |
| --- | --- | --- |
| Kiểu dữ liệu tiền | `Int` (VND) | VND không có phần lẻ; tránh sai số số thực |
| Doanh thu tính thế nào | Chỉ đơn **Đã hoàn thành**, theo ngày hoàn thành | Đơn chưa giao có thể bị hủy; không tính đơn đã hủy |
| Quy tắc trạng thái | Đang xử lý → Đang giao → Đã hoàn thành; hủy được khi chưa hoàn thành | Phản ánh quy trình giao hàng thực tế |
| Khách tự hủy đơn | Chỉ khi “Đang xử lý” | Hàng đã giao cho vận chuyển thì cần cửa hàng xử lý |
| Phí vận chuyển | 30.000đ, miễn phí từ 500.000đ | Quy tắc phổ biến, tính ở Backend |
| Còn/hết hàng | Tính từ tổng tồn kho biến thể; “sắp hết” khi ≤ 10; trạng thái Đang bán/Ngừng bán tách riêng | Không để hai nguồn dữ liệu mâu thuẫn |
| Xóa sản phẩm đã có đơn | Cho xóa; chi tiết đơn giữ “ảnh chụp” tên/giá/ảnh | Không làm hỏng lịch sử đơn hàng |
| Giỏ hàng khách vãng lai | localStorage, gộp vào DB khi đăng nhập | Khách xem/thêm giỏ không cần tài khoản |
| Ảnh sản phẩm | Nhập URL (dữ liệu mẫu dùng Unsplash) | Giữ dự án gọn; có ảnh dự phòng khi link lỗi |
