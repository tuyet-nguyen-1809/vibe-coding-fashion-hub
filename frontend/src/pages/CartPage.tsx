import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ProductImage } from "../components/ui/ProductImage";
import { QuantityInput } from "../components/ui/QuantityInput";
import { PageLoader } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/States";
import { ConfirmDialog } from "../components/ui/Modal";
import { formatVND, FREE_SHIPPING_THRESHOLD } from "../utils/format";

export default function CartPage() {
  useDocumentTitle("Giỏ hàng");
  const { cart, loading, update, remove, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const run = async (variantId: number, fn: () => Promise<void>) => {
    setBusy(variantId);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error && !("isAxiosError" in e) ? e.message : getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (loading && cart.items.length === 0) return <PageLoader label="Đang tải giỏ hàng..." />;

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShoppingBag className="size-7" />}
          title="Giỏ hàng của bạn đang trống"
          description="Khám phá các sản phẩm mới nhất và thêm vào giỏ hàng nhé."
          action={<Link to="/products" className="btn-primary">Tiếp tục mua sắm</Link>}
        />
      </div>
    );
  }

  const remaining = FREE_SHIPPING_THRESHOLD - cart.subtotal;

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex items-end justify-between">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Giỏ hàng <span className="text-lg text-muted">({cart.totalQuantity})</span></h1>
        <button type="button" className="text-sm text-muted underline hover:text-red-600" onClick={() => setConfirmClear(true)}>Xóa tất cả</button>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-line border-y border-line">
          {cart.items.map((item) => (
            <li key={item.variantId} className="flex gap-4 py-5">
              <Link to={`/products/${item.slug}`} className="shrink-0">
                <ProductImage src={item.imageUrl} alt={item.name} className="h-32 w-24 rounded-xl bg-paper sm:h-36 sm:w-28" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/products/${item.slug}`} className="line-clamp-2 text-sm font-medium hover:underline">{item.name}</Link>
                    <p className="mt-1 text-xs text-muted">{item.color} · Size {item.size}</p>
                    <p className="mt-1 text-sm">
                      {formatVND(item.unitPrice)}
                      {item.unitPrice < item.price && <span className="ml-2 text-xs text-muted line-through">{formatVND(item.price)}</span>}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatVND(item.lineTotal)}</p>
                </div>
                {item.issue && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="size-3.5" /> {item.issue}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <QuantityInput value={item.quantity} max={Math.max(item.stock, 1)} onChange={(q) => run(item.variantId, () => update(item.variantId, q))} disabled={busy === item.variantId || item.stock === 0} />
                  <button type="button" onClick={() => run(item.variantId, () => remove(item.variantId))} className="flex items-center gap-1.5 text-xs text-muted hover:text-red-600" disabled={busy === item.variantId}>
                    <Trash2 className="size-4" /> Xóa
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl bg-paper p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2>
          {remaining > 0 ? (
            <div className="mt-4">
              <p className="text-xs text-neutral-600">Mua thêm <b>{formatVND(remaining)}</b> để được miễn phí vận chuyển</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200"><div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, (cart.subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }} /></div>
            </div>
          ) : (
            <p className="mt-4 text-xs font-medium text-emerald-700">🎉 Đơn hàng của bạn được miễn phí vận chuyển</p>
          )}
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Tạm tính</dt><dd>{formatVND(cart.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Phí vận chuyển</dt><dd>{cart.shippingFee ? formatVND(cart.shippingFee) : "Miễn phí"}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Tổng cộng</dt><dd>{formatVND(cart.total)}</dd></div>
          </dl>
          {cart.hasIssues && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">Một số sản phẩm không đủ hàng hoặc đã ngừng bán. Vui lòng điều chỉnh trước khi thanh toán.</p>}
          <button type="button" className="btn-primary mt-6 w-full py-3" disabled={cart.hasIssues} onClick={() => navigate(user ? "/checkout" : "/login", { state: { from: "/checkout" } })}>
            {user ? "Tiến hành thanh toán" : "Đăng nhập để thanh toán"}
          </button>
          <Link to="/products" className="mt-3 block text-center text-sm text-muted hover:text-ink">← Tiếp tục mua sắm</Link>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Xóa toàn bộ giỏ hàng?"
        message="Tất cả sản phẩm trong giỏ hàng sẽ bị xóa. Bạn có chắc chắn?"
        confirmText="Xóa tất cả"
        danger
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clear().catch((e) => toast.error(getErrorMessage(e)));
          setConfirmClear(false);
        }}
      />
    </div>
  );
}
