import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Ban, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import clsx from "clsx";
import { adminApi } from "../../services";
import { getErrorMessage } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader, Panel, Table, td, th } from "../../components/admin/AdminUI";
import { ProductImage } from "../../components/ui/ProductImage";
import { Pagination } from "../../components/ui/Pagination";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState, ErrorState } from "../../components/ui/States";
import { ConfirmDialog } from "../../components/ui/Modal";
import type { Product } from "../../types";
import { formatVND } from "../../utils/format";

type Action = { type: "delete" | "out" | "status"; product: Product } | null;

export default function AdminProductsPage() {
  useDocumentTitle("Quản lý sản phẩm");
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const debouncedQ = useDebounce(q);
  const categoryId = params.get("categoryId") ?? "";
  const status = params.get("status") ?? "";
  const stock = params.get("stock") ?? "";
  const page = Number(params.get("page")) || 1;
  const [action, setAction] = useState<Action>(null);
  const [working, setWorking] = useState(false);

  const categories = useAsync(() => adminApi.categories(), []);
  const list = useAsync(
    () => adminApi.products({ q: debouncedQ, categoryId, status, stock, page, limit: 10 }),
    [debouncedQ, categoryId, status, stock, page],
  );

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next);
  };

  const runAction = async () => {
    if (!action) return;
    setWorking(true);
    try {
      const p = action.product;
      if (action.type === "delete") toast.success((await adminApi.deleteProduct(p.id)).message);
      if (action.type === "out") toast.success((await adminApi.markOutOfStock(p.id)).message);
      if (action.type === "status") toast.success((await adminApi.setProductStatus(p.id, p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")).message);
      setAction(null);
      await list.reload();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setWorking(false);
    }
  };

  const confirmText: Record<"delete" | "out" | "status", { title: string; msg: (p: Product) => string; btn: string; danger: boolean }> = {
    delete: { title: "Xóa sản phẩm?", msg: (p) => `Sản phẩm "${p.name}" cùng các biến thể, đánh giá và sản phẩm trong giỏ hàng của khách sẽ bị xóa vĩnh viễn. Lịch sử đơn hàng cũ vẫn được giữ lại.`, btn: "Xóa sản phẩm", danger: true },
    out: { title: "Đánh dấu hết hàng?", msg: (p) => `Tồn kho của tất cả biến thể của "${p.name}" sẽ được đặt về 0. Khách hàng sẽ không thể đặt mua cho đến khi bạn nhập thêm hàng.`, btn: "Đánh dấu hết hàng", danger: true },
    status: { title: "Đổi trạng thái bán?", msg: (p) => (p.status === "ACTIVE" ? `"${p.name}" sẽ bị ẩn khỏi cửa hàng.` : `"${p.name}" sẽ hiển thị lại trên cửa hàng.`), btn: "Xác nhận", danger: false },
  };

  return (
    <>
      <PageHeader title="Sản phẩm" description={list.data ? `${list.data.meta.total} sản phẩm` : undefined} actions={<Link to="/admin/products/new" className="btn-primary"><Plus className="size-4" /> Thêm sản phẩm</Link>} />

      <Panel bodyClass="">
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setFilter("page", ""); }} className="input pl-9" placeholder="Tìm theo tên hoặc mã sản phẩm..." aria-label="Tìm sản phẩm" />
          </div>
          <select value={categoryId} onChange={(e) => setFilter("categoryId", e.target.value)} className="input w-auto" aria-label="Lọc danh mục">
            <option value="">Tất cả danh mục</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setFilter("status", e.target.value)} className="input w-auto" aria-label="Lọc trạng thái">
            <option value="">Mọi trạng thái</option>
            <option value="ACTIVE">Đang bán</option>
            <option value="INACTIVE">Ngừng bán</option>
          </select>
          <select value={stock} onChange={(e) => setFilter("stock", e.target.value)} className="input w-auto" aria-label="Lọc tồn kho">
            <option value="">Mọi mức tồn kho</option>
            <option value="in">Còn hàng</option>
            <option value="low">Sắp hết hàng</option>
            <option value="out">Hết hàng</option>
          </select>
        </div>

        {list.error ? (
          <div className="p-5"><ErrorState message={list.error} onRetry={list.reload} /></div>
        ) : list.loading && !list.data ? (
          <PageLoader />
        ) : list.data?.items.length === 0 ? (
          <div className="p-5"><EmptyState title="Không có sản phẩm phù hợp" description="Thử đổi bộ lọc hoặc thêm sản phẩm mới." /></div>
        ) : (
          <div className={clsx(list.loading && "opacity-60 transition")}>
            <Table head={<><th className={th}>Sản phẩm</th><th className={th}>Danh mục</th><th className={th}>Giá bán</th><th className={th}>Tồn kho</th><th className={th}>Trạng thái</th><th className={clsx(th, "text-right")}>Thao tác</th></>}>
              {list.data?.items.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <ProductImage src={p.imageUrl} alt={p.name} className="h-14 w-11 shrink-0 rounded-lg bg-paper" />
                      <div className="min-w-0">
                        <Link to={`/admin/products/${p.id}/edit`} className="line-clamp-1 font-medium hover:underline">{p.name}</Link>
                        <p className="text-xs text-muted">{p.sku}{p.isFeatured && " · ★ Nổi bật"}</p>
                      </div>
                    </div>
                  </td>
                  <td className={clsx(td, "text-muted")}>{p.category.name}</td>
                  <td className={td}>
                    <p className="font-medium">{formatVND(p.finalPrice)}</p>
                    {p.salePrice && <p className="text-xs text-muted line-through">{formatVND(p.price)}</p>}
                  </td>
                  <td className={td}>
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", p.stockLevel === "out" ? "bg-red-50 text-red-600" : p.stockLevel === "low" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                      {p.stockLevel === "out" ? "Hết hàng" : `${p.totalStock} sp`}
                    </span>
                    <p className="mt-1 text-xs text-muted">{p.variants.length} biến thể</p>
                  </td>
                  <td className={td}>
                    <button type="button" onClick={() => setAction({ type: "status", product: p })} className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", p.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200")} title="Bấm để đổi trạng thái">
                      {p.status === "ACTIVE" ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      {p.status === "ACTIVE" ? "Đang bán" : "Ngừng bán"}
                    </button>
                  </td>
                  <td className={clsx(td, "text-right whitespace-nowrap")}>
                    <Link to={`/admin/products/${p.id}/edit`} className="inline-grid size-8 place-items-center rounded-lg hover:bg-neutral-100" title="Sửa" aria-label={`Sửa ${p.name}`}><Pencil className="size-4" /></Link>
                    <button type="button" onClick={() => setAction({ type: "out", product: p })} disabled={!p.inStock} className="inline-grid size-8 place-items-center rounded-lg hover:bg-neutral-100 disabled:opacity-30" title="Đánh dấu hết hàng" aria-label={`Đánh dấu hết hàng ${p.name}`}><Ban className="size-4" /></button>
                    <button type="button" onClick={() => setAction({ type: "delete", product: p })} className="inline-grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50" title="Xóa" aria-label={`Xóa ${p.name}`}><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="border-t border-line p-4"><Pagination page={page} totalPages={list.data?.meta.totalPages ?? 1} onChange={(p) => setFilter("page", String(p))} /></div>
          </div>
        )}
      </Panel>

      {action && (
        <ConfirmDialog
          open
          title={confirmText[action.type].title}
          message={confirmText[action.type].msg(action.product)}
          confirmText={confirmText[action.type].btn}
          danger={confirmText[action.type].danger}
          loading={working}
          onConfirm={runAction}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
