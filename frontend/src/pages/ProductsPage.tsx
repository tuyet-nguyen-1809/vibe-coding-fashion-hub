import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { categoryApi, productApi } from "../services";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ProductGrid } from "../components/product/ProductCard";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState, ErrorState } from "../components/ui/States";
import { formatVND } from "../utils/format";

const SORTS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "name_asc", label: "Tên A – Z" },
];

const PRICE_PRESETS = [
  { label: "Dưới 300.000₫", min: undefined, max: 300000 },
  { label: "300.000₫ – 500.000₫", min: 300000, max: 500000 },
  { label: "500.000₫ – 1.000.000₫", min: 500000, max: 1000000 },
  { label: "Trên 1.000.000₫", min: 1000000, max: undefined },
];

const LIMIT = 12;

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const minPrice = params.get("minPrice") ? Number(params.get("minPrice")) : undefined;
  const maxPrice = params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined;
  const onSale = params.get("onSale") === "true";
  const featured = params.get("featured") === "true";

  const [minInput, setMinInput] = useState(minPrice?.toString() ?? "");
  const [maxInput, setMaxInput] = useState(maxPrice?.toString() ?? "");
  useEffect(() => {
    setMinInput(minPrice?.toString() ?? "");
    setMaxInput(maxPrice?.toString() ?? "");
  }, [minPrice, maxPrice]);

  const categories = useAsync(() => categoryApi.list(), []);
  const products = useAsync(
    () => productApi.list({ q, category, sort, page, limit: LIMIT, minPrice, maxPrice, onSale: onSale ? "true" : undefined, featured: featured ? "true" : undefined }),
    [q, category, sort, page, minPrice, maxPrice, onSale, featured],
  );

  const currentCategory = categories.data?.find((c) => c.slug === category);
  const title = q ? `Kết quả cho "${q}"` : currentCategory?.name ?? (onSale ? "Sản phẩm khuyến mãi" : featured ? "Sản phẩm nổi bật" : "Tất cả sản phẩm");
  useDocumentTitle(title);

  /** Cập nhật tham số URL, mặc định quay về trang 1 khi đổi bộ lọc. */
  const update = (patch: Record<string, string | number | undefined | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === null || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage) next.delete("page");
    setParams(next);
  };

  const applyCustomPrice = (e: FormEvent) => {
    e.preventDefault();
    const min = minInput ? Math.max(0, Number(minInput)) : undefined;
    const max = maxInput ? Math.max(0, Number(maxInput)) : undefined;
    if (min != null && max != null && min > max) {
      update({ minPrice: max, maxPrice: min });
      return;
    }
    update({ minPrice: min, maxPrice: max });
    setShowFilters(false);
  };

  const activeChips: { label: string; clear: () => void }[] = [];
  if (q) activeChips.push({ label: `Từ khóa: ${q}`, clear: () => update({ q: undefined }) });
  if (currentCategory) activeChips.push({ label: currentCategory.name, clear: () => update({ category: undefined }) });
  if (minPrice != null || maxPrice != null)
    activeChips.push({
      label: `${minPrice != null ? formatVND(minPrice) : "0₫"} – ${maxPrice != null ? formatVND(maxPrice) : "∞"}`,
      clear: () => update({ minPrice: undefined, maxPrice: undefined }),
    });
  if (onSale) activeChips.push({ label: "Đang giảm giá", clear: () => update({ onSale: undefined }) });
  if (featured) activeChips.push({ label: "Nổi bật", clear: () => update({ featured: undefined }) });

  const filters = (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Danh mục</h3>
        <ul className="space-y-1">
          <li>
            <button type="button" onClick={() => { update({ category: undefined }); setShowFilters(false); }} className={clsx("w-full rounded-lg px-3 py-2 text-left text-sm", !category ? "bg-ink text-white" : "hover:bg-paper")}>
              Tất cả
            </button>
          </li>
          {categories.data?.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => { update({ category: c.slug }); setShowFilters(false); }} className={clsx("flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm", category === c.slug ? "bg-ink text-white" : "hover:bg-paper")}>
                {c.name} <span className={category === c.slug ? "text-white/70" : "text-muted"}>{c.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Khoảng giá</h3>
        <ul className="space-y-1">
          {PRICE_PRESETS.map((p) => {
            const active = p.min === minPrice && p.max === maxPrice;
            return (
              <li key={p.label}>
                <button type="button" onClick={() => { update({ minPrice: active ? undefined : p.min, maxPrice: active ? undefined : p.max }); setShowFilters(false); }} className={clsx("w-full rounded-lg px-3 py-2 text-left text-sm", active ? "bg-ink text-white" : "hover:bg-paper")}>
                  {p.label}
                </button>
              </li>
            );
          })}
        </ul>
        <form onSubmit={applyCustomPrice} className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input type="number" min={0} step={10000} value={minInput} onChange={(e) => setMinInput(e.target.value)} className="input px-3 py-2" placeholder="Từ" aria-label="Giá từ" />
            <span className="text-muted">–</span>
            <input type="number" min={0} step={10000} value={maxInput} onChange={(e) => setMaxInput(e.target.value)} className="input px-3 py-2" placeholder="Đến" aria-label="Giá đến" />
          </div>
          <button type="submit" className="btn-outline btn-sm w-full">Áp dụng</button>
        </form>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={onSale} onChange={(e) => update({ onSale: e.target.checked ? "true" : undefined })} className="size-4 accent-ink" />
        Chỉ hiện sản phẩm giảm giá
      </label>
    </div>
  );

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <p className="text-xs text-muted">Trang chủ / Sản phẩm</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        {currentCategory?.description && <p className="mt-2 text-sm text-muted">{currentCategory.description}</p>}
      </div>

      <div className="flex gap-10">
        <aside className="hidden w-60 shrink-0 lg:block">{filters}</aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <button type="button" className="btn-outline btn-sm lg:hidden" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal className="size-4" /> Bộ lọc
              </button>
              <p className="text-sm text-muted">{products.data ? `${products.data.meta.total} sản phẩm` : "Đang tải..."}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">Sắp xếp:</span>
              <select value={sort} onChange={(e) => update({ sort: e.target.value === "newest" ? undefined : e.target.value })} className="input w-auto py-2 pr-8" aria-label="Sắp xếp">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>

          {activeChips.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {activeChips.map((c) => (
                <button key={c.label} type="button" onClick={c.clear} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs hover:bg-neutral-200">
                  {c.label} <X className="size-3" />
                </button>
              ))}
              <button type="button" onClick={() => setParams(new URLSearchParams())} className="text-xs text-muted underline hover:text-ink">Xóa tất cả</button>
            </div>
          )}

          {products.error ? (
            <ErrorState message={products.error} onRetry={products.reload} />
          ) : !products.loading && products.data?.items.length === 0 ? (
            <EmptyState
              title="Không tìm thấy sản phẩm phù hợp"
              description="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc."
              action={<button type="button" className="btn-primary" onClick={() => setParams(new URLSearchParams())}>Xem tất cả sản phẩm</button>}
            />
          ) : (
            <>
              <ProductGrid products={products.data?.items ?? []} loading={products.loading} skeletonCount={LIMIT} />
              <div className="mt-12">
                <Pagination page={page} totalPages={products.data?.meta.totalPages ?? 1} onChange={(p) => { update({ page: p }, false); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              </div>
            </>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[88%] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-semibold">Bộ lọc</h2>
              <button type="button" onClick={() => setShowFilters(false)} className="rounded-full p-1.5 hover:bg-neutral-100" aria-label="Đóng bộ lọc"><X className="size-5" /></button>
            </div>
            <div className="overflow-y-auto p-5">{filters}</div>
          </div>
        </div>
      )}
    </div>
  );
}
