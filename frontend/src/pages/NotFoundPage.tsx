import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Không tìm thấy trang");
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-8xl font-semibold text-neutral-200">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-2 text-sm text-muted">Trang bạn tìm có thể đã bị xóa hoặc đường dẫn không đúng.</p>
      <Link to="/" className="btn-primary mt-8">Về trang chủ</Link>
    </div>
  );
}
