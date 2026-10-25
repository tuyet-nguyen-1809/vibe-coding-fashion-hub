import { Link, useParams } from "react-router-dom";
import clsx from "clsx";
import { adminApi } from "../../services";
import { useAsync } from "../../hooks/useAsync";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader, Panel, Table, td, th } from "../../components/admin/AdminUI";
import { StatusBadge } from "../../components/ui/Badges";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState, ErrorState } from "../../components/ui/States";
import { formatDate, formatVND } from "../../utils/format";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { data: user, loading, error, reload } = useAsync(() => adminApi.user(Number(id)), [id]);
  useDocumentTitle(user?.name ?? "Khách hàng");

  if (loading) return <PageLoader />;
  if (error || !user) return <ErrorState message={error ?? "Không tìm thấy khách hàng"} onRetry={reload} />;

  return (
    <>
      <Link to="/admin/customers" className="text-sm text-muted hover:text-ink">← Danh sách khách hàng</Link>
      <PageHeader title={user.name} description={user.email} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Thông tin cơ bản">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-muted">Email</dt><dd>{user.email}</dd></div>
            <div><dt className="text-xs text-muted">Số điện thoại</dt><dd>{user.phone ?? "Chưa cập nhật"}</dd></div>
            <div><dt className="text-xs text-muted">Ngày tham gia</dt><dd>{formatDate(user.createdAt)}</dd></div>
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
              <div><dt className="text-xs text-muted">Tổng đơn</dt><dd className="text-lg font-semibold">{user.orderCount}</dd></div>
              <div><dt className="text-xs text-muted">Đã chi tiêu</dt><dd className="text-lg font-semibold">{formatVND(user.totalSpent)}</dd></div>
            </div>
            <p className="text-xs text-muted">“Đã chi tiêu” chỉ tính các đơn đã hoàn thành.</p>
          </dl>
        </Panel>
        <Panel className="xl:col-span-2" title="Lịch sử đơn hàng" bodyClass="">
          {user.orders.length === 0 ? <div className="p-5"><EmptyState title="Khách hàng chưa có đơn hàng" /></div> : (
            <Table head={<><th className={th}>Mã đơn</th><th className={th}>Ngày đặt</th><th className={th}>Số SP</th><th className={th}>Tổng tiền</th><th className={th}>Trạng thái</th></>}>
              {user.orders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className={td}><Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline">#{o.code}</Link></td>
                  <td className={clsx(td, "text-muted")}>{formatDate(o.createdAt)}</td>
                  <td className={td}>{o._count.items}</td>
                  <td className={clsx(td, "font-medium")}>{formatVND(o.total)}</td>
                  <td className={td}><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
