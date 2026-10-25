import { Link } from "react-router-dom";
import { ArrowRight, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { categoryApi, productApi } from "../services";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ProductGrid } from "../components/product/ProductCard";
import { ProductImage } from "../components/ui/ProductImage";
import { ErrorState } from "../components/ui/States";

const HERO = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80";
const BRAND = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";

function SectionHeader({ eyebrow, title, to }: { eyebrow: string; title: string; to: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
      </div>
      <Link to={to} className="hidden shrink-0 items-center gap-1.5 text-sm font-medium hover:underline sm:flex">
        Xem tất cả <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

export default function HomePage() {
  useDocumentTitle("");
  const categories = useAsync(() => categoryApi.list(), []);
  const featured = useAsync(() => productApi.list({ featured: "true", limit: 8 }), []);
  const newest = useAsync(() => productApi.list({ sort: "newest", limit: 8 }), []);
  const sale = useAsync(() => productApi.list({ onSale: "true", limit: 4, sort: "price_asc" }), []);

  return (
    <>
      {/* Banner */}
      <section className="relative overflow-hidden bg-paper">
        <div className="container-page grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-20">
          <div className="relative z-10 max-w-xl">
            <p className="eyebrow">Bộ sưu tập Thu – Đông 2026</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.1] font-semibold sm:text-5xl lg:text-6xl">
              Tối giản để <em className="text-accent not-italic">tỏa sáng</em> theo cách của bạn
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-neutral-600">
              Những thiết kế vượt thời gian, chất liệu bền đẹp và dễ phối. Ưu đãi đến 30% cho bộ sưu tập mới.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn-primary px-7 py-3">Mua sắm ngay <ArrowRight className="size-4" /></Link>
              <Link to="/products?onSale=true" className="btn-outline px-7 py-3">Xem khuyến mãi</Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl lg:aspect-[5/4]">
            <ProductImage src={HERO} alt="Bộ sưu tập thời trang Fashion Hub" className="size-full" />
            <div className="absolute bottom-4 left-4 rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs text-muted">Miễn phí giao hàng</p>
              <p className="text-sm font-semibold">Đơn từ 500.000₫</p>
            </div>
          </div>
        </div>
      </section>

      {/* Lợi ích */}
      <section className="border-b border-line">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-3">
          {[
            { icon: Truck, title: "Giao hàng toàn quốc", text: "Miễn phí cho đơn từ 500.000₫" },
            { icon: RefreshCcw, title: "Đổi trả 7 ngày", text: "Đổi size, đổi mẫu dễ dàng" },
            { icon: ShieldCheck, title: "Thanh toán an toàn", text: "COD hoặc trực tuyến (giả lập)" },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-paper"><Icon className="size-5" /></div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Danh mục */}
      <section className="container-page py-16">
        <SectionHeader eyebrow="Danh mục" title="Mua sắm theo danh mục" to="/products" />
        {categories.error ? (
          <ErrorState message={categories.error} onRetry={categories.reload} />
        ) : (
          <div className="scroll-thin -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-7">
            {(categories.data ?? Array.from({ length: 7 }, () => null)).map((c, i) =>
              c ? (
                <Link key={c.id} to={`/products?category=${c.slug}`} className="group w-36 shrink-0 snap-start sm:w-auto">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-paper">
                    <ProductImage src={c.imageUrl ?? ""} alt={c.name} className="size-full transition duration-500 group-hover:scale-105" />
                  </div>
                  <p className="mt-2.5 text-center text-sm font-medium">{c.name}</p>
                  <p className="text-center text-xs text-muted">{c.productCount} sản phẩm</p>
                </Link>
              ) : (
                <div key={i} className="w-36 shrink-0 animate-pulse sm:w-auto"><div className="aspect-square rounded-2xl bg-neutral-100" /></div>
              ),
            )}
          </div>
        )}
      </section>

      {/* Nổi bật */}
      <section className="container-page pb-16">
        <SectionHeader eyebrow="Được yêu thích" title="Sản phẩm nổi bật" to="/products?featured=true" />
        {featured.error ? <ErrorState message={featured.error} onRetry={featured.reload} /> : <ProductGrid products={featured.data?.items ?? []} loading={featured.loading} />}
      </section>

      {/* Khuyến mãi */}
      {(sale.loading || (sale.data?.items.length ?? 0) > 0) && (
        <section className="bg-paper py-16">
          <div className="container-page">
            <SectionHeader eyebrow="Ưu đãi" title="Đang giảm giá" to="/products?onSale=true" />
            <ProductGrid products={sale.data?.items ?? []} loading={sale.loading} skeletonCount={4} />
          </div>
        </section>
      )}

      {/* Mới */}
      <section className="container-page py-16">
        <SectionHeader eyebrow="Vừa cập bến" title="Sản phẩm mới" to="/products?sort=newest" />
        {newest.error ? <ErrorState message={newest.error} onRetry={newest.reload} /> : <ProductGrid products={newest.data?.items ?? []} loading={newest.loading} />}
      </section>

      {/* Giới thiệu thương hiệu */}
      <section className="container-page">
        <div className="grid overflow-hidden rounded-3xl bg-ink text-white lg:grid-cols-2">
          <div className="aspect-[4/3] lg:aspect-auto">
            <ProductImage src={BRAND} alt="Cửa hàng Fashion Hub" className="size-full" />
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <p className="text-xs font-semibold tracking-[0.18em] text-orange-300 uppercase">Về Fashion Hub</p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Mặc đẹp mỗi ngày, không cần cầu kỳ</h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-300">
              Fashion Hub ra đời với mong muốn mang đến tủ đồ cơ bản chất lượng cao với giá hợp lý. Chúng tôi chọn lọc chất liệu
              thân thiện, đường may tỉ mỉ và thiết kế tối giản để bạn dễ dàng phối đồ cho mọi dịp – từ công sở, dạo phố đến những buổi tiệc.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {[["Chất liệu", "Chọn lọc kỹ"], ["Thiết kế", "Tối giản"], ["Đổi trả", "Trong 7 ngày"]].map(([n, l]) => (
                <div key={n}>
                  <p className="font-display text-xl font-semibold">{n}</p>
                  <p className="text-xs text-neutral-400">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
