import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import clsx from "clsx";
import { adminApi } from "../../services";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader, Panel, Table, td, th } from "../../components/admin/AdminUI";
import { Pagination } from "../../components/ui/Pagination";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState, ErrorState } from "../../components/ui/States";
import { formatDate, formatVND } from "../../utils/format";

export default function CustomersPage() {
  useDocumentTitle("Quản lý khách hàng");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q);
  const list = useAsync(() => adminApi.users({ q: debouncedQ, page, limit: 10 }), [debouncedQ, page]);

  return (
    <>
      <PageHeader title="Khách hàng" description={list.data ? `${list.data.meta.total} khách hàng` : undefined} />
      <Panel bodyClass="">
        <div className="border-b border-line p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="input pl-9" placeholder="Tìm theo tên, email, số điện thoại..." aria-label="Tìm khách hàng" />
          </div>
        </div>
        {list.error ? <div className="p-5"><ErrorState message={list.error} onRetry={list.reload} /></div> : list.loading && !list.data ? <PageLoader /> : list.data?.items.length === 0 ? (
          <div className="p-5"><EmptyState title="Không tìm thấy khách hàng" /></div>
        ) : (
          <div className={clsx(list.loading && "opacity-60")}>
            <Table head={<><th className={th}>Khách hàng</th><th className={th}>Điện thoại</th><th className={th}>Ngày tham gia</th><th className={th}>Số đơn</th><th className={th}>Đã chi tiêu</th></>}>
              {list.data?.items.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50">
                  <td className={td}>
                    <Link to={`/admin/customers/${u.id}`} className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-paper text-sm font-semibold">{u.name.charAt(0)}</span>
                      <span><span className="block font-medium hover:underline">{u.name}</span><span className="text-xs text-muted">{u.email}</span></span>
                    </Link>
                  </td>
                  <td className={clsx(td, "text-muted")}>{u.phone ?? "—"}</td>
                  <td className={clsx(td, "text-muted")}>{formatDate(u.createdAt, false)}</td>
                  <td className={td}>{u.orderCount}</td>
                  <td className={clsx(td, "font-medium")}>{formatVND(u.totalSpent)}</td>
                </tr>
              ))}
            </Table>
            <div className="border-t border-line p-4"><Pagination page={page} totalPages={list.data?.meta.totalPages ?? 1} onChange={setPage} /></div>
          </div>
        )}
      </Panel>
    </>
  );
}
