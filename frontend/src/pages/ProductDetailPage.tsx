import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, ShoppingBag, Star, Truck } from "lucide-react";
import clsx from "clsx";
import { productApi } from "../services";
import { getErrorMessage } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Price, Stars } from "../components/ui/Badges";
import { ProductImage } from "../components/ui/ProductImage";
import { QuantityInput } from "../components/ui/QuantityInput";
import { PageLoader } from "../components/ui/Spinner";
import { EmptyState, ErrorState } from "../components/ui/States";
import { Pagination } from "../components/ui/Pagination";
import { ProductGrid } from "../components/product/ProductCard";
import type { Product } from "../types";
import { formatDate } from "../utils/format";

function Reviews({ product }: { product: Product }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const reviews = useAsync(() => productApi.reviews(product.id, page), [product.id, page]);
  const eligibility = useAsync(async () => (user ? productApi.eligibility(product.id) : null), [product.id, user?.id]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await productApi.createReview(product.id, { rating, comment });
      toast.success("Cảm ơn bạn đã đánh giá sản phẩm!");
      setComment("");
      setPage(1);
      await Promise.all([reviews.reload(), eligibility.reload()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const summary = reviews.data?.summary;

  return (
    <section className="mt-16 border-t border-line pt-12" id="reviews">
      <h2 className="font-display text-2xl font-semibold">Đánh giá sản phẩm</h2>
      <div className="mt-6 grid gap-10 lg:grid-cols-[280px_1fr]">
        <div>
          {summary && (
            <div className="rounded-2xl bg-paper p-6">
              <p className="font-display text-5xl font-semibold">{summary.count ? summary.avg.toFixed(1) : "–"}</p>
              <Stars value={summary.avg} size={16} />
              <p className="mt-1 text-sm text-muted">{summary.count} đánh giá</p>
              <div className="mt-4 space-y-1.5">
                {summary.distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-2 text-xs">
                    <span className="w-6">{d.star}★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: summary.count ? `${(d.count / summary.count) * 100}%` : 0 }} />
                    </div>
                    <span className="w-5 text-right text-muted">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 text-sm">
            {!user ? (
              <p className="text-muted"><Link to="/login" className="font-medium text-ink underline">Đăng nhập</Link> để đánh giá sản phẩm bạn đã mua.</p>
            ) : eligibility.data?.hasReviewed ? (
              <p className="flex items-center gap-1.5 text-emerald-700"><Check className="size-4" /> Bạn đã đánh giá sản phẩm này.</p>
            ) : eligibility.data && !eligibility.data.hasPurchased ? (
              <p className="text-muted">Chỉ khách hàng đã mua và nhận hàng thành công mới có thể đánh giá.</p>
            ) : null}
          </div>
        </div>

        <div>
          {eligibility.data?.canReview && (
            <form onSubmit={submit} className="mb-8 rounded-2xl border border-line p-5">
              <p className="text-sm font-semibold">Viết đánh giá của bạn</p>
              <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Chọn số sao">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} sao`} aria-checked={rating === s} role="radio">
                    <Star className={clsx("size-7 transition", s <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300")} />
                  </button>
                ))}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="input mt-3 min-h-24" placeholder="Chia sẻ cảm nhận về chất liệu, kích cỡ, màu sắc..." maxLength={1000} required minLength={5} />
              <button type="submit" className="btn-primary mt-3" disabled={submitting || comment.trim().length < 5}>{submitting ? "Đang gửi..." : "Gửi đánh giá"}</button>
            </form>
          )}

          {reviews.error ? (
            <ErrorState message={reviews.error} onRetry={reviews.reload} />
          ) : reviews.loading && !reviews.data ? (
            <PageLoader label="Đang tải đánh giá..." />
          ) : reviews.data?.items.length === 0 ? (
            <EmptyState title="Chưa có đánh giá nào" description="Hãy là người đầu tiên đánh giá sản phẩm này." icon={<Star className="size-7" />} />
          ) : (
            <>
              <ul className="divide-y divide-line">
                {reviews.data?.items.map((r) => (
                  <li key={r.id} className="py-5 first:pt-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-paper text-sm font-semibold">{r.user.name.charAt(0)}</span>
                      <div>
                        <p className="text-sm font-medium">{r.user.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted"><Stars value={r.rating} size={12} /> {formatDate(r.createdAt, false)}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-700">{r.comment}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-6"><Pagination page={page} totalPages={reviews.data?.meta.totalPages ?? 1} onChange={setPage} /></div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ProductDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { data, loading, error, reload } = useAsync(() => productApi.detail(slug), [slug]);
  const product = data?.product;
  useDocumentTitle(product?.name ?? "Sản phẩm");

  const [color, setColor] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  // Chọn sẵn màu đầu tiên còn hàng khi mở sản phẩm
  useEffect(() => {
    if (!product) return;
    const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
    setColor(firstInStock?.color ?? "");
    setSize(product.sizes.length === 1 ? product.sizes[0] : "");
    setQty(1);
  }, [product]);

  const variant = useMemo(() => product?.variants.find((v) => v.color === color && v.size === size), [product, color, size]);
  const stockOf = (s: string) => product?.variants.find((v) => v.color === color && v.size === s)?.stock ?? 0;

  useEffect(() => {
    if (variant && qty > variant.stock) setQty(Math.max(1, variant.stock));
  }, [variant, qty]);

  if (loading) return <PageLoader />;
  if (error || !product) {
    return (
      <div className="container-page py-16">
        {error?.includes("không tồn tại") || error?.includes("ngừng bán") ? (
          <EmptyState title="Sản phẩm không tồn tại hoặc đã ngừng bán" action={<Link to="/products" className="btn-primary">Xem sản phẩm khác</Link>} />
        ) : (
          <ErrorState message={error ?? "Không tải được sản phẩm"} onRetry={reload} />
        )}
      </div>
    );
  }

  const handleAdd = async (buyNow = false) => {
    if (!variant) {
      toast.error(product.sizes.length > 1 ? "Vui lòng chọn kích cỡ" : "Vui lòng chọn màu sắc");
      return;
    }
    if (variant.stock === 0) {
      toast.error("Phiên bản này đã hết hàng");
      return;
    }
    setAdding(true);
    try {
      await add(variant.id, qty, variant.stock);
      if (buyNow) navigate("/cart");
      else toast.success("Đã thêm vào giỏ hàng", { description: `${product.name} · ${variant.color} / ${variant.size} × ${qty}`, action: { label: "Xem giỏ", onClick: () => navigate("/cart") } });
    } catch (e) {
      toast.error(e instanceof Error && !("isAxiosError" in e) ? e.message : getErrorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="container-page py-8">
      <nav className="mb-6 text-xs text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink">Trang chủ</Link> / <Link to={`/products?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link> / <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-paper lg:sticky lg:top-28 lg:self-start">
          <ProductImage src={product.imageUrl} alt={product.name} className="size-full" />
          {product.discountPercent > 0 && <span className="absolute top-4 left-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">-{product.discountPercent}%</span>}
        </div>

        <div>
          <p className="text-sm text-muted">{product.category.name} · Mã: {product.sku}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{product.name}</h1>
          {product.rating.count > 0 && (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
              <Stars value={product.rating.avg} /> {product.rating.avg.toFixed(1)} ({product.rating.count} đánh giá)
            </a>
          )}
          <div className="mt-5"><Price price={product.price} salePrice={product.salePrice} size="lg" /></div>

          <p className={clsx("mt-3 text-sm font-medium", product.stockLevel === "out" ? "text-red-600" : product.stockLevel === "low" ? "text-amber-700" : "text-emerald-700")}>
            {product.stockLevel === "out" ? "Hết hàng" : product.stockLevel === "low" ? `Sắp hết hàng – còn ${product.totalStock} sản phẩm` : `Còn hàng (${product.totalStock} sản phẩm)`}
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <p className="mb-2.5 text-sm font-medium">Màu sắc: <span className="text-muted">{color}</span></p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => {
                  const available = product.variants.some((v) => v.color === c && v.stock > 0);
                  return (
                    <button key={c} type="button" onClick={() => setColor(c)} className={clsx("rounded-full border px-4 py-2 text-sm transition", color === c ? "border-ink bg-ink text-white" : "border-line hover:border-ink", !available && "opacity-50")}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-sm font-medium">Kích cỡ {size && <span className="text-muted">: {size}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => {
                  const stock = stockOf(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      disabled={stock === 0}
                      title={stock === 0 ? "Hết hàng" : `Còn ${stock}`}
                      className={clsx(
                        "min-w-12 rounded-xl border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:text-neutral-300 disabled:line-through",
                        size === s ? "border-ink bg-ink text-white" : "border-line hover:border-ink",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {variant && <p className="mt-2 text-xs text-muted">Còn {variant.stock} sản phẩm cho phiên bản này</p>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <QuantityInput value={qty} max={Math.max(1, variant?.stock ?? 1)} onChange={setQty} disabled={!variant || variant.stock === 0} />
              <button type="button" className="btn-primary flex-1 py-3" onClick={() => handleAdd(false)} disabled={adding || !product.inStock}>
                <ShoppingBag className="size-4" /> {product.inStock ? (adding ? "Đang thêm..." : "Thêm vào giỏ") : "Hết hàng"}
              </button>
              <button type="button" className="btn-accent py-3 max-sm:w-full" onClick={() => handleAdd(true)} disabled={adding || !product.inStock}>Mua ngay</button>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-paper p-4 text-sm">
              <Truck className="mt-0.5 size-5 shrink-0" />
              <p className="text-neutral-700">Miễn phí vận chuyển cho đơn từ 500.000₫. Thanh toán khi nhận hàng (COD) hoặc thanh toán trực tuyến giả lập.</p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold">Mô tả sản phẩm</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-neutral-700">{product.description}</p>
            </div>
          </div>
        </div>
      </div>

      <Reviews product={product} />

      {data.related.length > 0 && (
        <section className="mt-16 border-t border-line pt-12">
          <h2 className="mb-8 font-display text-2xl font-semibold">Có thể bạn cũng thích</h2>
          <ProductGrid products={data.related} />
        </section>
      )}
    </div>
  );
}
