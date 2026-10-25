# FASHION HUB – Website bán hàng thời trang trực tuyến

Bài kết thúc học phần theo phương pháp **Vibe Coding**: xây dựng hệ thống thương mại điện tử hoàn chỉnh gồm phân hệ **Khách hàng** và **Quản trị (Admin)**, có tích hợp **AI Chatbot tư vấn bán hàng**.

## 1. Mục tiêu hệ thống

- Khách hàng xem, tìm kiếm, lọc sản phẩm thời trang; quản lý giỏ hàng; đặt hàng (COD hoặc thanh toán giả lập); theo dõi đơn và đánh giá sản phẩm đã mua.
- Quản trị viên quản lý sản phẩm, danh mục, đơn hàng, khách hàng và xem thống kê doanh thu được tính từ dữ liệu thật.
- Backend có xác thực JWT, phân quyền, kiểm tra dữ liệu, transaction khi đặt hàng; dữ liệu lưu thật trong MySQL.

## 2. Công nghệ sử dụng

| Tầng | Công nghệ |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Recharts (biểu đồ), lucide-react (icon), sonner (thông báo) |
| Backend | Node.js, Express 5, TypeScript, Zod 4 (kiểm tra dữ liệu), JWT + bcryptjs, helmet, CORS, express-rate-limit |
| Database | MySQL 8 (tương thích MariaDB 10.6+), Prisma ORM 7 (driver adapter `@prisma/adapter-mariadb`) |
| AI | Google Gemini hoặc OpenAI (gọi qua REST từ Backend, key đọc từ `.env`) |
| Kiểm thử | Vitest + Supertest (unit + API tích hợp) |

## 3. Chức năng chính

**Khách hàng:** trang chủ (banner, danh mục, nổi bật, mới, khuyến mãi, giới thiệu thương hiệu) · đăng ký/đăng nhập/đăng xuất · danh sách sản phẩm với tìm kiếm, lọc danh mục & khoảng giá, sắp xếp, phân trang · chi tiết sản phẩm với chọn màu/size theo tồn kho · giỏ hàng (lưu trên server khi đăng nhập, lưu trình duyệt khi chưa đăng nhập và tự gộp khi đăng nhập) · thanh toán COD / giả lập · lịch sử & chi tiết đơn, tự hủy đơn khi đang xử lý · đánh giá sản phẩm đã mua · trang tài khoản (sửa thông tin, đổi mật khẩu) · chatbot AI.

**Admin:** Dashboard (doanh thu, đơn, khách hàng, sản phẩm, đơn đang xử lý, sắp hết hàng, biểu đồ doanh thu 7/30/90 ngày, thống kê trạng thái, đơn mới nhất, bán chạy) · CRUD sản phẩm + biến thể size/màu/tồn kho, bật/tắt bán, đánh dấu hết hàng · CRUD danh mục (chặn xóa khi còn sản phẩm) · quản lý đơn (tìm, lọc trạng thái & ngày, cập nhật trạng thái theo quy tắc, hoàn kho khi hủy) · quản lý khách hàng (tìm kiếm, lịch sử đơn, tổng chi tiêu).

Chi tiết đối chiếu với đề bài: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## 4. Kiến trúc

```
Trình duyệt (React SPA :5173) ──HTTP/JSON──► Express API (:4000/api) ──Prisma──► MySQL (:3306)
                                                     └──HTTPS──► Gemini / OpenAI (chỉ khi có API key)
```

