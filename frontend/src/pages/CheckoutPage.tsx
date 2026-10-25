import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Banknote, CreditCard, Lock } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { orderApi } from "../services";
import { getErrorMessage, getFieldErrors } from "../services/api";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { Field } from "../components/ui/Field";
import { ProductImage } from "../components/ui/ProductImage";
import { PageLoader } from "../components/ui/Spinner";
import { formatVND, uuid } from "../utils/format";

export default function CheckoutPage() {
  useDocumentTitle("Thanh toán");
  const { user } = useAuth();
  const { cart, loading, refresh } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ recipientName: user?.name ?? "", phone: user?.phone ?? "", address: "", note: "" });
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "MOCK_ONLINE">("COD");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  // Khóa chống gửi lặp: giữ nguyên khi bấm lại/thử lại, chỉ đổi sau khi đặt hàng thành công.
  const idempotencyKey = useRef(uuid());
  const placed = useRef(false);

  if (loading && cart.items.length === 0) return <PageLoader />;
  if (cart.items.length === 0 && !placed.current) return <Navigate to="/cart" replace />;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors(({ [k]: _removed, ...rest }) => rest);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.recipientName.trim().length < 2) e.recipientName = "Vui lòng nhập họ tên người nhận";
    if (!/^(0|\+84)\d{9,10}$/.test(form.phone.trim())) e.phone = "Số điện thoại không hợp lệ (VD: 0912345678)";
    if (form.address.trim().length < 10) e.address = "Vui lòng nhập địa chỉ đầy đủ (số nhà, đường, phường/xã, quận/huyện, tỉnh/thành)";
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Vui lòng kiểm tra lại thông tin giao hàng");
      return;
    }
    setSubmitting(true);
    try {
      const order = await orderApi.create({
        recipientName: form.recipientName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
        paymentMethod,
        idempotencyKey: idempotencyKey.current,
      });
      placed.current = true;
      idempotencyKey.current = uuid();
      await refresh();
      navigate(`/orders/${order.id}?success=1`, { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, "Đặt hàng thất bại, vui lòng thử lại"));
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Thanh toán</h1>
      <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]" noValidate>
        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Thông tin giao hàng</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Họ tên người nhận" error={errors.recipientName} htmlFor="recipientName">
                <input id="recipientName" value={form.recipientName} onChange={set("recipientName")} className="input" autoComplete="name" />
              </Field>
              <Field label="Số điện thoại" error={errors.phone} htmlFor="phone">
                <input id="phone" type="tel" value={form.phone} onChange={set("phone")} className="input" autoComplete="tel" placeholder="0912345678" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Địa chỉ giao hàng" error={errors.address} htmlFor="address">
                  <input id="address" value={form.address} onChange={set("address")} className="input" autoComplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Ghi chú (tùy chọn)" htmlFor="note">
                  <textarea id="note" value={form.note} onChange={set("note")} className="input min-h-20" maxLength={500} placeholder="Ví dụ: giao giờ hành chính" />
                </Field>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">Phương thức thanh toán</h2>
            <div className="mt-5 space-y-3">
              {[
                { value: "COD" as const, icon: Banknote, title: "Thanh toán khi nhận hàng (COD)", desc: "Trả tiền mặt cho nhân viên giao hàng." },
                { value: "MOCK_ONLINE" as const, icon: CreditCard, title: "Thanh toán trực tuyến (giả lập)", desc: "Mô phỏng thanh toán thành công cho bài tập. Không nhập và không lưu thông tin thẻ thật." },
              ].map(({ value, icon: Icon, title, desc }) => (
                <label key={value} className={clsx("flex cursor-pointer gap-4 rounded-xl border p-4 transition", paymentMethod === value ? "border-ink bg-paper" : "border-line hover:border-neutral-400")}>
                  <input type="radio" name="payment" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} className="mt-1 size-4 accent-ink" />
                  <Icon className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-0.5 text-xs text-muted">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-paper p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold">Đơn hàng ({cart.totalQuantity} sản phẩm)</h2>
          <ul className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1 scroll-thin">
            {cart.items.map((i) => (
              <li key={i.variantId} className="flex gap-3">
                <div className="relative shrink-0">
                  <ProductImage src={i.imageUrl} alt={i.name} className="h-20 w-16 rounded-lg bg-white" />
                  <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">{i.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{i.name}</p>
                  <p className="text-xs text-muted">{i.color} · {i.size}</p>
                  {i.issue && <p className="text-xs text-red-600">{i.issue}</p>}
                </div>
                <p className="text-sm font-medium">{formatVND(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Tạm tính</dt><dd>{formatVND(cart.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Phí vận chuyển</dt><dd>{cart.shippingFee ? formatVND(cart.shippingFee) : "Miễn phí"}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Tổng thanh toán</dt><dd>{formatVND(cart.total)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted">Giá và tồn kho được kiểm tra lại tại máy chủ khi đặt hàng.</p>
          <button type="submit" className="btn-primary mt-6 w-full py-3" disabled={submitting || cart.hasIssues}>
            <Lock className="size-4" /> {submitting ? (paymentMethod === "MOCK_ONLINE" ? "Đang xử lý thanh toán..." : "Đang đặt hàng...") : "Xác nhận đặt hàng"}
          </button>
          <Link to="/cart" className="mt-3 block text-center text-sm text-muted hover:text-ink">← Quay lại giỏ hàng</Link>
        </aside>
      </form>
    </div>
  );
}
