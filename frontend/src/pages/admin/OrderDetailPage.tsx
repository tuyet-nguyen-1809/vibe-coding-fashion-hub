import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import { adminApi } from "../../services";
import { getErrorMessage } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader, Panel } from "../../components/admin/AdminUI";
import { StatusBadge } from "../../components/ui/Badges";
import { ProductImage } from "../../components/ui/ProductImage";
import { PageLoader } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import type { OrderStatus } from "../../types";
import { formatDate, formatVND, NEXT_STATUSES, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "../../utils/format";

const ACTION_LABEL: Record<OrderStatus, string> = {
  PROCESSING: "Xử lý",
  SHIPPING: "Bắt đầu giao hàng",
  COMPLETED: "Xác nhận đã giao thành công",
  CANCELLED: "Hủy đơn hàng",
};

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const { data: order, loading, error, reload, setData } = useAsync(() => adminApi.order(Number(id)), [id]);
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useDocumentTitle(order ? `Đơn #${order.code}` : "Chi tiết đơn hàng");

  if (loading) return <PageLoader />;
  if (error || !order) return <ErrorState message={error ?? "Không tìm thấy đơn hàng"} onRetry={reload} />;

  const next = NEXT_STATUSES[order.status];

  const apply = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const res = await adminApi.updateOrderStatus(order.id, target, reason.trim() || undefined);
      setData(res.data);
      toast.success(res.message ?? "Đã cập nhật trạng thái");
      setTarget(null);
      setReason("");
    } catch (e) {
      toast.error(getErrorMessage(e));
      await reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Link to="/admin/orders" className="text-sm text-muted hover:text-ink">← Danh sách đơn hàng</Link>
      <PageHeader title={`Đơn hàng #${order.code}`} description={`Đặt lúc ${formatDate(order.createdAt)} · Cập nhật ${formatDate(order.updatedAt)}`} actions={<StatusBadge status={order.status} />} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={`Sản phẩm (${order.items.length})`} bodyClass="">
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-4">
                  <ProductImage src={it.imageUrl} alt={it.productName} className="h-16 w-12 shrink-0 rounded-lg bg-paper" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{it.productName}</p>
                    <p className="text-xs text-muted">{it.sku} · {it.color} / {it.size}{!it.productId && " · (sản phẩm đã bị xóa)"}</p>
                  </div>
                  <p className="text-sm text-muted whitespace-nowrap">{formatVND(it.unitPrice)} × {it.quantity}</p>
                  <p className="w-28 text-right text-sm font-semibold">{formatVND(it.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-line bg-neutral-50/60 px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Tạm tính</dt><dd>{formatVND(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Phí vận chuyển</dt><dd>{order.shippingFee ? formatVND(order.shippingFee) : "Miễn phí"}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Tổng cộng</dt><dd>{formatVND(order.total)}</dd></div>
            </dl>
            <p className="px-5 pb-4 text-xs text-muted">Giá được lưu tại thời điểm đặt hàng, không thay đổi khi giá sản phẩm thay đổi.</p>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Cập nhật trạng thái">
            {next.length === 0 ? (
              <p className="text-sm text-muted">Đơn hàng ở trạng thái cuối “{ORDER_STATUS[order.status].label}”, không thể thay đổi thêm.</p>
            ) : (
              <div className="space-y-2">
                {next.map((s) => (
                  <button key={s} type="button" onClick={() => setTarget(s)} className={clsx("flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition", s === "CANCELLED" ? "border border-red-200 text-red-600 hover:bg-red-50" : "bg-ink text-white hover:bg-neutral-800")}>
                    {ACTION_LABEL[s]} <ArrowRight className="size-4" />
                  </button>
                ))}
                <p className="pt-1 text-xs text-muted">Quy tắc: Đang xử lý → Đang giao → Đã hoàn thành. Có thể hủy khi chưa hoàn thành; hủy đơn sẽ hoàn lại tồn kho.</p>
              </div>
            )}
            {order.status === "CANCELLED" && order.cancelReason && <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-muted">Lý do hủy: {order.cancelReason}</p>}
          </Panel>

          <Panel title="Người nhận">
            <div className="space-y-1 text-sm">
              <p className="font-medium">{order.recipientName}</p>
              <p className="text-muted">{order.phone}</p>
              <p className="text-muted">{order.address}</p>
              {order.note && <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-amber-800">Ghi chú: {order.note}</p>}
            </div>
            {order.user && (
              <div className="mt-4 border-t border-line pt-4 text-sm">
                <p className="text-xs text-muted">Tài khoản đặt hàng</p>
                <Link to={`/admin/customers/${order.user.id}`} className="font-medium hover:underline">{order.user.name}</Link>
                <p className="text-muted">{order.user.email}</p>
              </div>
            )}
          </Panel>

          <Panel title="Thanh toán">
            <p className="text-sm">{PAYMENT_METHOD[order.paymentMethod]}</p>
            <p className="text-sm text-muted">{PAYMENT_STATUS[order.paymentStatus]}</p>
            {order.completedAt && <p className="mt-2 text-xs text-muted">Hoàn thành: {formatDate(order.completedAt)}</p>}
            {order.cancelledAt && <p className="mt-2 text-xs text-muted">Hủy lúc: {formatDate(order.cancelledAt)}</p>}
          </Panel>
        </div>
      </div>

      <Modal
        open={target !== null}
        onClose={() => !saving && setTarget(null)}
        title="Xác nhận cập nhật trạng thái"
        size="sm"
        footer={<><button type="button" className="btn-outline" onClick={() => setTarget(null)} disabled={saving}>Hủy bỏ</button><button type="button" className={target === "CANCELLED" ? "btn-danger" : "btn-primary"} onClick={apply} disabled={saving}>{saving ? "Đang cập nhật..." : "Xác nhận"}</button></>}
      >
        {target && (
          <div className="space-y-3 text-sm">
            <p>Chuyển đơn <b>#{order.code}</b> từ <b>{ORDER_STATUS[order.status].label}</b> sang <b>{ORDER_STATUS[target].label}</b>?</p>
            {target === "CANCELLED" && (
              <>
                <p className="text-muted">Tồn kho của các sản phẩm trong đơn sẽ được hoàn lại.</p>
                <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do hủy (tùy chọn)" maxLength={300} />
              </>
            )}
            {target === "COMPLETED" && <p className="text-muted">Đơn sẽ được tính vào doanh thu thực tế và ghi nhận đã thanh toán.</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
