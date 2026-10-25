# Kịch bản kiểm thử và kết quả thực tế

Ngày chạy: 25/10/2026. Môi trường: Ubuntu 24.04, Node.js 22.23, MariaDB 10.11 (tương thích MySQL), Chrome headless 153.
Tất cả kết quả dưới đây là kết quả **thực sự chạy lệnh**, không phải mô tả dự kiến.

## 1. Tóm tắt

| Hạng mục | Lệnh / cách chạy | Kết quả |
| --- | --- | --- |
| Tạo DB từ migration trên database trống | migration SQL → 9 bảng | ✅ Đạt |
| Seed dữ liệu | `npm run db:seed` | ✅ 7 danh mục, 27 sản phẩm, 9 tài khoản, 42 đơn, 46 đánh giá |
| TypeScript Backend | `npm run typecheck` | ✅ 0 lỗi |
| ESLint Backend | `npm run lint` | ✅ 0 lỗi |
| Unit + API test Backend | `npm test` | ✅ **44/44** |
| Build Backend | `npm run build` | ✅ |
| TypeScript Frontend | `npm run typecheck` | ✅ 0 lỗi |
| ESLint Frontend | `npm run lint` | ✅ 0 lỗi |
| Unit test Frontend | `npm test` | ✅ 2/2 |
| Build Frontend | `npm run build` | ✅ |
| Kiểm thử song song (race condition) | script gửi request đồng thời | ✅ 2/2 |
| Kiểm thử giao diện end-to-end | Chrome headless, 3 kích thước màn hình | ✅ **26/26**, 0 lỗi console, 0 lỗi API, 0 lỗi tràn ngang |

## 2. Kiểm thử Backend tự động (Vitest + Supertest) – 44 test

File: `backend/tests/unit/*.test.ts` (không cần DB) và `backend/tests/api/flow.test.ts` (chạy trên DB đã seed, tự tạo dữ liệu riêng và dọn dẹp sau khi chạy).

| Nhóm | Kịch bản | Kết quả |
| --- | --- | --- |
| Xác thực & phân quyền | Đăng ký khách mới, gửi kèm `role: ADMIN` vẫn thành CUSTOMER | ✅ |
| | Mật khẩu trong DB là chuỗi bcrypt, không phải văn bản thuần | ✅ |
| | Đăng ký email trùng → 409 | ✅ |
| | Đăng nhập sai mật khẩu → 401 | ✅ |
| | Không token → 401; khách gọi API admin → 403; token giả → 401 | ✅ |
| Admin sản phẩm & danh mục | Tạo danh mục | ✅ |
| | Dữ liệu sản phẩm sai → 400 kèm danh sách lỗi | ✅ |
| | Tạo sản phẩm có biến thể, `finalPrice` = giá KM, tổng tồn kho đúng | ✅ |
| | Sửa sản phẩm: đổi giá KM, giữ biến thể cũ, thêm biến thể mới | ✅ |
| | Xóa danh mục còn sản phẩm → 409 | ✅ |
| | Sản phẩm mới tìm thấy qua API công khai | ✅ |
| Giỏ hàng | Thêm vượt tồn kho → 400 “Chỉ còn 3…” | ✅ |
| | Thêm + cập nhật số lượng; tạm tính, phí ship, tổng tiền đúng theo giá DB | ✅ |
| | Giỏ khách vãng lai tính giá từ DB, loại biến thể không tồn tại | ✅ |
| Đặt hàng | Tạo đơn: lưu đơn giá, trừ tồn kho, xóa giỏ | ✅ |
| | Gửi lặp cùng `idempotencyKey` → trả đơn cũ (200), DB chỉ có 1 đơn | ✅ |
| | Giỏ trống → 400 | ✅ |
| | Người khác xem đơn → 404, chủ đơn → 200 | ✅ |
| | Khách hủy đơn đang xử lý → tồn kho được hoàn | ✅ |
| Admin đơn hàng, đánh giá, thống kê | PROCESSING → COMPLETED (nhảy cóc) → 400 | ✅ |
| | Chưa nhận hàng mà đánh giá → 403 | ✅ |
| | SHIPPING → COMPLETED: `paymentStatus = PAID`, doanh thu Dashboard tăng đúng bằng tổng đơn | ✅ |
| | Hủy đơn đã hoàn thành → 400 | ✅ |
| | Đã nhận hàng → đánh giá được; đánh giá lần 2 → 409; điểm TB cập nhật | ✅ |
| | Danh sách khách hàng có tổng chi tiêu đúng, không chứa `passwordHash` | ✅ |
| | Xóa sản phẩm vẫn giữ tên sản phẩm trong lịch sử đơn (`productId = null`) | ✅ |
| Chatbot | Không có API key → 503 `AI_NOT_CONFIGURED` | ✅ |
| | Hội thoại rỗng → 400 | ✅ |
| Unit | Tính giá KM, phí ship, tổng tiền số nguyên; quy tắc chuyển trạng thái; validator đăng ký/sản phẩm/đơn hàng; slug tiếng Việt | ✅ 16 test |

