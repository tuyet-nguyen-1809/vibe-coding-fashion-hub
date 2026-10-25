import { Link } from "react-router-dom";
import clsx from "clsx";
import type { Product } from "../../types";
import { Price, Stars } from "../ui/Badges";
import { ProductImage } from "../ui/ProductImage";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-paper">
        <ProductImage src={product.imageUrl} alt={product.name} className={clsx("size-full transition duration-700 group-hover:scale-105", !product.inStock && "grayscale")} />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.discountPercent > 0 && <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-white">-{product.discountPercent}%</span>}
          {!product.inStock && <span className="rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-white">Hết hàng</span>}
          {product.inStock && product.stockLevel === "low" && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-amber-700">Sắp hết</span>}
        </div>
        <span className="absolute inset-x-3 bottom-3 translate-y-2 rounded-full bg-white/95 py-2 text-center text-xs font-medium opacity-0 shadow-sm transition group-hover:translate-y-0 group-hover:opacity-100">
          Xem chi tiết
        </span>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-xs text-muted">{product.category.name}</p>
        <h3 className="line-clamp-1 text-sm font-medium group-hover:underline">{product.name}</h3>
        <Price price={product.price} salePrice={product.salePrice} size="sm" />
        {product.rating.count > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Stars value={product.rating.avg} size={12} /> ({product.rating.count})
          </div>
        )}
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] rounded-2xl bg-neutral-100" />
      <div className="mt-3 h-3 w-1/3 rounded bg-neutral-100" />
      <div className="mt-2 h-4 w-3/4 rounded bg-neutral-100" />
      <div className="mt-2 h-4 w-1/2 rounded bg-neutral-100" />
    </div>
  );
}

export function ProductGrid({ products, loading, skeletonCount = 8 }: { products: Product[]; loading?: boolean; skeletonCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {loading ? Array.from({ length: skeletonCount }, (_, i) => <ProductCardSkeleton key={i} />) : products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
