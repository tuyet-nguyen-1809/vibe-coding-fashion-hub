import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, Package } from "lucide-react";
import clsx from "clsx";
import { orderApi } from "../services";
import { getErrorMessage } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { StatusBadge } from "../components/ui/Badges";
import { ProductImage } from "../components/ui/ProductImage";
import { Pagination } from "../components/ui/Pagination";
import { PageLoader } from "../components/ui/Spinner";
import { EmptyState, ErrorState } from "../components/ui/States";
import { ConfirmDialog } from "../components/ui/Modal";
import type { OrderStatus } from "../types";
import { formatDate, formatVND, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "../utils/format";

const TABS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "COMPLETED", label: "Đã hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export function OrdersPage() {
  useDocumentTitle("Đơn hàng của tôi");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => orderApi.listMine({ status, page }), [status, page]);

  return (
    <div className="container-page max-w-4xl py-10">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Đơn hàng của tôi</h1>
      <div className="scroll-thin mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button key={t.value} type="button" onClick={() => { setStatus(t.value); setPage(1); }} className={clsx("shrink-0 rounded-full px-4 py-2 text-sm", status === t.value ? "bg-ink text-white" : "bg-paper hover:bg-neutral-200")}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <PageLoader />
        ) : data?.items.length === 0 ? (
          <EmptyState icon={<Package className="size-7" />} title={status ? `Không có đơn hàng "${ORDER_STATUS[status].label}"` : "Bạn chưa có đơn hàng nào"} action={<Link to="/products" className="btn-primary">Mua sắm ngay</Link>} />
        ) : (
          <>
            <ul className="space-y-4">
              {data?.items.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.id}`} className="card block p-5 transition hover:border-ink">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">#{o.code}</p>
                        <p className="text-xs text-muted">{formatDate(o.createdAt)}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex -space-x-3">
                        {o.items.map((it) => <ProductImage key={it.id} src={it.imageUrl} alt={it.productName} className="size-12 rounded-lg bg-paper ring-2 ring-white" />)}
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm text-neutral-600">
                        {o.items.map((it) => it.productName).join(", ")}
                        {(o._count?.items ?? 0) > o.items.length && ` và ${(o._count?.items ?? 0) - o.items.length} sản phẩm khác`}
                      </p>
                      <p className="text-sm font-semibold">{formatVND(o.total)}</p>
                      <ChevronRight className="size-4 text-muted" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8"><Pagination page={page} totalPages={data?.meta.totalPages ?? 1} onChange={setPage} /></div>
          </>
        )}
      </div>
    </div>
  );
}

const STEPS: OrderStatus[] = ["PROCESSING", "SHIPPING", "COMPLETED"];

export function OrderDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const justPlaced = params.get("success") === "1";
  const { data: order, loading, error, reload, setData } = useAsync(() => orderApi.getMine(Number(id)), [id]);
  const [confirm, setConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  useDocumentTitle(order ? `Đơn hàng #${order.code}` : "Chi tiết đơn hàng");

  if (loading) return <PageLoader />;
  if (error || !order) return <div className="container-page py-16"><ErrorState message={error ?? "Không tìm thấy đơn hàng"} onRetry={reload} /></div>;

  const cancel = async () => {
    setCancelling(true);
    try {
      setData(await orderApi.cancel(order.id));
      toast.success("Đã hủy đơn hàng. Sản phẩm đã được hoàn về kho.");
      setConfirm(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCancelling(false);
    }
  };

  const stepIndex = STEPS.indexOf(order.status);

  return (
    <div className="container-page max-w-4xl py-10">
      {justPlaced && (
        <div className="mb-8 flex items-start gap-4 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
          <CheckCircle2 className="size-7 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Đặt hàng thành công!</p>
            <p className="mt-1 text-sm text-emerald-700">
              Cảm ơn bạn đã mua sắm tại Fashion Hub. Mã đơn hàng của bạn là <b>#{order.code}</b>.
              {order.paymentMethod === "MOCK_ONLINE" ? " Thanh toán giả lập đã được ghi nhận." : " Vui lòng chuẩn bị tiền mặt khi nhận hàng."}
            </p>
          </div>
        </div>
      )}

      <Link to="/orders" className="text-sm text-muted hover:text-ink">← Đơn hàng của tôi</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Đơn hàng #{order.code}</h1>
          <p className="mt-1 text-sm text-muted">Đặt lúc {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status === "CANCELLED" ? (
        <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
          Đơn hàng đã bị hủy {order.cancelledAt && `lúc ${formatDate(order.cancelledAt)}`}{order.cancelReason && ` – Lý do: ${order.cancelReason}`}.
        </div>
      ) : (
        <ol className="mt-8 grid grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s} className="relative flex flex-col items-center text-center">
              {i > 0 && <span className={clsx("absolute top-3.5 right-1/2 h-0.5 w-full", i <= stepIndex ? "bg-ink" : "bg-line")} />}
              <span className={clsx("relative grid size-7 place-items-center rounded-full text-xs font-semibold", i <= stepIndex ? "bg-ink text-white" : "bg-line text-muted")}>{i + 1}</span>
              <span className={clsx("mt-2 text-xs sm:text-sm", i <= stepIndex ? "font-medium" : "text-muted")}>{ORDER_STATUS[s].label}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-5 text-sm">
          <h2 className="font-semibold">Thông tin nhận hàng</h2>
          <p className="mt-3">{order.recipientName}</p>
          <p className="text-muted">{order.phone}</p>
          <p className="text-muted">{order.address}</p>
          {order.note && <p className="mt-2 text-muted">Ghi chú: {order.note}</p>}
        </div>
        <div className="card p-5 text-sm">
          <h2 className="font-semibold">Thanh toán</h2>
          <p className="mt-3">{PAYMENT_METHOD[order.paymentMethod]}</p>
          <p className="text-muted">{PAYMENT_STATUS[order.paymentStatus]}</p>
        </div>
      </div>

      <div className="card mt-6 overflow-hidden">
        <ul className="divide-y divide-line">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 p-4">
              <ProductImage src={it.imageUrl} alt={it.productName} className="h-20 w-16 shrink-0 rounded-lg bg-paper" />
              <div className="min-w-0 flex-1">
                {it.productId ? <Link to={`/products/${it.productId}`} className="line-clamp-1 text-sm font-medium hover:underline">{it.productName}</Link> : <p className="line-clamp-1 text-sm font-medium">{it.productName}</p>}
                <p className="text-xs text-muted">{it.color} · Size {it.size} · Mã {it.sku}</p>
                <p className="text-xs text-muted">{formatVND(it.unitPrice)} × {it.quantity}</p>
              </div>
              <p className="text-sm font-semibold">{formatVND(it.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-line bg-paper p-5 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Tạm tính</dt><dd>{formatVND(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Phí vận chuyển</dt><dd>{order.shippingFee ? formatVND(order.shippingFee) : "Miễn phí"}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Tổng cộng</dt><dd>{formatVND(order.total)}</dd></div>
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {order.status === "PROCESSING" && <button type="button" className="btn-outline text-red-600" onClick={() => setConfirm(true)}>Hủy đơn hàng</button>}
        {order.status === "COMPLETED" && order.items[0]?.productId && <Link to={`/products/${order.items[0].productId}#reviews`} className="btn-outline">Đánh giá sản phẩm</Link>}
        <Link to="/products" className="btn-primary">Tiếp tục mua sắm</Link>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Hủy đơn hàng?"
        message={<>Bạn chắc chắn muốn hủy đơn <b>#{order.code}</b>? Chỉ hủy được khi đơn đang xử lý. Thao tác này không thể hoàn tác.</>}
        confirmText="Hủy đơn"
        danger
        loading={cancelling}
        onConfirm={cancel}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}