## 3. Kiểm thử đồng thời (race condition)

Chạy trên server thật bằng script gửi request song song:

| Kịch bản | Kết quả thực tế | Kỳ vọng |
| --- | --- | --- |
| 2 khách cùng đặt món cuối cùng (tồn kho = 1) cùng lúc | HTTP 201 và 409, tồn kho sau = 0 | Một người mua được, người kia báo hết hàng, không bán âm kho ✅ |
| 1 khách gửi 5 request đặt hàng cùng `idempotencyKey` cùng lúc | HTTP 201, 200, 200, 200, 200 – chỉ 1 đơn được tạo | Không tạo đơn trùng ✅ |

## 4. Kiểm thử Chatbot khi dịch vụ AI lỗi

| Kịch bản | Kết quả thực tế |
| --- | --- |
| Không có API key | 503 `AI_NOT_CONFIGURED`, khung chat hiển thị hướng dẫn cấu hình, ô nhập bị khóa ✅ |
| Có API key nhưng không kết nối được máy chủ AI | 502 `AI_UNAVAILABLE` “Không kết nối được tới dịch vụ AI…” ✅ |
| Có API key thật, gọi Gemini/OpenAI thành công | ⚠️ **Chưa xác minh** – môi trường phát triển không có API key và không truy cập được máy chủ AI. Cần thử trên máy có key (README mục 9). |

## 5. Kiểm thử giao diện end-to-end (Chrome headless)

Kịch bản tự động điều khiển trình duyệt thật trên Frontend (Vite) + Backend + DB đã seed; ghi lại mọi lỗi console, request thất bại, lỗi API 5xx và lỗi tràn ngang.

| # | Bước kiểm thử | Kết quả |
| --- | --- | --- |
| 1 | Trang chủ hiển thị đủ section, dữ liệu lấy từ API | ✅ |
| 2 | Danh sách sản phẩm (27 sản phẩm) + chuyển trang | ✅ |
| 3 | Tìm kiếm “jeans” | ✅ |
| 4 | Lọc danh mục Quần + giá 400–500 nghìn + sắp xếp giá giảm dần (thứ tự đúng) | ✅ |
| 5 | Chi tiết sản phẩm + khu vực đánh giá | ✅ |
| 6 | Khách vãng lai: chưa chọn size bị nhắc; chọn size rồi thêm giỏ, badge giỏ = 1 | ✅ |
| 7 | Sản phẩm hết hàng: nút mua bị khóa | ✅ |
| 8 | Giỏ khách: tăng số lượng, thành tiền 318.000₫ đúng | ✅ |
| 9 | Đăng ký: báo lỗi email sai, mật khẩu xác nhận không khớp (tiếng Việt) | ✅ |
| 10 | Đăng nhập sai mật khẩu báo lỗi | ✅ |
| 11 | Đăng nhập khách hàng, giỏ vãng lai được gộp vào tài khoản | ✅ |
| 12 | Khách hàng truy cập `/admin` bị chuyển hướng | ✅ |
| 13 | Thanh toán: thiếu địa chỉ bị báo lỗi; đặt COD thành công; giỏ về 0 | ✅ |
| 14 | Hủy đơn đang xử lý qua hộp thoại xác nhận | ✅ |
| 15 | Lịch sử đơn + lọc theo trạng thái | ✅ |
| 16 | Chatbot hiển thị thông báo chưa cấu hình | ✅ |
| 17 | Xóa phiên đăng nhập, đăng nhập Admin → vào thẳng `/admin` | ✅ |
| 18 | Dashboard: thẻ số liệu, biểu đồ doanh thu, đổi khoảng 7 ngày | ✅ |
| 19 | Admin sản phẩm: lọc sắp hết hàng | ✅ |
| 20 | Admin thêm sản phẩm: báo lỗi khi thiếu dữ liệu, tạo thành công, tìm thấy trong danh sách | ✅ |
| 21 | Admin xóa sản phẩm qua hộp thoại xác nhận | ✅ |
| 22 | Admin xóa danh mục còn sản phẩm bị từ chối | ✅ |
| 23 | Admin đơn hàng: không có nút nhảy thẳng sang Hoàn thành; chuyển sang Đang giao thành công | ✅ |
| 24 | Admin khách hàng + chi tiết, trang không chứa `passwordHash` | ✅ |
| 25 | Tablet 820×1180: 6 trang không tràn ngang | ✅ |
| 26 | Điện thoại 390×844: 6 trang không tràn ngang, bộ lọc dạng ngăn kéo hoạt động | ✅ |

