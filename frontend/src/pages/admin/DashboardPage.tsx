import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, DollarSign, Info, Package, ShoppingCart, Users } from "lucide-react";
import clsx from "clsx";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi } from "../../services";
import { useAsync } from "../../hooks/useAsync";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader, Panel, Table, td, th } from "../../components/admin/AdminUI";
import { StatusBadge } from "../../components/ui/Badges";
import { ProductImage } from "../../components/ui/ProductImage";
import { PageLoader } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/States";
import { formatDate, formatVND, ORDER_STATUS } from "../../utils/format";

const STATUS_COLORS: Record<string, string> = { PROCESSING: "#f59e0b", SHIPPING: "#0ea5e9", COMPLETED: "#10b981", CANCELLED: "#a3a3a3" };
const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}tr` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);

function StatCard({ label, value, sub, icon: Icon, tone = "neutral", to }: { label: string; value: string; sub?: string; icon: typeof DollarSign; tone?: "neutral" | "accent" | "warn"; to?: string }) {
  const body = (
    <div className="flex h-full items-start justify-between gap-3 rounded-2xl border border-line bg-white p-5 transition hover:border-neutral-300">
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      </div>
      <div className={clsx("grid size-10 shrink-0 place-items-center rounded-xl", tone === "accent" ? "bg-orange-50 text-accent" : tone === "warn" ? "bg-amber-50 text-amber-600" : "bg-neutral-100 text-ink")}>
        <Icon className="size-5" />
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function DashboardPage() {
  useDocumentTitle("Tổng quan");
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAsync(() => adminApi.dashboard(days), [days]);

  if (loading && !data) return <PageLoader label="Đang tải thống kê..." />;
  if (error || !data) return <ErrorState message={error ?? "Không tải được thống kê"} onRetry={reload} />;
  const { stats } = data;
  const chartData = data.revenueSeries.map((d) => ({ ...d, label: d.date.slice(8, 10) + "/" + d.date.slice(5, 7) }));

  return (
    <>
      <PageHeader title="Tổng quan" description="Số liệu được tính trực tiếp từ cơ sở dữ liệu." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng doanh thu" value={formatVND(stats.totalRevenue)} sub={`${stats.completedOrders} đơn hoàn thành`} icon={DollarSign} tone="accent" />
        <StatCard label="Tổng đơn hàng" value={stats.totalOrders.toLocaleString("vi-VN")} sub={`Chờ ghi nhận: ${formatVND(stats.pendingRevenue)}`} icon={ShoppingCart} to="/admin/orders" />
        <StatCard label="Khách hàng" value={stats.totalCustomers.toLocaleString("vi-VN")} sub="Tài khoản khách hàng" icon={Users} to="/admin/customers" />
        <StatCard label="Sản phẩm" value={stats.totalProducts.toLocaleString("vi-VN")} sub={`${stats.outOfStockProducts} sản phẩm hết hàng`} icon={Package} to="/admin/products" />
        <StatCard label="Đơn đang xử lý" value={stats.processingOrders.toLocaleString("vi-VN")} sub="Cần xác nhận & giao hàng" icon={Clock} tone="warn" to="/admin/orders?status=PROCESSING" />
        <StatCard label="Sắp hết hàng" value={stats.lowStockProducts.toLocaleString("vi-VN")} sub={`Tồn kho ≤ ${data.lowStockThreshold}`} icon={AlertTriangle} tone="warn" to="/admin/products?stock=low" />
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line bg-white/50 p-5 text-xs leading-relaxed text-muted sm:col-span-2">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p><b className="text-ink">Cách tính doanh thu:</b> {data.revenueRule} Doanh thu được ghi nhận vào ngày đơn chuyển sang “Đã hoàn thành”. “Chờ ghi nhận” là tổng giá trị đơn Đang xử lý + Đang giao.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title={`Doanh thu ${days} ngày qua · ${formatVND(stats.revenueInRange)}`}
          action={
            <div className="flex rounded-full bg-neutral-100 p-0.5 text-xs">
              {[7, 30, 90].map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)} className={clsx("rounded-full px-3 py-1", days === d ? "bg-white font-medium shadow-sm" : "text-muted")}>{d} ngày</button>
              ))}
            </div>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c2410c" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#c2410c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" minTickGap={18} />
                <YAxis tickFormatter={compact} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(v) => [formatVND(Number(v)), "Doanh thu"]} labelFormatter={(l) => `Ngày ${l}`} contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e2", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#c2410c" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Trạng thái đơn hàng">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.statusBreakdown.map((s) => ({ ...s, label: ORDER_STATUS[s.status].label }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={104} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v) => [`${v} đơn`, "Số đơn"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "#f5f5f5" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                  {data.statusBreakdown.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {data.statusBreakdown.map((s) => (
              <li key={s.status} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[s.status] }} /> {ORDER_STATUS[s.status].label}</span>
                <span className="text-muted">{s.count} đơn · {formatVND(s.total)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Đơn hàng mới nhất" action={<Link to="/admin/orders" className="text-xs font-medium hover:underline">Xem tất cả</Link>} bodyClass="">
          <Table head={<><th className={th}>Mã đơn</th><th className={th}>Khách hàng</th><th className={th}>Ngày đặt</th><th className={th}>Tổng tiền</th><th className={th}>Trạng thái</th></>}>
            {data.latestOrders.map((o) => (
              <tr key={o.id} className="hover:bg-neutral-50">
                <td className={td}><Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline">#{o.code}</Link></td>
                <td className={td}>{o.recipientName}</td>
                <td className={clsx(td, "text-muted")}>{formatDate(o.createdAt)}</td>
                <td className={clsx(td, "font-medium")}>{formatVND(o.total)}</td>
                <td className={td}><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </Table>
        </Panel>

        <div className="space-y-6">
          <Panel title="Bán chạy nhất">
            {data.topProducts.length === 0 ? <p className="text-sm text-muted">Chưa có dữ liệu bán hàng.</p> : (
              <ol className="space-y-3">
                {data.topProducts.map((p, i) => (
                  <li key={`${p.productId}-${p.name}`} className="flex items-center gap-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-semibold">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 text-xs text-muted">{p.quantity} sp</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <Panel title="Cần nhập thêm hàng" action={<Link to="/admin/products?stock=low" className="text-xs font-medium hover:underline">Xem</Link>}>
            {data.lowStockList.length === 0 ? <p className="text-sm text-muted">Tồn kho đang ổn định.</p> : (
              <ul className="space-y-3">
                {data.lowStockList.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <ProductImage src={p.imageUrl} alt={p.name} className="size-10 shrink-0 rounded-lg bg-paper" />
                    <Link to={`/admin/products/${p.id}/edit`} className="min-w-0 flex-1 truncate text-sm hover:underline">{p.name}</Link>
                    <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", p.totalStock === 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700")}>
                      {p.totalStock === 0 ? "Hết hàng" : `Còn ${p.totalStock}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