Khi chạy dev, Vite chuyển tiếp mọi request `/api/*` sang Backend nên Frontend không cần biết địa chỉ Backend. Xem thêm [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 5. Cấu trúc thư mục

```
fashion-hub/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Mô hình dữ liệu
│   │   ├── migrations/            # Migration SQL tạo bảng
│   │   └── seed.ts                # Dữ liệu mẫu
│   ├── prisma.config.ts
│   ├── src/
│   │   ├── config/env.ts          # Đọc & kiểm tra biến môi trường
│   │   ├── lib/                   # Prisma client, cấu hình kết nối
│   │   ├── middlewares/           # auth (JWT, phân quyền), validate (Zod), error
│   │   ├── validators/            # Schema Zod cho từng nhóm API
│   │   ├── services/              # Nghiệp vụ (giỏ hàng, đặt hàng, thống kê, chatbot...)
│   │   ├── controllers/           # Nhận request, gọi service, trả response
│   │   ├── routes/                # Khai báo endpoint
│   │   ├── utils/                 # Tính tiền, quy tắc trạng thái đơn, slug...
│   │   ├── app.ts / server.ts
│   └── tests/{unit,api}/          # Vitest + Supertest
├── frontend/
│   └── src/
│       ├── components/            # UI dùng chung, header/footer, thẻ sản phẩm, chatbot
│       ├── context/               # AuthContext, CartContext
│       ├── hooks/                 # useAsync, useDebounce...
│       ├── layouts/               # MainLayout, AdminLayout
│       ├── pages/                 # Trang khách hàng + pages/admin
│       ├── services/              # Gọi API bằng axios
│       ├── types/ · utils/
├── docs/                          # Tài liệu yêu cầu, kiến trúc, DB, API, kiểm thử, bảo vệ
├── package.json                   # Lệnh tiện ích chạy cả 2 phần
└── README.md
```

## 6. Phần mềm cần cài

- **Node.js 22 LTS** (tối thiểu 20.19) – kiểm tra: `node -v`
- **MySQL 8.0+** (hoặc MariaDB 10.6+, hoặc XAMPP/Laragon có MySQL)
- **Git**
- Trình soạn thảo: VS Code (khuyến nghị)

## 7. Cài đặt và chạy dự án

### 7.1. Tải mã nguồn và cài thư viện

```bash
git clone https://github.com/<tai-khoan>/fashion-hub.git
cd fashion-hub
npm install            # cài công cụ chạy song song (concurrently)
npm run install:all    # cài thư viện cho backend và frontend
```

> `npm install` trong thư mục backend sẽ tự chạy `prisma generate` để tạo Prisma Client.

### 7.2. Tạo database MySQL

Đăng nhập MySQL (ví dụ `mysql -u root -p`, hoặc dùng phpMyAdmin/MySQL Workbench) rồi chạy:

```sql
CREATE DATABASE fashion_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fashionhub'@'localhost' IDENTIFIED BY 'MatKhauManh@123';
GRANT ALL PRIVILEGES ON fashion_hub.* TO 'fashionhub'@'localhost';
FLUSH PRIVILEGES;
```

> Dùng XAMPP với user `root` không mật khẩu cũng được: `DATABASE_URL="mysql://root:@localhost:3306/fashion_hub"`. Nếu muốn dùng lệnh `npm run db:migrate:dev` hoặc `db:reset`, user cần thêm quyền tạo database tạm (shadow database): `GRANT ALL PRIVILEGES ON *.* TO 'fashionhub'@'localhost';`.

### 7.3. Cấu hình file `.env`

```bash
cd backend
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Mở `backend/.env` và sửa:

| Biến | Ý nghĩa |
| --- | --- |
| `DATABASE_URL` | Chuỗi kết nối MySQL: `mysql://USER:PASSWORD@localhost:3306/fashion_hub` (mật khẩu có ký tự đặc biệt như `@` cần mã hóa, ví dụ `@` → `%40`) |
| `JWT_SECRET` | Chuỗi bí mật ≥ 32 ký tự. Tạo nhanh: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | Địa chỉ Frontend được phép gọi API (mặc định `http://localhost:5173`) |
| `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_PASSWORD` | Mật khẩu tài khoản mẫu tạo khi seed |
| `AI_PROVIDER`, `GEMINI_API_KEY` / `OPENAI_API_KEY` | Tùy chọn, dành cho chatbot (xem mục 9) |

Frontend không bắt buộc file `.env` (mặc định gọi `/api` qua proxy của Vite). Có thể tham khảo `frontend/.env.example`.

### 7.4. Migration và seed

```bash
# trong thư mục backend
npm run db:migrate     # tạo bảng (prisma migrate deploy)
npm run db:seed        # XÓA dữ liệu cũ và tạo dữ liệu mẫu
```

Hoặc từ thư mục gốc: `npm run db:setup`. Seed tạo 7 danh mục, 27 sản phẩm (kèm biến thể size/màu), 9 tài khoản, 42 đơn hàng trong 60 ngày gần nhất và các đánh giá.

### 7.5. Chạy Backend và Frontend

Cách 1 – chạy cả hai cùng lúc từ thư mục gốc:

```bash
npm run dev
```

Cách 2 – mở 2 terminal:

```bash
cd backend && npm run dev      # http://localhost:4000/api
cd frontend && npm run dev     # http://localhost:5173
```

### 7.6. Địa chỉ truy cập

| Thành phần | Địa chỉ |
| --- | --- |
| Website | http://localhost:5173 |
| Trang quản trị | http://localhost:5173/admin |
| API | http://localhost:4000/api (kiểm tra: `/api/health`) |

### 7.7. Tài khoản demo

| Vai trò | Email | Mật khẩu (mặc định trong `.env.example`) |
| --- | --- | --- |
| Quản trị viên | `admin@fashionhub.vn` | `Admin@123` |
| Khách hàng | `khach@fashionhub.vn` | `Khach@123` |

Các khách hàng mẫu khác (`binh.tran@example.com`, `cuong.le@example.com`, …) dùng chung mật khẩu khách hàng.

**Đổi mật khẩu mẫu:** sửa `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_PASSWORD` trong `backend/.env` rồi chạy lại `npm run db:seed` (lưu ý seed xóa toàn bộ dữ liệu). Hoặc đăng nhập rồi vào **Tài khoản → Đổi mật khẩu** để đổi mà không mất dữ liệu.

## 8. Build bản production

```bash
npm run build                    # build cả backend (dist/server.js) và frontend (frontend/dist)
cd backend && npm start          # chạy API đã build
cd frontend && npm run preview   # xem thử bản build frontend tại http://localhost:4173
```

Khi triển khai thật, đặt `frontend/dist` sau một web server (Nginx…) và chuyển tiếp `/api` về Backend, hoặc build frontend với `VITE_API_URL=https://ten-mien-api/api` và thêm tên miền frontend vào `CLIENT_URL`.

## 9. Cấu hình AI Chatbot

1. Lấy API key: Gemini tại https://aistudio.google.com/apikey hoặc OpenAI tại https://platform.openai.com/api-keys.
2. Trong `backend/.env`:
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=khoa_cua_ban
   # hoặc
   AI_PROVIDER=openai
   OPENAI_API_KEY=khoa_cua_ban
   ```
3. Khởi động lại Backend. Bấm biểu tượng chat ở góc phải màn hình để thử.

Khi chưa có key, website vẫn chạy bình thường; cửa sổ chat hiển thị rõ “Chatbot cần API key” và API `/api/chat` trả lỗi `503 AI_NOT_CONFIGURED`. API key chỉ nằm ở Backend, không bao giờ gửi xuống trình duyệt.

## 10. Kiểm thử

```bash
cd backend
npm run test:unit    # kiểm thử đơn vị (không cần DB)
npm run test:api     # kiểm thử API tích hợp — cần DB đã migrate + seed và Backend KHÔNG cần chạy
npm test             # chạy tất cả

cd ../frontend && npm test
npm run lint && npm run typecheck   # tại thư mục gốc: kiểm tra cả hai phần
```

Kịch bản và kết quả thực tế: [docs/TESTING.md](docs/TESTING.md).

## 11. Đưa dự án lên GitHub

1. Đăng nhập GitHub → **New repository** → đặt tên `fashion-hub` → chọn Public/Private → **không** tick “Add a README” → **Create repository**.
2. Kiểm tra không có bí mật: file `backend/.env` đã nằm trong `.gitignore`.
3. Trong thư mục `fashion-hub`:

```bash
git init
git add .
git status                          # kiểm tra: KHÔNG được thấy .env hay node_modules
git commit -m "Fashion Hub: website bán hàng thời trang"
git branch -M main
git remote add origin https://github.com/<tai-khoan>/fashion-hub.git
git push -u origin main
```

Lần sau cập nhật: `git add . && git commit -m "Mô tả thay đổi" && git push`.

## 12. Xử lý sự cố thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| `Cấu hình .env không hợp lệ` khi chạy backend | Kiểm tra đã tạo `backend/.env`, `JWT_SECRET` đủ 32 ký tự |
| `Không khởi động được máy chủ` / lỗi kết nối DB | MySQL đã chạy chưa, đúng user/mật khẩu/tên DB trong `DATABASE_URL` chưa |
| Frontend báo “Không kết nối được máy chủ” | Backend chưa chạy ở cổng 4000 |
| `Port 4000/5173 already in use` | Đổi `PORT` trong `backend/.env` (và `VITE_PROXY_TARGET` trong `frontend/.env`) hoặc tắt chương trình đang chiếm cổng |
| `prisma migrate dev` báo lỗi shadow database | Dùng `npm run db:migrate` (deploy) hoặc cấp thêm quyền như mục 7.2 |
| Ảnh sản phẩm hiện khung xám có tên | Link ảnh không tải được (mất mạng hoặc link hỏng); sửa URL ảnh trong trang Admin |

## 13. Hạn chế và hướng phát triển

- Ảnh sản phẩm dùng link Unsplash (nhập URL), chưa có chức năng tải ảnh lên máy chủ; mỗi sản phẩm một ảnh chính.
- Thanh toán trực tuyến chỉ là giả lập; chưa tích hợp cổng thanh toán thật (VNPay, MoMo…).
- Chưa có quên mật khẩu qua email, mã giảm giá, quản lý địa chỉ giao hàng nhiều địa chỉ.
- JWT lưu ở localStorage để đơn giản; bản thương mại nên dùng cookie httpOnly + refresh token.
- Chatbot chưa lưu lịch sử hội thoại trên server và chưa tìm kiếm ngữ nghĩa (RAG) khi danh mục sản phẩm lớn.
- Hướng phát triển: upload ảnh (Cloudinary/S3), nhiều ảnh mỗi sản phẩm, wishlist, mã giảm giá, gửi email xác nhận đơn, triển khai Docker/CI.