**Lỗi phát hiện trong quá trình kiểm thử và đã sửa:**

1. `MainLayout` – `useEffect(() => window.scrollTo(...))` trả về giá trị của `scrollTo`; trên Chrome mới hàm này trả về Promise nên React báo lỗi và trang bị sập. Đã sửa thành khối lệnh không trả về giá trị.
2. Menu header bị xuống dòng ở màn hình 1366px → rút gọn menu, danh mục chỉ hiện từ màn hình ≥ 1280px.
3. Dashboard tràn ngang trên điện thoại (bảng trong lưới không co lại) → thêm `min-w-0` cho panel.
4. Lỗi kiểm tra form vẫn hiện sau khi người dùng đã sửa trường → lỗi tự ẩn khi nhập lại.
5. Tailwind v4 không cho `@apply` class tự định nghĩa trong `@layer components` (lỗi build) → chuyển sang `@utility`.

## 6. Những phần chưa được xác minh trong môi trường phát triển

| Hạng mục | Lý do | Cách tự kiểm tra |
| --- | --- | --- |
| Lệnh `npx prisma migrate deploy` | Môi trường không tải được Prisma schema engine (mạng bị chặn); file migration SQL đã được chạy trực tiếp và kiểm tra trên DB trống | Trên máy bạn chạy `npm run db:migrate` |
| MySQL 8 bản gốc | Đã chạy trên MariaDB 10.11 (cùng giao thức); cấu hình kết nối đã bật `allowPublicKeyRetrieval` cho MySQL 8 | Chạy theo README với MySQL 8 |
| Ảnh sản phẩm Unsplash | Môi trường chặn truy cập Unsplash nên chỉ thấy ảnh dự phòng | Mở website trên máy có Internet; link nào lỗi sẽ hiện khung xám có tên sản phẩm, sửa URL trong Admin |
| Font Google (Be Vietnam Pro, Playfair Display) | Bị chặn trong môi trường kiểm thử, giao diện dùng font dự phòng | Tự động tải khi có Internet |
| Chatbot với API key thật | Không có key | README mục 9 |
| Nút “Đăng xuất” trên menu | Kịch bản tự động xóa phiên bằng cách xóa token thay vì bấm nút | Bấm thủ công: menu tài khoản → Đăng xuất |

## 7. Kịch bản kiểm thử thủ công đề xuất (trước khi nộp/bảo vệ)

1. `npm run db:seed` → đăng nhập `khach@fashionhub.vn`, mua 2 sản phẩm bằng COD, kiểm tra tồn kho giảm trong Admin.
2. Mở 2 trình duyệt: khách đặt hàng, admin thấy đơn mới ở Dashboard.
3. Admin chuyển đơn sang Hoàn thành → doanh thu Dashboard tăng đúng bằng tổng đơn.
4. Khách vào sản phẩm của đơn đã hoàn thành → viết đánh giá.
5. Thêm API key → hỏi chatbot “Có đầm nào dưới 600k không?” → câu trả lời chỉ nhắc sản phẩm có thật, có thẻ sản phẩm bấm được.
6. Thu nhỏ trình duyệt hoặc dùng DevTools (Ctrl+Shift+M) kiểm tra giao diện điện thoại.
