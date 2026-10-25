import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import clsx from "clsx";
import { adminApi } from "../../services";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader, Panel, Table, td, th } from "../../components/admin/AdminUI";
import { StatusBadge } from "../../components/ui/Badges";
import { Pagination } from "../../components/ui/Pagination";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState, ErrorState } from "../../components/ui/States";
import { formatDate, formatVND, ORDER_STATUS, PAYMENT_STATUS } from "../../utils/format";
import type { OrderStatus } from "../../types";

export default function AdminOrdersPage() {
  useDocumentTitle("Quản lý đơn hàng");
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const debouncedQ = useDebounce(q);
  const status = params.get("status") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const page = Number(params.get("page")) || 1;

  const list = useAsync(() => adminApi.orders({ q: debouncedQ, status, from, to, page, limit: 10 }), [debouncedQ, status, from, to, page]);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Đơn hàng" description={list.data ? `${list.data.meta.total} đơn hàng` : undefined} />
      <Panel bodyClass="">
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setFilter("page", ""); }} className="input pl-9" placeholder="Mã đơn, tên hoặc SĐT người nhận..." aria-label="Tìm đơn hàng" />
          </div>
          <select value={status} onChange={(e) => setFilter("status", e.target.value)} className="input w-auto" aria-label="Lọc trạng thái">
            <option value="">Mọi trạng thái</option>
            {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
          </select>
          <label className="text-xs text-muted">Từ ngày<input type="date" value={from} max={to || undefined} onChange={(e) => setFilter("from", e.target.value)} className="input mt-1 w-auto" /></label>
          <label className="text-xs text-muted">Đến ngày<input type="date" value={to} min={from || undefined} onChange={(e) => setFilter("to", e.target.value)} className="input mt-1 w-auto" /></label>
          {(status || from || to || q) && <button type="button" className="btn-ghost btn-sm" onClick={() => { setQ(""); setParams(new URLSearchParams()); }}>Xóa lọc</button>}
        </div>

        {list.error ? <div className="p-5"><ErrorState message={list.error} onRetry={list.reload} /></div> : list.loading && !list.data ? <PageLoader /> : list.data?.items.length === 0 ? (
          <div className="p-5"><EmptyState title="Không có đơn hàng phù hợp" /></div>
        ) : (
          <div className={clsx(list.loading && "opacity-60")}>
            <Table head={<><th className={th}>Mã đơn</th><th className={th}>Người nhận</th><th className={th}>Ngày đặt</th><th className={th}>Sản phẩm</th><th className={th}>Tổng tiền</th><th className={th}>Thanh toán</th><th className={th}>Trạng thái</th></>}>
              {list.data?.items.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className={td}><Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline">#{o.code}</Link></td>
                  <td className={td}><p>{o.recipientName}</p><p className="text-xs text-muted">{o.phone}</p></td>
                  <td className={clsx(td, "text-muted whitespace-nowrap")}>{formatDate(o.createdAt)}</td>
                  <td className={clsx(td, "text-muted")}>{o._count?.items ?? 0}</td>
                  <td className={clsx(td, "font-medium whitespace-nowrap")}>{formatVND(o.total)}</td>
                  <td className={clsx(td, "text-xs")}><p>{o.paymentMethod === "COD" ? "COD" : "Online (giả lập)"}</p><p className="text-muted">{PAYMENT_STATUS[o.paymentStatus]}</p></td>
                  <td className={td}><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </Table>
            <div className="border-t border-line p-4"><Pagination page={page} totalPages={list.data?.meta.totalPages ?? 1} onChange={(p) => setFilter("page", String(p))} /></div>
          </div>
        )}
      </Panel>
    </>
  );
}
