import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./Header";

export function Footer() {
  return (
    <footer className="mt-20 bg-ink text-neutral-300">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-400">
            Thời trang tối giản, chất lượng bền vững cho nhịp sống hiện đại. Mỗi thiết kế đều được chọn lọc kỹ lưỡng.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Mua sắm</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/products" className="hover:text-white">Tất cả sản phẩm</Link></li>
            <li><Link to="/products?sort=newest" className="hover:text-white">Hàng mới về</Link></li>
            <li><Link to="/products?onSale=true" className="hover:text-white">Khuyến mãi</Link></li>
            <li><Link to="/products?featured=true" className="hover:text-white">Sản phẩm nổi bật</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Hỗ trợ khách hàng</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/orders" className="hover:text-white">Tra cứu đơn hàng</Link></li>
            <li><Link to="/cart" className="hover:text-white">Giỏ hàng</Link></li>
            <li><Link to="/account" className="hover:text-white">Tài khoản của tôi</Link></li>
            <li className="text-neutral-400">Đổi trả trong 7 ngày</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Liên hệ</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0" /> Số 1 Phố Xốm, Phú Lãm, Hà Đông, Hà Nội</li>
            <li className="flex gap-2.5"><Phone className="mt-0.5 size-4 shrink-0" /> 1900 6868 (8:00 – 22:00)</li>
            <li className="flex gap-2.5"><Mail className="mt-0.5 size-4 shrink-0" /> hotro@fashionhub.vn</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-neutral-500 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Fashion Hub. Dự án học phần – Trường Đại học Đại Nam.</p>
          <p>Thanh toán: COD · Trực tuyến (giả lập)</p>
        </div>
      </div>
    </footer>
  );
}
